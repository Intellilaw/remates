import { mutateDb } from "../../data/store.js";
import { config } from "../../config.js";
import { STAFF_ACCESS_ROLES, getFullProperty, logAudit, requireRoles } from "../../domain/app-domain.js";
import { computeLegalBid, extractRemateFromImage } from "../../services/remate-extraction-service.js";
import { resolveLocationImage } from "../../services/property-location-image-service.js";
import { badRequest, readJsonBody, sendJson } from "../../utils/http.js";
import { nextPropertyDisplayId } from "../../utils/property-display-id.js";
import { randomId, sanitizeText } from "../../utils/security.js";

const REMATE_CAPTURE_ROLES = STAFF_ACCESS_ROLES;

export async function handleMobileRemateRoutes(req, res, pathname, { db, actor }) {
  if (pathname === "/api/mobile/remates/extract" && req.method === "POST") {
    if (!requireRoles(res, actor, REMATE_CAPTURE_ROLES)) {
      return;
    }

    try {
      const body = await readJsonBody(req, 9 * 1024 * 1024);
      const extraction = await extractRemateFromImage({
        imageDataUrl: body.imageDataUrl,
        textHint: body.textHint || ""
      });
      const item = buildDraftFromExtraction(extraction, db);
      return sendJson(res, 200, { item, extraction });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  if (pathname === "/api/mobile/remates/publish" && req.method === "POST") {
    if (!requireRoles(res, actor, REMATE_CAPTURE_ROLES)) {
      return;
    }

    try {
      const body = await readJsonBody(req, 2 * 1024 * 1024);
      const input = body.item || body;
      const updated = await mutateDb(async (draft) => {
        const property = buildPropertyFromInput(input, draft);
        property.locationImage = await resolveLocationImage(property);
        draft.properties.unshift(property);
        logAudit(draft, actor, "MOBILE_REMATE_PUBLISHED", "property", property.id, property);
        return draft;
      });
      const item = updated.properties[0];
      return sendJson(res, 201, { item: getFullProperty(item), publicUrl: `${config.publicWebUrl}/property/${item.slug}` });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  return false;
}

function buildDraftFromExtraction(extraction, db) {
  const estimatedValueMxn = Number(extraction.estimatedValueMxn || 0);
  const legalBidMxn = Number(extraction.legalBidMxn || (estimatedValueMxn ? computeLegalBid(estimatedValueMxn) : 0));
  const title = extraction.title || titleFromAddress(extraction.fullAddress, extraction.city, extraction.zoneLabel);
  const shortDescription = extraction.shortDescription || descriptionFromValues(estimatedValueMxn, legalBidMxn);

  return {
    title,
    slug: uniqueSlug(slugify(title), db.properties),
    state: normalizeStateName(extraction.state),
    city: extraction.city || "",
    zoneLabel: extraction.zoneLabel || "",
    estimatedValueMxn,
    legalBidMxn,
    legalBidWasComputed: Boolean(extraction.legalBidWasComputed),
    discountPct: computeDiscountPct(estimatedValueMxn, legalBidMxn),
    auctionRound: "PRIMERA",
    shortDescription,
    fullAddress: extraction.fullAddress || "",
    auctionDate: extraction.auctionDate || "",
    auctionTime: extraction.auctionTime || "",
    courtName: extraction.courtName || "",
    occupancyStatus: "",
    legalSummary: "Datos extraidos desde edicto fotografiado y confirmados antes de publicar.",
    riskNotes: "Revisar expediente, adeudos y estatus de posesión antes de recomendar participación.",
    publicStatus: "PUBLISHED",
    featured: true,
    tags: ["Remate"],
    heroTone: "cobalt",
    imageAccent: "#2563eb",
    locationImage: null
  };
}

function buildPropertyFromInput(input, db) {
  const estimatedValueMxn = Number(input.estimatedValueMxn || 0);
  let legalBidMxn = Number(input.legalBidMxn || 0);
  if (!legalBidMxn && estimatedValueMxn) {
    legalBidMxn = computeLegalBid(estimatedValueMxn);
  }

  const title = requiredText(input.title, "Título", 120);
  const fullAddress = requiredText(input.fullAddress, "Dirección del inmueble", 240);
  const courtName = requiredText(input.courtName, "Juzgado del remate", 180);
  const auctionDate = sanitizeText(input.auctionDate || "", 20);
  const state = requiredText(normalizeStateName(input.state), "Estado", 80);
  const city = requiredText(input.city, "Ciudad o alcaldía", 80);
  const zoneLabel = requiredText(input.zoneLabel, "Colonia", 120);
  const slug = uniqueSlug(slugify(input.slug || title), db.properties);

  if (!estimatedValueMxn) {
    throw new Error("Valor de avalúo obligatorio");
  }
  if (!legalBidMxn) {
    throw new Error("Postura legal obligatoria");
  }
  if (!auctionDate) {
    throw new Error("Fecha del remate obligatoria");
  }

  return {
    id: randomId("prop"),
    displayId: nextPropertyDisplayId(db.properties),
    slug,
    title,
    state,
    city,
    zoneLabel,
    estimatedValueMxn,
    legalBidMxn,
    discountPct: computeDiscountPct(estimatedValueMxn, legalBidMxn),
    auctionRound: sanitizeText(input.auctionRound || "PRIMERA", 40),
    shortDescription: requiredText(input.shortDescription, "Descripción", 240),
    fullAddress,
    auctionDate,
    auctionTime: sanitizeText(input.auctionTime || "", 20),
    courtName,
    occupancyStatus: sanitizeText(input.occupancyStatus || "", 80),
    legalSummary: sanitizeText(input.legalSummary || "", 500),
    riskNotes: sanitizeText(input.riskNotes || "", 500),
    publicStatus: "PUBLISHED",
    featured: true,
    tags: Array.isArray(input.tags) ? input.tags.slice(0, 5).map((tag) => sanitizeText(tag, 40)).filter(Boolean) : ["Remate"],
    heroTone: input.heroTone || "cobalt",
    imageAccent: input.imageAccent || "#2563eb",
    locationImage: null,
    publishedAt: new Date().toISOString()
  };
}

function requiredText(value, label, maxLength) {
  const text = sanitizeText(value || "", maxLength);
  if (!text) {
    throw new Error(`${label} obligatorio`);
  }
  return text;
}

function computeDiscountPct(estimatedValueMxn, legalBidMxn) {
  if (!estimatedValueMxn || !legalBidMxn || legalBidMxn >= estimatedValueMxn) {
    return 0;
  }
  return Math.round((1 - legalBidMxn / estimatedValueMxn) * 100);
}

function normalizeStateName(value) {
  const text = sanitizeText(value || "", 80);
  const key = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (["cdmx", "ciudaddemexico", "mexicocity"].includes(key)) {
    return "Ciudad de M\u00e9xico";
  }
  return text;
}

function titleFromAddress(fullAddress, city, zoneLabel) {
  if (zoneLabel) {
    return `Remate en ${zoneLabel}`;
  }
  if (city) {
    return `Remate en ${city}`;
  }
  const addressPart = sanitizeText(fullAddress || "", 80).split(",")[0];
  return addressPart ? `Remate en ${addressPart}` : "Remate inmobiliario";
}

function descriptionFromValues(estimatedValueMxn, legalBidMxn) {
  if (estimatedValueMxn && legalBidMxn) {
    return "Remate judicial con avalúo, postura legal y fecha confirmados desde edicto.";
  }
  return "Remate judicial pendiente de confirmacion documental.";
}

function uniqueSlug(baseSlug, properties) {
  const used = new Set(properties.map((property) => property.slug));
  const base = baseSlug || "remate-inmobiliario";
  if (!used.has(base)) {
    return base;
  }

  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}-${index}`;
    if (!used.has(candidate)) {
      return candidate;
    }
  }

  return `${base}-${randomId("pub").slice(-6)}`;
}

function slugify(value) {
  const slug = sanitizeText(value || "", 120)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "remate-inmobiliario";
}

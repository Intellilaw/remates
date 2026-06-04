import { mutateDb } from "../../data/store.js";
import { badRequest, readJsonBody, sendJson } from "../../utils/http.js";
import { nextPropertyDisplayId } from "../../utils/property-display-id.js";
import { randomId, sanitizeText } from "../../utils/security.js";
import { STAFF_ACCESS_ROLES, getFullProperty, logAudit, requireRoles } from "../../domain/app-domain.js";
import { locationImageKey, resolveLocationImage } from "../../services/property-location-image-service.js";

const PROPERTY_PUBLIC_STATUSES = new Set(["PUBLISHED", "DRAFT", "ARCHIVED", "SOLD", "DELIVERED"]);

export async function handleAdminPropertyRoutes(req, res, pathname, { db, actor }) {
  if (pathname === "/api/admin/properties" && req.method === "GET") {
    if (!requireRoles(res, actor, STAFF_ACCESS_ROLES)) {
      return;
    }
    return sendJson(res, 200, { items: db.properties.map(getFullProperty) });
  }

  if (pathname === "/api/admin/properties" && req.method === "POST") {
    if (!requireRoles(res, actor, STAFF_ACCESS_ROLES)) {
      return;
    }
    try {
      const body = await readJsonBody(req);
      const updated = await mutateDb(async (draft) => {
        const estimatedValueMxn = Number(body.estimatedValueMxn || 0);
        const legalBidMxn = Number(body.legalBidMxn || (estimatedValueMxn ? computeLegalBid(estimatedValueMxn) : 0));
        const title = requiredText(body.title, "Título", 120);
        const fullAddress = requiredText(body.fullAddress, "Dirección del inmueble", 240);
        const courtName = requiredText(body.courtName, "Juzgado del remate", 180);
        const auctionDate = sanitizeText(body.auctionDate || "", 20);
        const state = requiredText(normalizeStateName(body.state), "Estado", 80);
        const city = requiredText(body.city, "Ciudad o alcaldía", 80);
        const zoneLabel = requiredText(body.zoneLabel, "Colonia", 120);
        const publicStatus = normalizePublicStatus(body.publicStatus, "PUBLISHED");

        if (!estimatedValueMxn) {
          throw new Error("Valor de avalúo obligatorio");
        }
        if (!legalBidMxn) {
          throw new Error("Postura legal obligatoria");
        }
        if (!auctionDate) {
          throw new Error("Fecha del remate obligatoria");
        }

        const property = {
          id: randomId("prop"),
          displayId: nextPropertyDisplayId(draft.properties),
          slug: uniqueSlug(slugify(body.slug || title), draft.properties),
          title,
          state,
          city,
          zoneLabel,
          estimatedValueMxn,
          legalBidMxn,
          discountPct: computeDiscountPct(estimatedValueMxn, legalBidMxn),
          auctionRound: sanitizeText(body.auctionRound || "PRIMERA", 40),
          shortDescription: requiredText(body.shortDescription, "Descripción", 240),
          fullAddress,
          auctionDate,
          auctionTime: sanitizeText(body.auctionTime || "", 20),
          courtName,
          occupancyStatus: sanitizeText(body.occupancyStatus || "", 80),
          legalSummary: sanitizeText(body.legalSummary || "", 500),
          riskNotes: sanitizeText(body.riskNotes || "", 500),
          publicStatus,
          featured: Boolean(body.featured),
          tags: Array.isArray(body.tags) ? body.tags.slice(0, 5).map((tag) => sanitizeText(tag, 40)).filter(Boolean) : ["Remate"],
          heroTone: body.heroTone || "cobalt",
          imageAccent: body.imageAccent || "#2563eb",
          locationImage: null,
          publishedAt: new Date().toISOString()
        };
        if (isPublishedStatus(property.publicStatus)) {
          property.locationImage = await resolveLocationImage(property);
        }
        draft.properties.unshift(property);
        logAudit(draft, actor, "PROPERTY_CREATED", "property", property.id, property);
        return draft;
      });
      return sendJson(res, 201, { item: getFullProperty(updated.properties[0]) });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  const propertyPatchMatch = pathname.match(/^\/api\/admin\/properties\/([^/]+)$/);
  if (propertyPatchMatch && req.method === "PATCH") {
    if (!requireRoles(res, actor, STAFF_ACCESS_ROLES)) {
      return;
    }
    try {
      const body = await readJsonBody(req);
      const propertyId = propertyPatchMatch[1];
      const updated = await mutateDb(async (draft) => {
        const property = draft.properties.find((item) => item.id === propertyId);
        if (!property) {
          throw new Error("Inmueble no encontrado");
        }
        const before = structuredClone(property);
        const beforeLocationKey = locationImageKey(property);
        const estimatedValueMxn = body.estimatedValueMxn !== undefined ? Number(body.estimatedValueMxn || 0) : property.estimatedValueMxn;
        const legalBidMxn = body.legalBidMxn !== undefined ? Number(body.legalBidMxn || 0) : property.legalBidMxn;
        Object.assign(property, {
          title: body.title ? sanitizeText(body.title, 120) : property.title,
          state: body.state ? sanitizeText(body.state, 80) : property.state,
          city: body.city ? sanitizeText(body.city, 80) : property.city,
          zoneLabel: body.zoneLabel ? sanitizeText(body.zoneLabel, 120) : property.zoneLabel,
          estimatedValueMxn,
          shortDescription: body.shortDescription ? sanitizeText(body.shortDescription, 240) : property.shortDescription,
          legalBidMxn,
          discountPct: computeDiscountPct(estimatedValueMxn, legalBidMxn),
          auctionRound: body.auctionRound ? sanitizeText(body.auctionRound, 40) : property.auctionRound,
          auctionDate: body.auctionDate || property.auctionDate,
          auctionTime: body.auctionTime ? sanitizeText(body.auctionTime, 20) : property.auctionTime,
          courtName: body.courtName ? sanitizeText(body.courtName, 180) : property.courtName,
          fullAddress: body.fullAddress ? sanitizeText(body.fullAddress, 240) : property.fullAddress,
          legalSummary: body.legalSummary ? sanitizeText(body.legalSummary, 500) : property.legalSummary,
          riskNotes: body.riskNotes ? sanitizeText(body.riskNotes, 500) : property.riskNotes,
          publicStatus: normalizePublicStatus(body.publicStatus, property.publicStatus),
          featured: typeof body.featured === "boolean" ? body.featured : property.featured
        });
        if (["PUBLISHED", "SOLD", "DELIVERED"].includes(property.publicStatus) && !property.publishedAt) {
          property.publishedAt = new Date().toISOString();
        }
        const locationChanged = beforeLocationKey !== locationImageKey(property);
        if (isPublishedStatus(property.publicStatus) && (!property.locationImage || locationChanged)) {
          property.locationImage = await resolveLocationImage(property);
        }
        logAudit(draft, actor, "PROPERTY_UPDATED", "property", propertyId, property, before);
        return draft;
      });
      const item = updated.properties.find((entry) => entry.id === propertyId);
      return sendJson(res, 200, { item: getFullProperty(item) });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  if (propertyPatchMatch && req.method === "DELETE") {
    if (!requireRoles(res, actor, ["CONTENT", "ADMIN", "LEGAL"])) {
      return;
    }
    try {
      const propertyId = propertyPatchMatch[1];
      await mutateDb(async (draft) => {
        const propertyIndex = draft.properties.findIndex((item) => item.id === propertyId);
        if (propertyIndex === -1) {
          throw new Error("Inmueble no encontrado");
        }
        const [property] = draft.properties.splice(propertyIndex, 1);
        const deletedCases = draft.cases.filter((item) => item.propertyId === propertyId);
        const deletedCaseIds = new Set(deletedCases.map((item) => item.id));
        const deletedConversationIds = new Set(
          draft.conversations.filter((item) => deletedCaseIds.has(item.caseId)).map((item) => item.id)
        );

        draft.cases = draft.cases.filter((item) => !deletedCaseIds.has(item.id));
        draft.caseEvents = draft.caseEvents.filter((item) => !deletedCaseIds.has(item.caseId));
        draft.internalNotes = draft.internalNotes.filter((item) => !deletedCaseIds.has(item.caseId));
        draft.payments = draft.payments.filter((item) => !deletedCaseIds.has(item.caseId));
        draft.conversations = draft.conversations.filter((item) => !deletedConversationIds.has(item.id));
        draft.conversationParticipants = draft.conversationParticipants.filter((item) => !deletedConversationIds.has(item.conversationId));
        draft.messages = draft.messages.filter((item) => !deletedConversationIds.has(item.conversationId));
        draft.conversionEvents = draft.conversionEvents.filter((item) => item.propertyId !== propertyId && !deletedCaseIds.has(item.caseId));

        logAudit(draft, actor, "PROPERTY_DELETED", "property", propertyId, property);
        return draft;
      });
      return sendJson(res, 204, null);
    } catch (error) {
      return badRequest(res, error.message);
    }
  }


  return false;
}

function normalizePublicStatus(value, fallback) {
  const status = sanitizeText(value || fallback || "DRAFT", 20).toUpperCase();
  if (!PROPERTY_PUBLIC_STATUSES.has(status)) {
    throw new Error("Estado de publicación inválido");
  }
  return status;
}

function isPublishedStatus(status) {
  return ["PUBLISHED", "SOLD", "DELIVERED"].includes(status);
}

function requiredText(value, label, maxLength) {
  const text = sanitizeText(value || "", maxLength);
  if (!text) {
    throw new Error(`${label} obligatorio`);
  }
  return text;
}

function computeLegalBid(estimatedValueMxn) {
  return Math.round((Number(estimatedValueMxn || 0) * 2) / 3);
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

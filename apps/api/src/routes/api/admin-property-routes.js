import { mutateDb } from "../../data/store.js";
import { badRequest, readJsonBody, sendJson } from "../../utils/http.js";
import { randomId, sanitizeText } from "../../utils/security.js";
import { STAFF_ACCESS_ROLES, getFullProperty, logAudit, requireRoles } from "../../domain/app-domain.js";

export async function handleAdminPropertyRoutes(req, res, pathname, { db, actor }) {
  if (pathname === "/api/admin/properties" && req.method === "GET") {
    if (!requireRoles(res, actor, STAFF_ACCESS_ROLES)) {
      return;
    }
    return sendJson(res, 200, { items: db.properties.map(getFullProperty) });
  }

  if (pathname === "/api/admin/properties" && req.method === "POST") {
    if (!requireRoles(res, actor, ["CONTENT", "ADMIN", "LEGAL"])) {
      return;
    }
    try {
      const body = await readJsonBody(req);
      const updated = await mutateDb(async (draft) => {
        const property = {
          id: randomId("prop"),
          slug: sanitizeText(body.slug || "", 120).replace(/\s+/g, "-").toLowerCase(),
          title: sanitizeText(body.title || "", 120),
          state: sanitizeText(body.state || "", 80),
          city: sanitizeText(body.city || "", 80),
          zoneLabel: sanitizeText(body.zoneLabel || "", 120),
          estimatedValueMxn: Number(body.estimatedValueMxn || 0),
          legalBidMxn: Number(body.legalBidMxn || 0),
          discountPct: Number(body.discountPct || 0),
          auctionRound: sanitizeText(body.auctionRound || "PRIMERA", 40),
          shortDescription: sanitizeText(body.shortDescription || "", 240),
          fullAddress: sanitizeText(body.fullAddress || "", 240),
          auctionDate: body.auctionDate || null,
          auctionTime: sanitizeText(body.auctionTime || "", 20),
          courtName: sanitizeText(body.courtName || "", 180),
          occupancyStatus: sanitizeText(body.occupancyStatus || "", 80),
          legalSummary: sanitizeText(body.legalSummary || "", 500),
          riskNotes: sanitizeText(body.riskNotes || "", 500),
          publicStatus: body.publicStatus || "DRAFT",
          featured: Boolean(body.featured),
          tags: Array.isArray(body.tags) ? body.tags.slice(0, 5).map((tag) => sanitizeText(tag, 40)) : [],
          heroTone: body.heroTone || "stone",
          imageAccent: body.imageAccent || "#a97b52",
          publishedAt: new Date().toISOString()
        };
        draft.properties.unshift(property);
        logAudit(draft, actor, "PROPERTY_CREATED", "property", property.id, property);
        return draft;
      });
      return sendJson(res, 201, { item: updated.properties[0] });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  const propertyPatchMatch = pathname.match(/^\/api\/admin\/properties\/([^/]+)$/);
  if (propertyPatchMatch && req.method === "PATCH") {
    if (!requireRoles(res, actor, ["CONTENT", "ADMIN", "LEGAL"])) {
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
        Object.assign(property, {
          title: body.title ? sanitizeText(body.title, 120) : property.title,
          shortDescription: body.shortDescription ? sanitizeText(body.shortDescription, 240) : property.shortDescription,
          legalBidMxn: body.legalBidMxn !== undefined ? Number(body.legalBidMxn || 0) : property.legalBidMxn,
          auctionRound: body.auctionRound ? sanitizeText(body.auctionRound, 40) : property.auctionRound,
          auctionDate: body.auctionDate || property.auctionDate,
          auctionTime: body.auctionTime ? sanitizeText(body.auctionTime, 20) : property.auctionTime,
          courtName: body.courtName ? sanitizeText(body.courtName, 180) : property.courtName,
          legalSummary: body.legalSummary ? sanitizeText(body.legalSummary, 500) : property.legalSummary,
          riskNotes: body.riskNotes ? sanitizeText(body.riskNotes, 500) : property.riskNotes,
          publicStatus: body.publicStatus || property.publicStatus,
          featured: typeof body.featured === "boolean" ? body.featured : property.featured
        });
        logAudit(draft, actor, "PROPERTY_UPDATED", "property", propertyId, property, before);
        return draft;
      });
      const item = updated.properties.find((entry) => entry.id === propertyId);
      return sendJson(res, 200, { item });
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
        draft.messages = draft.messages.filter((item) => !deletedConversationIds.has(item.conversationId));

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

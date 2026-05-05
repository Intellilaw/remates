import { mutateDb } from "../../data/store.js";
import { badRequest, notFound, readJsonBody, sendJson } from "../../utils/http.js";
import { randomId, sanitizeText } from "../../utils/security.js";
import { CASE_STATUSES, STAFF_ACCESS_ROLES, caseSnapshot, logAudit, requireRoles } from "../../domain/app-domain.js";

export async function handleAdminCaseRoutes(req, res, pathname, { db, actor }) {
  if (pathname === "/api/admin/cases" && req.method === "GET") {
    if (!requireRoles(res, actor, STAFF_ACCESS_ROLES)) {
      return;
    }
    const items = db.cases.map((caseRecord) => {
      const client = db.users.find((user) => user.id === caseRecord.userId);
      return {
        ...caseSnapshot(db, caseRecord, actor),
        client: client ? exposeUser(client) : null,
        notes: db.internalNotes.filter((note) => note.caseId === caseRecord.id)
      };
    });
    return sendJson(res, 200, { items });
  }

  const adminCasePatchMatch = pathname.match(/^\/api\/admin\/cases\/([^/]+)$/);
  if (adminCasePatchMatch && req.method === "PATCH") {
    if (!requireRoles(res, actor, STAFF_ACCESS_ROLES)) {
      return;
    }
    try {
      const body = await readJsonBody(req);
      const caseId = adminCasePatchMatch[1];
      const updated = await mutateDb(async (draft) => {
        const caseRecord = draft.cases.find((item) => item.id === caseId);
        if (!caseRecord) {
          throw new Error("Caso no encontrado");
        }
        const before = structuredClone(caseRecord);
        if (body.status) {
          const nextStatus = sanitizeText(body.status, 40).toUpperCase();
          if (!CASE_STATUSES.includes(nextStatus)) {
            throw new Error("Estatus de caso inválido");
          }
          caseRecord.status = nextStatus;
        }
        if (body.currentStage && ["LEAD", ...STAGE_ORDER].includes(body.currentStage)) {
          caseRecord.currentStage = body.currentStage;
        }
        if (body.assignedStaffUserId) {
          caseRecord.assignedStaffUserId = body.assignedStaffUserId;
        }
        caseRecord.lastActivityAt = new Date().toISOString();
        draft.caseEvents.push({
          id: randomId("evt"),
          caseId,
          eventType: "CASE_UPDATED",
          actorUserId: actor.id,
          metadata: body,
          createdAt: new Date().toISOString()
        });
        logAudit(draft, actor, "CASE_UPDATED", "case", caseId, caseRecord, before);
        return draft;
      });
      const item = updated.cases.find((entry) => entry.id === caseId);
      return sendJson(res, 200, { item });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  const notesMatch = pathname.match(/^\/api\/admin\/cases\/([^/]+)\/notes$/);
  if (notesMatch && req.method === "POST") {
    if (!requireRoles(res, actor, ["LEGAL", "SALES", "ADMIN"])) {
      return;
    }
    try {
      const body = await readJsonBody(req);
      const caseId = notesMatch[1];
      const updated = await mutateDb(async (draft) => {
        const caseRecord = draft.cases.find((item) => item.id === caseId);
        if (!caseRecord) {
          throw new Error("Caso no encontrado");
        }
        const note = {
          id: randomId("note"),
          caseId,
          authorUserId: actor.id,
          body: sanitizeText(body.body || "", 1000),
          createdAt: new Date().toISOString()
        };
        draft.internalNotes.push(note);
        caseRecord.lastActivityAt = note.createdAt;
        logAudit(draft, actor, "NOTE_CREATED", "case", caseId, note);
        return draft;
      });
      const item = updated.internalNotes.at(-1);
      return sendJson(res, 201, { item });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  return false;
}

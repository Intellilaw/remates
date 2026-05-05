import { mutateDb } from "../../data/store.js";
import { badRequest, readJsonBody, sendJson } from "../../utils/http.js";
import { sanitizeText } from "../../utils/security.js";
import { logAudit, requireRoles } from "../../domain/app-domain.js";

export async function handleAdminContentRoutes(req, res, pathname, { db, actor }) {
  if (pathname === "/api/admin/content" && req.method === "GET") {
    if (!requireRoles(res, actor, ["CONTENT", "ADMIN"])) {
      return;
    }
    return sendJson(res, 200, { items: db.cmsContent });
  }

  const contentMatch = pathname.match(/^\/api\/admin\/content\/([^/]+)$/);
  if (contentMatch && req.method === "PUT") {
    if (!requireRoles(res, actor, ["CONTENT", "ADMIN"])) {
      return;
    }
    try {
      const body = await readJsonBody(req);
      const contentKey = contentMatch[1];
      const updated = await mutateDb(async (draft) => {
        const item = draft.cmsContent.find((entry) => entry.contentKey === contentKey);
        if (!item) {
          throw new Error("Contenido no encontrado");
        }
        const before = structuredClone(item);
        item.title = sanitizeText(body.title || item.title, 160);
        item.bodyMarkdown = sanitizeText(body.bodyMarkdown || item.bodyMarkdown, 1500);
        item.videoS3Key = sanitizeText(body.videoS3Key || item.videoS3Key, 240);
        item.isPublished = typeof body.isPublished === "boolean" ? body.isPublished : item.isPublished;
        logAudit(draft, actor, "CONTENT_UPDATED", "cms_content", item.id, item, before);
        return draft;
      });
      const item = updated.cmsContent.find((entry) => entry.contentKey === contentMatch[1]);
      return sendJson(res, 200, { item });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }


  return false;
}

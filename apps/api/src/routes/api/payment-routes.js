import { mutateDb } from "../../data/store.js";
import { storeWebhookEvent } from "../../services/payment-service.js";
import { badRequest, forbidden, readJsonBody, sendJson } from "../../utils/http.js";
import { randomId, sanitizeText } from "../../utils/security.js";
import { actorCanAccessConversation, logAudit, requireAuth } from "../../domain/app-domain.js";
import { exposeUser } from "../../services/auth-service.js";

export async function handlePaymentRoutes(req, res, pathname, { db, actor }) {
  if (pathname === "/api/payments/webhook/mercadopago" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const signature = req.headers["x-signature"] || "";
      await mutateDb(async (draft) => {
        storeWebhookEvent(draft, body, signature);
        return draft;
      });
      return sendJson(res, 202, { received: true });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  const conversationMatch = pathname.match(/^\/api\/conversations\/([^/]+)\/messages$/);
  if (conversationMatch && req.method === "GET") {
    if (!requireAuth(res, actor)) {
      return;
    }
    const conversationId = conversationMatch[1];
    if (!actorCanAccessConversation(db, actor, conversationId)) {
      return forbidden(res, "No puedes ver esta conversación");
    }
    const items = db.messages
      .filter((item) => item.conversationId === conversationId)
      .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
      .map((message) => {
        const sender = db.users.find((user) => user.id === message.senderUserId);
        return {
          ...message,
          sender: sender ? exposeUser(sender) : null
        };
      });
    return sendJson(res, 200, { items });
  }

  if (conversationMatch && req.method === "POST") {
    if (!requireAuth(res, actor)) {
      return;
    }
    const conversationId = conversationMatch[1];
    if (!actorCanAccessConversation(db, actor, conversationId)) {
      return forbidden(res, "No puedes escribir en esta conversación");
    }
    try {
      const body = await readJsonBody(req);
      const content = sanitizeText(body.body || "", 1000);
      if (!content) {
        return badRequest(res, "El mensaje no puede ir vacío");
      }

      const updated = await mutateDb(async (draft) => {
        const message = {
          id: randomId("msg"),
          conversationId,
          senderUserId: actor.id,
          body: content,
          attachments: [],
          readAt: null,
          createdAt: new Date().toISOString()
        };
        draft.messages.push(message);
        const conversation = draft.conversations.find((item) => item.id === conversationId);
        if (conversation) {
          conversation.lastMessageAt = message.createdAt;
        }
        const relatedCase = draft.cases.find((item) => item.id === conversation?.caseId);
        if (relatedCase) {
          relatedCase.lastActivityAt = message.createdAt;
        }
        return draft;
      });
      const message = updated.messages.filter((item) => item.conversationId === conversationId).at(-1);
      return sendJson(res, 201, { item: message });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }


  return false;
}

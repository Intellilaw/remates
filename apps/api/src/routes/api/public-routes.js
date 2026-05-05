import { mutateDb } from "../../data/store.js";
import { config } from "../../config.js";
import { authProviders, createAuthResponse, exposeUser, loginUser, registerUser, socialDemoLogin } from "../../services/auth-service.js";
import { confirmMockPayment, createCheckout } from "../../services/payment-service.js";
import { badRequest, forbidden, notFound, readJsonBody, sendJson, unauthorized } from "../../utils/http.js";
import { normalizeEmail, randomId, sanitizeText } from "../../utils/security.js";
import { actorCanAccessCase, caseSnapshot, getServiceStage, logAudit, propertyAccessForActor, propertySnapshot, requireAuth, stageProgress } from "../../domain/app-domain.js";

export async function handlePublicRoutes(req, res, pathname, { db, actor }) {
  if (pathname === "/api/health" && req.method === "GET") {
    return sendJson(res, 200, {
      ok: true,
      env: config.appEnv,
      authMode: config.authMode,
      paymentsMode: config.mercadoPagoMode
    });
  }

  if (pathname === "/api/auth/providers" && req.method === "GET") {
    return sendJson(res, 200, authProviders());
  }

  if (pathname === "/api/auth/register" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const updated = await mutateDb(async (draft) => {
        const user = registerUser(draft, body);
        draft.conversionEvents.push({
          id: randomId("conv"),
          visitorSessionId: body.visitorSessionId || null,
          userId: user.id,
          caseId: null,
          propertyId: null,
          eventType: "register",
          metadata: { source: "email_password" },
          createdAt: new Date().toISOString()
        });
        return draft;
      });
      const user = updated.users.find((item) => item.email === normalizeEmail(body.email));
      return sendJson(res, 201, createAuthResponse(user));
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const user = loginUser(db, body);
      return sendJson(res, 200, createAuthResponse(user));
    } catch (error) {
      return unauthorized(res, error.message);
    }
  }

  if (pathname === "/api/auth/social-demo" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const updated = await mutateDb(async (draft) => {
        const user = socialDemoLogin(draft, body.provider);
        draft.conversionEvents.push({
          id: randomId("conv"),
          visitorSessionId: null,
          userId: user.id,
          caseId: null,
          propertyId: null,
          eventType: "register",
          metadata: { source: body.provider },
          createdAt: new Date().toISOString()
        });
        return draft;
      });
      const user = updated.users.find((item) => item.email === `${String(body.provider || "").toLowerCase()}.demo@remates.mx`);
      return sendJson(res, 200, createAuthResponse(user));
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  if (pathname === "/api/me" && req.method === "GET") {
    if (!requireAuth(res, actor)) {
      return;
    }
    return sendJson(res, 200, { user: exposeUser(actor) });
  }

  if (pathname === "/api/properties" && req.method === "GET") {
    const properties = db.properties
      .filter((property) => property.publicStatus === "PUBLISHED")
      .sort((left, right) => Number(right.featured) - Number(left.featured));
    return sendJson(res, 200, {
      items: properties.map((property) => propertySnapshot(db, property, actor))
    });
  }

  const propertyMatch = pathname.match(/^\/api\/properties\/([^/]+)$/);
  if (propertyMatch && req.method === "GET") {
    const slug = propertyMatch[1];
    const property = db.properties.find((item) => item.slug === slug);
    if (!property) {
      return notFound(res, "Inmueble no encontrado");
    }
    const access = propertyAccessForActor(db, property, actor);
    return sendJson(res, 200, {
      item: propertySnapshot(db, property, actor),
      gated: !access.showFullDetails,
      entitlements: access
    });
  }

  if (pathname === "/api/content/education" && req.method === "GET") {
    const content = db.cmsContent.find((item) => item.contentKey === "education");
    return sendJson(res, 200, {
      item: content
    });
  }

  if (pathname === "/api/tracking/events" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      await mutateDb(async (draft) => {
        draft.conversionEvents.push({
          id: randomId("conv"),
          visitorSessionId: body.visitorSessionId || randomId("visit"),
          userId: actor?.id || null,
          caseId: body.caseId || null,
          propertyId: body.propertyId || null,
          eventType: sanitizeText(body.eventType || "unknown", 60),
          metadata: body.metadata || {},
          createdAt: new Date().toISOString()
        });
        return draft;
      });
      return sendJson(res, 201, { ok: true });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  if (pathname === "/api/me/cases" && req.method === "GET") {
    if (!requireAuth(res, actor)) {
      return;
    }
      const items = db.cases.filter((item) => item.userId === actor.id).map((item) => caseSnapshot(db, item, actor));
    return sendJson(res, 200, { items });
  }

  if (pathname === "/api/me/payments" && req.method === "GET") {
    if (!requireAuth(res, actor)) {
      return;
    }
    const userCaseIds = db.cases.filter((item) => item.userId === actor.id).map((item) => item.id);
    const items = db.payments.filter((item) => userCaseIds.includes(item.caseId) && item.status !== "VOIDED");
    return sendJson(res, 200, { items });
  }

  if (pathname === "/api/cases" && req.method === "POST") {
    if (!requireAuth(res, actor)) {
      return;
    }
    try {
      const body = await readJsonBody(req);
      const property = db.properties.find((item) => item.id === body.propertyId);
      if (!property) {
        return badRequest(res, "Inmueble inválido");
      }

      const existing = db.cases.find((item) => item.userId === actor.id && item.propertyId === body.propertyId);
      if (existing) {
        return sendJson(res, 200, { item: caseSnapshot(db, existing, actor), existing: true });
      }

      const updated = await mutateDb(async (draft) => {
        const caseRecord = {
          id: randomId("case"),
          userId: actor.id,
          propertyId: body.propertyId,
          status: "NEW",
          currentStage: "LEAD",
          assignedStaffUserId: "usr_sales_demo",
          leadSource: sanitizeText(body.leadSource || "direct", 80),
          utmSource: sanitizeText(body.utmSource || "", 80),
          utmMedium: sanitizeText(body.utmMedium || "", 80),
          utmCampaign: sanitizeText(body.utmCampaign || "", 120),
          createdAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString()
        };
        draft.cases.push(caseRecord);
        draft.caseEvents.push({
          id: randomId("evt"),
          caseId: caseRecord.id,
          eventType: "CASE_CREATED",
          actorUserId: actor.id,
          metadata: { leadSource: caseRecord.leadSource },
          createdAt: new Date().toISOString()
        });
        draft.conversionEvents.push({
          id: randomId("conv"),
          visitorSessionId: null,
          userId: actor.id,
          caseId: caseRecord.id,
          propertyId: caseRecord.propertyId,
          eventType: "case_created",
          metadata: { leadSource: caseRecord.leadSource },
          createdAt: new Date().toISOString()
        });
        const conversation = {
          id: randomId("conv"),
          caseId: caseRecord.id,
          status: "OPEN",
          lastMessageAt: new Date().toISOString()
        };
        draft.conversations.push(conversation);
        draft.conversationParticipants.push(
          { conversationId: conversation.id, userId: actor.id, participantType: "CLIENT" },
          { conversationId: conversation.id, userId: "usr_sales_demo", participantType: "STAFF" }
        );
        draft.messages.push({
          id: randomId("msg"),
          conversationId: conversation.id,
          senderUserId: "usr_sales_demo",
          body: "Abrimos tu expediente y preparamos la estrategia para la primera asesoría.",
          createdAt: new Date().toISOString(),
          readAt: null
        });
        return draft;
      });

      const created = updated.cases.find((item) => item.userId === actor.id && item.propertyId === body.propertyId);
      return sendJson(res, 201, { item: caseSnapshot(updated, created, actor), existing: false });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  const caseMatch = pathname.match(/^\/api\/cases\/([^/]+)$/);
  if (caseMatch && req.method === "GET") {
    if (!requireAuth(res, actor)) {
      return;
    }
    const caseRecord = db.cases.find((item) => item.id === caseMatch[1]);
    if (!caseRecord) {
      return notFound(res, "Caso no encontrado");
    }
    if (!actorCanAccessCase(actor, caseRecord)) {
      return forbidden(res, "No puedes ver este caso");
    }
    return sendJson(res, 200, { item: caseSnapshot(db, caseRecord, actor) });
  }

  const checkoutMatch = pathname.match(/^\/api\/cases\/([^/]+)\/payments\/([^/]+)\/checkout$/);
  if (checkoutMatch && req.method === "POST") {
    if (!requireAuth(res, actor)) {
      return;
    }
    const [, caseId, stageCode] = checkoutMatch;
    const caseRecord = db.cases.find((item) => item.id === caseId);
    if (!caseRecord) {
      return notFound(res, "Caso no encontrado");
    }
    if (caseRecord.userId !== actor.id) {
      return forbidden(res, "Solo el cliente dueño del caso puede iniciar este pago");
    }
    const stage = getServiceStage(db, stageCode);
    if (!stage) {
      return badRequest(res, "Etapa inválida");
    }
    const progress = stageProgress(db, caseRecord);
    if (progress.nextStageCode !== stageCode) {
      return badRequest(res, "Esta etapa aún no está disponible para este expediente");
    }
    if (!progress.canPurchaseNextStage) {
      return badRequest(res, progress.nextStageReason || "Esta etapa aún no puede pagarse");
    }

    const updated = await mutateDb(async (draft) => {
      const draftCase = draft.cases.find((item) => item.id === caseId);
      const payment = await createCheckout(draft, draftCase, stage, actor);
      logAudit(draft, actor, "PAYMENT_CHECKOUT_CREATED", "payment", payment.id, payment);
      return draft;
    });

    const payment = updated.payments.find((item) => item.caseId === caseId && item.stageCode === stageCode && item.status !== "REJECTED");
    return sendJson(res, 201, {
      item: payment
    });
  }

  const paymentConfirmMatch = pathname.match(/^\/api\/payments\/([^/]+)\/confirm$/);
  if (paymentConfirmMatch && req.method === "POST") {
    if (!requireAuth(res, actor)) {
      return;
    }
    try {
      const paymentId = paymentConfirmMatch[1];
      const updated = await mutateDb(async (draft) => {
        const payment = draft.payments.find((item) => item.id === paymentId);
        if (!payment) {
          throw new Error("Pago no encontrado");
        }
        const caseRecord = draft.cases.find((item) => item.id === payment.caseId);
        if (!caseRecord || caseRecord.userId !== actor.id) {
          throw new Error("No puedes confirmar este pago");
        }
        confirmMockPayment(draft, paymentId);
        logAudit(draft, actor, "PAYMENT_CONFIRMED", "payment", paymentId, payment);
        return draft;
      });
      const payment = updated.payments.find((item) => item.id === paymentId);
      return sendJson(res, 200, { item: payment });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }

  const adminPaymentVoidMatch = pathname.match(/^\/api\/admin\/payments\/([^/]+)\/void$/);
  if (adminPaymentVoidMatch && req.method === "POST") {
    if (!requireRoles(res, actor, ["ADMIN", "FINANCE"])) {
      return;
    }
    try {
      const paymentId = adminPaymentVoidMatch[1];
      const updated = await mutateDb(async (draft) => {
        const payment = draft.payments.find((item) => item.id === paymentId);
        if (!payment) {
          throw new Error("Pago no encontrado");
        }
        if (payment.status !== "APPROVED") {
          throw new Error("Solo se pueden anular pagos aprobados");
        }

        const before = structuredClone(payment);
        payment.status = "VOIDED";
        payment.voidedAt = new Date().toISOString();
        payment.voidedByUserId = actor.id;
        payment.voidReason = "Anulado desde intranet";

        const caseRecord = draft.cases.find((item) => item.id === payment.caseId);
        if (caseRecord) {
          caseRecord.lastActivityAt = payment.voidedAt;
          draft.caseEvents.push({
            id: randomId("evt"),
            caseId: caseRecord.id,
            eventType: "PAYMENT_VOIDED",
            actorUserId: actor.id,
            metadata: { paymentId, stageCode: payment.stageCode, amountMxn: payment.amountMxn },
            createdAt: payment.voidedAt
          });
        }

        logAudit(draft, actor, "PAYMENT_VOIDED", "payment", paymentId, payment, before);
        return draft;
      });
      const item = updated.payments.find((payment) => payment.id === paymentId);
      return sendJson(res, 200, { item });
    } catch (error) {
      return badRequest(res, error.message);
    }
  }


  return false;
}

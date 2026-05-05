import crypto from "node:crypto";
import { config } from "../config.js";
import { randomId } from "../utils/security.js";

export async function createCheckout(db, caseRecord, stage, actor) {
  let payment = db.payments.find(
    (candidate) =>
      candidate.caseId === caseRecord.id &&
      candidate.stageCode === stage.code &&
      ["PENDING", "APPROVED"].includes(candidate.status)
  );

  if (!payment) {
    payment = {
      id: randomId("pay"),
      caseId: caseRecord.id,
      stageCode: stage.code,
      provider: "mercado_pago",
      amountMxn: stage.priceMxn,
      currency: "MXN",
      status: "PENDING",
      providerPreferenceId: randomId("pref"),
      providerPaymentId: null,
      checkoutUrl: null,
      paidAt: null,
      createdAt: new Date().toISOString()
    };
    db.payments.push(payment);
  }

  if (config.mercadoPagoMode === "mercadopago" && config.mercadoPagoAccessToken) {
    const preference = await createMercadoPagoPreference(caseRecord, stage, actor);
    payment.providerPreferenceId = preference.id;
    payment.checkoutUrl = preference.init_point || preference.sandbox_init_point || null;
  } else {
    payment.checkoutUrl = `${config.publicWebUrl}/#checkout-${payment.id}`;
  }

  return payment;
}

async function createMercadoPagoPreference(caseRecord, stage, actor) {
  const payload = {
    items: [
      {
        title: `Servicio ${stage.name}`,
        quantity: 1,
        currency_id: "MXN",
        unit_price: stage.priceMxn
      }
    ],
    external_reference: `${caseRecord.id}:${stage.code}`,
    payer: {
      email: actor.email,
      name: actor.fullName
    },
    back_urls: {
      success: `${config.publicWebUrl}/dashboard?payment=success`,
      pending: `${config.publicWebUrl}/dashboard?payment=pending`,
      failure: `${config.publicWebUrl}/dashboard?payment=failure`
    },
    auto_return: "approved"
  };

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.mercadoPagoAccessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("No fue posible crear la preferencia de Mercado Pago");
  }

  return response.json();
}

export function confirmMockPayment(db, paymentId) {
  const payment = db.payments.find((candidate) => candidate.id === paymentId);

  if (!payment) {
    throw new Error("Pago no encontrado");
  }

  payment.status = "APPROVED";
  payment.providerPaymentId = payment.providerPaymentId || `mock_${crypto.randomUUID()}`;
  payment.paidAt = new Date().toISOString();

  const caseRecord = db.cases.find((candidate) => candidate.id === payment.caseId);
  if (caseRecord) {
    caseRecord.currentStage = payment.stageCode;
    if (["NEW", "ON_HOLD"].includes(caseRecord.status)) {
      caseRecord.status = "ACTIVE";
    }
    caseRecord.lastActivityAt = new Date().toISOString();

    db.caseEvents.push({
      id: randomId("evt"),
      caseId: caseRecord.id,
      eventType: "PAYMENT_APPROVED",
      actorUserId: caseRecord.userId,
      metadata: { stageCode: payment.stageCode, paymentId },
      createdAt: new Date().toISOString()
    });

    db.conversionEvents.push({
      id: randomId("conv"),
      visitorSessionId: null,
      userId: caseRecord.userId,
      caseId: caseRecord.id,
      propertyId: caseRecord.propertyId,
      eventType: "payment_approved",
      metadata: { stageCode: payment.stageCode, paymentId },
      createdAt: new Date().toISOString()
    });
  }

  return payment;
}

export function storeWebhookEvent(db, payload, signature = "") {
  const event = {
    id: randomId("wh"),
    providerEventId: payload.id || randomId("evt"),
    eventType: payload.type || "unknown",
    payload,
    signature,
    processingStatus: "RECEIVED",
    processedAt: null,
    createdAt: new Date().toISOString()
  };

  db.paymentWebhookEvents.push(event);
  return event;
}

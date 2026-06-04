import { config } from "../config.js";
import { exposeUser, hasAnyRole, isStaff } from "../services/auth-service.js";
import { buildFallbackLocationImage } from "../services/property-location-image-service.js";
import { forbidden, unauthorized } from "../utils/http.js";
import { randomId, verifySignedToken } from "../utils/security.js";


export const STAGE_ORDER = ["ADVISORY", "REPRESENTATION", "POSSESSION"];
export const STAFF_ACCESS_ROLES = ["SALES", "LEGAL", "FINANCE", "CONTENT", "ADMIN"];
export const USER_ROLES = ["CLIENT", "SALES", "LEGAL", "FINANCE", "CONTENT", "ADMIN"];
export const USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"];
export const CASE_STATUSES = ["NEW", "ACTIVE", "ON_HOLD", "AWARDED", "CLOSED"];

export function getBearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

export function getActor(db, req) {
  const token = getBearerToken(req);
  const payload = verifySignedToken(token, config.jwtSecret);
  if (!payload) {
    return null;
  }
  return db.users.find((user) => user.id === payload.sub) || null;
}

export function requireAuth(res, actor) {
  if (!actor) {
    unauthorized(res, "Necesitas iniciar sesión");
    return false;
  }
  return true;
}

export function requireRoles(res, actor, roles) {
  if (!actor || !hasAnyRole(actor, roles)) {
    forbidden(res, "No tienes permisos para esta acción");
    return false;
  }
  return true;
}

export function getBaseProperty(property) {
  return {
    id: property.id,
    displayId: property.displayId,
    slug: property.slug,
    title: property.title,
    state: property.state,
    city: property.city,
    zoneLabel: property.zoneLabel,
    estimatedValueMxn: property.estimatedValueMxn,
    legalBidMxn: property.legalBidMxn,
    discountPct: computeDiscountPct(property.estimatedValueMxn, property.legalBidMxn),
    auctionRound: property.auctionRound,
    shortDescription: property.shortDescription,
    publicStatus: property.publicStatus,
    featured: property.featured,
    tags: property.tags,
    heroTone: property.heroTone,
    imageAccent: property.imageAccent,
    locationImage: exposeLocationImage(property.locationImage || buildFallbackLocationImage(property), property),
    publishedAt: property.publishedAt
  };
}

function computeDiscountPct(estimatedValueMxn, legalBidMxn) {
  const estimatedValue = Number(estimatedValueMxn || 0);
  const legalBid = Number(legalBidMxn || 0);
  if (!estimatedValue || !legalBid || legalBid >= estimatedValue) {
    return 0;
  }
  return Math.round((1 - legalBid / estimatedValue) * 100);
}

export function getFullProperty(property) {
  return {
    ...getBaseProperty(property),
    fullAddress: property.fullAddress,
    auctionDate: property.auctionDate,
    auctionTime: property.auctionTime,
    courtName: property.courtName,
    occupancyStatus: property.occupancyStatus,
    legalSummary: property.legalSummary,
    riskNotes: property.riskNotes
  };
}

export function getServiceStage(db, stageCode) {
  return db.serviceStages.find((stage) => stage.code === stageCode);
}

export function getApprovedStages(db, caseId) {
  return db.payments
    .filter((payment) => payment.caseId === caseId && payment.status === "APPROVED")
    .map((payment) => payment.stageCode);
}

export function stageProgress(db, caseRecord) {
  const approved = getApprovedStages(db, caseRecord.id);

  const unlocked = STAGE_ORDER.filter((stageCode) => approved.includes(stageCode));
  let nextStageCode = null;
  let canPurchaseNextStage = false;
  let nextStageReason = null;

  if (!approved.includes("ADVISORY")) {
    nextStageCode = "ADVISORY";
    canPurchaseNextStage = true;
  } else if (!approved.includes("REPRESENTATION")) {
    nextStageCode = "REPRESENTATION";
    canPurchaseNextStage = true;
  } else if (!approved.includes("POSSESSION")) {
    nextStageCode = "POSSESSION";
    canPurchaseNextStage = caseRecord.status === "AWARDED";
    nextStageReason = canPurchaseNextStage
      ? null
      : "Esta etapa se habilita únicamente después de que el inmueble sea adjudicado a tu favor.";
  }

  return {
    unlocked,
    nextStageCode,
    approvedCount: unlocked.length,
    canPurchaseNextStage,
    nextStageReason,
    canSeeCourtAndTime: approved.includes("ADVISORY"),
    hasRepresentation: approved.includes("REPRESENTATION"),
    hasPossession: approved.includes("POSSESSION")
  };
}

export function propertyAccessForActor(db, property, actor, caseRecord = null) {
  if (!actor) {
    return {
      showAuctionDate: true,
      showAuctionTime: true,
      showFullAddress: true,
      showCourtAndTime: false,
      showFullDetails: false
    };
  }

  if (isStaff(actor)) {
    return {
      showAuctionDate: true,
      showAuctionTime: true,
      showFullAddress: true,
      showCourtAndTime: true,
      showFullDetails: true
    };
  }

  const relatedCase = caseRecord || db.cases.find((item) => item.userId === actor.id && item.propertyId === property.id) || null;
  const progress = relatedCase ? stageProgress(db, relatedCase) : null;

  return {
    showAuctionDate: true,
    showAuctionTime: true,
    showFullAddress: true,
    showCourtAndTime: Boolean(progress?.canSeeCourtAndTime),
    showFullDetails: Boolean(progress?.canSeeCourtAndTime)
  };
}

export function propertySnapshot(db, property, actor, caseRecord = null) {
  const access = propertyAccessForActor(db, property, actor, caseRecord);
  const snapshot = getBaseProperty(property);

  if (access.showAuctionDate) {
    snapshot.auctionDate = property.auctionDate;
  }

  if (access.showCourtAndTime) {
    snapshot.courtName = property.courtName;
  }

  if (access.showAuctionTime) {
    snapshot.auctionTime = property.auctionTime;
  }

  if (access.showFullAddress) {
    snapshot.fullAddress = property.fullAddress;
  }

  if (access.showFullDetails) {
    snapshot.occupancyStatus = property.occupancyStatus;
    snapshot.legalSummary = property.legalSummary;
    snapshot.riskNotes = property.riskNotes;
  }

  snapshot.visibility = access;
  return snapshot;
}

export function caseSnapshot(db, caseRecord, actor) {
  const property = db.properties.find((candidate) => candidate.id === caseRecord.propertyId);
  const payments = db.payments.filter((payment) => payment.caseId === caseRecord.id && (isStaff(actor) || payment.status !== "VOIDED"));
  const conversation = db.conversations.find((item) => item.caseId === caseRecord.id) || null;
  const assignedStaff = db.users.find((item) => item.id === caseRecord.assignedStaffUserId) || null;
  const progress = stageProgress(db, caseRecord);

  return {
    id: caseRecord.id,
    status: caseRecord.status,
    currentStage: caseRecord.currentStage,
    leadSource: caseRecord.leadSource,
    createdAt: caseRecord.createdAt,
    lastActivityAt: caseRecord.lastActivityAt,
    property: propertySnapshot(db, property, actor, caseRecord),
    assignedStaff: assignedStaff ? exposeUser(assignedStaff) : null,
    progress,
    payments: payments.map((payment) => ({
      id: payment.id,
      stageCode: payment.stageCode,
      amountMxn: payment.amountMxn,
      status: payment.status,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt
    })),
    conversationId: conversation?.id || null
  };
}

export function actorCanAccessCase(actor, caseRecord) {
  if (!actor || !caseRecord) {
    return false;
  }
  if (caseRecord.userId === actor.id) {
    return true;
  }
  return isStaff(actor);
}

export function actorCanAccessConversation(db, actor, conversationId) {
  const conversation = db.conversations.find((item) => item.id === conversationId);
  if (!conversation) {
    return false;
  }
  const caseRecord = db.cases.find((item) => item.id === conversation.caseId);
  return actorCanAccessCase(actor, caseRecord);
}

export function computeOverview(db) {
  const activeCases = db.cases.filter((item) => item.status === "ACTIVE").length;
  const totalRevenueMxn = db.payments
    .filter((item) => item.status === "APPROVED")
    .reduce((sum, item) => sum + item.amountMxn, 0);
  const stageBreakdown = STAGE_ORDER.map((stageCode) => ({
    stageCode,
    count: db.cases.filter((item) => item.currentStage === stageCode).length
  }));
  const conversionCounts = ["visit", "register", "case_created", "payment_approved"].map((eventType) => ({
    eventType,
    count: db.conversionEvents.filter((item) => item.eventType === eventType).length
  }));

  return {
    users: db.users.length,
    properties: db.properties.length,
    activeCases,
    totalRevenueMxn,
    stageBreakdown,
    conversionCounts
  };
}

export function logAudit(db, actor, action, entityType, entityId, after, before = null) {
  db.auditLogs.push({
    id: randomId("audit"),
    actorUserId: actor?.id || null,
    action,
    entityType,
    entityId,
    before,
    after,
    createdAt: new Date().toISOString()
  });
}

function exposeLocationImage(locationImage, property) {
  if (!locationImage) {
    return null;
  }

  const {
    endpoint,
    params,
    ...safeImage
  } = locationImage;
  const imageUrl = safeImage.imageUrl || buildLocationImageProxyUrl(property, locationImage);

  return {
    ...safeImage,
    imageUrl
  };
}

function buildLocationImageProxyUrl(property, locationImage) {
  if (!property?.slug || !locationImage?.endpoint || !locationImage?.params) {
    return "";
  }

  const baseUrl = config.publicWebUrl.replace(/\/$/, "");
  const version = encodeURIComponent(locationImage.generatedAt || property.publishedAt || property.id);
  return `${baseUrl}/api/properties/${encodeURIComponent(property.slug)}/location-image?v=${version}`;
}

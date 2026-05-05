import { createSeedData } from "./seed.js";

const roleCodes = ["CLIENT", "SALES", "LEGAL", "FINANCE", "CONTENT", "ADMIN"];

function toIso(value) {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : value;
}

function toNumber(value) {
  return value === null || value === undefined ? value : Number(value);
}

function dateOnly(value) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

function mapUser(user, userRoles) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone || "",
    gender: user.gender,
    status: user.status,
    roles: userRoles.filter((item) => item.userId === user.id).map((item) => item.roleCode),
    salt: user.passwordSalt,
    passwordHash: user.passwordHash,
    createdAt: toIso(user.createdAt)
  };
}

function mapProperty(property) {
  const details = property.privateDetails;
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    state: property.state,
    city: property.city,
    zoneLabel: property.zoneLabel,
    estimatedValueMxn: toNumber(property.estimatedValueMxn),
    legalBidMxn: toNumber(property.legalBidMxn),
    discountPct: toNumber(property.discountPct),
    auctionRound: property.auctionRound,
    shortDescription: property.shortDescription,
    publicStatus: property.publicStatus,
    featured: property.featured,
    tags: property.tags || [],
    heroTone: property.heroTone,
    imageAccent: property.imageAccent,
    publishedAt: toIso(property.publishedAt),
    fullAddress: details?.fullAddress || "",
    courtName: details?.courtName || "",
    fileNumber: details?.fileNumber || "",
    auctionDate: details?.auctionDate ? details.auctionDate.toISOString().slice(0, 10) : null,
    auctionTime: details?.auctionTime || "",
    occupancyStatus: details?.occupancyStatus || "",
    legalSummary: details?.legalSummary || "",
    riskNotes: details?.riskNotes || "",
    internalNotes: details?.internalNotes || ""
  };
}

export async function readPrismaState(prisma) {
  const [
    serviceStages,
    users,
    userRoles,
    authIdentities,
    properties,
    cases,
    caseEvents,
    payments,
    paymentWebhookEvents,
    conversations,
    conversationParticipants,
    messages,
    internalNotes,
    cmsContent,
    visitorSessions,
    conversionEvents,
    auditLogs
  ] = await Promise.all([
    prisma.serviceStage.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.userRole.findMany(),
    prisma.authIdentity.findMany(),
    prisma.property.findMany({ include: { privateDetails: true }, orderBy: { publishedAt: "desc" } }),
    prisma.case.findMany(),
    prisma.caseEvent.findMany(),
    prisma.payment.findMany(),
    prisma.paymentWebhookEvent.findMany(),
    prisma.conversation.findMany(),
    prisma.conversationParticipant.findMany(),
    prisma.message.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.internalNote.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.cmsContent.findMany(),
    prisma.visitorSession.findMany(),
    prisma.conversionEvent.findMany(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" } })
  ]);

  return {
    serviceStages: serviceStages.map((stage) => ({
      code: stage.code,
      name: stage.name,
      sortOrder: stage.sortOrder,
      priceMxn: toNumber(stage.priceMxn),
      description: stage.description || ""
    })),
    users: users.map((user) => mapUser(user, userRoles)),
    authIdentities: authIdentities.map((identity) => ({
      id: identity.id,
      userId: identity.userId,
      provider: identity.provider,
      providerSubject: identity.providerSubject,
      lastLoginAt: toIso(identity.lastLoginAt)
    })),
    properties: properties.map(mapProperty),
    cases: cases.map((item) => ({
      id: item.id,
      userId: item.userId,
      propertyId: item.propertyId,
      status: item.status,
      currentStage: item.currentStage,
      assignedStaffUserId: item.assignedStaffUserId,
      leadSource: item.leadSource,
      utmSource: item.utmSource,
      utmMedium: item.utmMedium,
      utmCampaign: item.utmCampaign,
      createdAt: toIso(item.createdAt),
      lastActivityAt: toIso(item.lastActivityAt)
    })),
    caseEvents: caseEvents.map((item) => ({
      id: item.id,
      caseId: item.caseId,
      eventType: item.eventType,
      actorUserId: item.actorUserId,
      metadata: item.metadata,
      createdAt: toIso(item.createdAt)
    })),
    payments: payments.map((item) => ({
      id: item.id,
      caseId: item.caseId,
      stageCode: item.stageCode,
      provider: item.provider,
      amountMxn: toNumber(item.amountMxn),
      currency: item.currency,
      status: item.status,
      providerPreferenceId: item.providerPreferenceId,
      providerPaymentId: item.providerPaymentId,
      checkoutUrl: item.checkoutUrl,
      paidAt: toIso(item.paidAt),
      createdAt: toIso(item.createdAt)
    })),
    paymentWebhookEvents: paymentWebhookEvents.map((item) => ({
      id: item.id,
      providerEventId: item.providerEventId,
      eventType: item.eventType,
      payload: item.payload,
      processingStatus: item.processingStatus,
      processedAt: toIso(item.processedAt),
      createdAt: toIso(item.createdAt)
    })),
    conversations: conversations.map((item) => ({
      id: item.id,
      caseId: item.caseId,
      status: item.status,
      lastMessageAt: toIso(item.lastMessageAt)
    })),
    conversationParticipants,
    messages: messages.map((item) => ({
      id: item.id,
      conversationId: item.conversationId,
      senderUserId: item.senderUserId,
      body: item.body,
      attachments: item.attachments,
      readAt: toIso(item.readAt),
      createdAt: toIso(item.createdAt)
    })),
    internalNotes: internalNotes.map((item) => ({
      id: item.id,
      caseId: item.caseId,
      authorUserId: item.authorUserId,
      body: item.body,
      createdAt: toIso(item.createdAt)
    })),
    cmsContent: cmsContent.map((item) => ({
      id: item.id,
      contentKey: item.contentKey,
      title: item.title,
      bodyMarkdown: item.bodyMarkdown,
      videoS3Key: item.videoS3Key,
      isPublished: item.isPublished
    })),
    visitorSessions: visitorSessions.map((item) => ({
      id: item.id,
      anonymousId: item.anonymousId,
      referrer: item.referrer,
      utmSource: item.utmSource,
      utmMedium: item.utmMedium,
      utmCampaign: item.utmCampaign,
      startedAt: toIso(item.startedAt),
      lastSeenAt: toIso(item.lastSeenAt)
    })),
    conversionEvents: conversionEvents.map((item) => ({
      id: item.id,
      visitorSessionId: item.visitorSessionId,
      userId: item.userId,
      caseId: item.caseId,
      propertyId: item.propertyId,
      eventType: item.eventType,
      metadata: item.metadata,
      createdAt: toIso(item.createdAt)
    })),
    auditLogs: auditLogs.map((item) => ({
      id: item.id,
      actorUserId: item.actorUserId,
      entityType: item.entityType,
      entityId: item.entityId,
      action: item.action,
      before: item.before,
      after: item.after,
      createdAt: toIso(item.createdAt)
    }))
  };
}

export async function writePrismaState(prisma, data) {
  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany();
    await tx.conversionEvent.deleteMany();
    await tx.visitorSession.deleteMany();
    await tx.cmsContent.deleteMany();
    await tx.internalNote.deleteMany();
    await tx.message.deleteMany();
    await tx.conversationParticipant.deleteMany();
    await tx.conversation.deleteMany();
    await tx.paymentWebhookEvent.deleteMany();
    await tx.payment.deleteMany();
    await tx.caseEvent.deleteMany();
    await tx.case.deleteMany();
    await tx.propertyPrivateDetail.deleteMany();
    await tx.propertyMedia.deleteMany();
    await tx.property.deleteMany();
    await tx.authIdentity.deleteMany();
    await tx.userRole.deleteMany();
    await tx.user.deleteMany();
    await tx.serviceStage.deleteMany();
    await tx.role.deleteMany();

    await tx.role.createMany({ data: roleCodes.map((code) => ({ code })) });
    await tx.serviceStage.createMany({
      data: data.serviceStages.map((stage) => ({
        code: stage.code,
        name: stage.name,
        sortOrder: stage.sortOrder,
        priceMxn: stage.priceMxn,
        description: stage.description || "",
        isActive: true
      }))
    });
    await tx.user.createMany({
      data: data.users.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone || null,
        gender: user.gender || "UNSPECIFIED",
        status: user.status,
        passwordSalt: user.salt,
        passwordHash: user.passwordHash,
        createdAt: new Date(user.createdAt)
      }))
    });
    await tx.userRole.createMany({
      data: data.users.flatMap((user) => (user.roles || []).map((roleCode) => ({
        userId: user.id,
        roleCode
      })))
    });
    await tx.authIdentity.createMany({
      data: data.authIdentities.map((identity) => compact({
        id: identity.id,
        userId: identity.userId,
        provider: identity.provider,
        providerSubject: identity.providerSubject,
        lastLoginAt: identity.lastLoginAt ? new Date(identity.lastLoginAt) : null
      }))
    });
    await tx.property.createMany({
      data: data.properties.map((property) => ({
        id: property.id,
        slug: property.slug,
        title: property.title,
        state: property.state,
        city: property.city,
        zoneLabel: property.zoneLabel,
        estimatedValueMxn: property.estimatedValueMxn,
        legalBidMxn: property.legalBidMxn,
        discountPct: property.discountPct,
        auctionRound: property.auctionRound,
        shortDescription: property.shortDescription,
        publicStatus: property.publicStatus,
        featured: property.featured,
        tags: property.tags || [],
        heroTone: property.heroTone || "navy",
        imageAccent: property.imageAccent || "#1d4ed8",
        publishedAt: property.publishedAt ? new Date(property.publishedAt) : null
      }))
    });
    await tx.propertyPrivateDetail.createMany({
      data: data.properties.map((property) => ({
        propertyId: property.id,
        fullAddress: property.fullAddress || "",
        courtName: property.courtName || null,
        fileNumber: property.fileNumber || null,
        auctionDate: dateOnly(property.auctionDate),
        auctionTime: property.auctionTime || null,
        occupancyStatus: property.occupancyStatus || null,
        legalSummary: property.legalSummary || null,
        riskNotes: property.riskNotes || null,
        internalNotes: property.internalNotes || null
      }))
    });
    await tx.case.createMany({
      data: data.cases.map((item) => ({
        id: item.id,
        userId: item.userId,
        propertyId: item.propertyId,
        status: item.status,
        currentStage: item.currentStage,
        assignedStaffUserId: item.assignedStaffUserId || null,
        leadSource: item.leadSource || null,
        utmSource: item.utmSource || null,
        utmMedium: item.utmMedium || null,
        utmCampaign: item.utmCampaign || null,
        createdAt: new Date(item.createdAt),
        lastActivityAt: new Date(item.lastActivityAt)
      }))
    });
    await tx.caseEvent.createMany({
      data: data.caseEvents.map((item) => ({
        id: item.id,
        caseId: item.caseId,
        eventType: item.eventType,
        actorUserId: item.actorUserId || null,
        metadata: item.metadata || {},
        createdAt: new Date(item.createdAt)
      }))
    });
    await tx.payment.createMany({
      data: data.payments.map((item) => ({
        id: item.id,
        caseId: item.caseId,
        stageCode: item.stageCode,
        provider: item.provider,
        amountMxn: item.amountMxn,
        currency: item.currency || "MXN",
        status: item.status,
        providerPreferenceId: item.providerPreferenceId || null,
        providerPaymentId: item.providerPaymentId || null,
        checkoutUrl: item.checkoutUrl || null,
        paidAt: item.paidAt ? new Date(item.paidAt) : null,
        createdAt: new Date(item.createdAt)
      }))
    });
    await tx.paymentWebhookEvent.createMany({ data: (data.paymentWebhookEvents || []).map((item) => ({
      id: item.id,
      providerEventId: item.providerEventId,
      eventType: item.eventType,
      payload: item.payload || {},
      processingStatus: item.processingStatus || "RECEIVED",
      processedAt: item.processedAt ? new Date(item.processedAt) : null,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
    })) });
    await tx.conversation.createMany({ data: data.conversations.map((item) => ({
      id: item.id,
      caseId: item.caseId,
      status: item.status,
      lastMessageAt: item.lastMessageAt ? new Date(item.lastMessageAt) : null
    })) });
    await tx.conversationParticipant.createMany({ data: data.conversationParticipants });
    await tx.message.createMany({ data: data.messages.map((item) => ({
      id: item.id,
      conversationId: item.conversationId,
      senderUserId: item.senderUserId,
      body: item.body,
      attachments: item.attachments || [],
      readAt: item.readAt ? new Date(item.readAt) : null,
      createdAt: new Date(item.createdAt)
    })) });
    await tx.internalNote.createMany({ data: data.internalNotes.map((item) => ({
      id: item.id,
      caseId: item.caseId,
      authorUserId: item.authorUserId,
      body: item.body,
      createdAt: new Date(item.createdAt)
    })) });
    await tx.cmsContent.createMany({ data: data.cmsContent.map((item) => ({
      id: item.id,
      contentKey: item.contentKey,
      title: item.title,
      bodyMarkdown: item.bodyMarkdown,
      videoS3Key: item.videoS3Key || null,
      isPublished: item.isPublished
    })) });
    await tx.visitorSession.createMany({ data: data.visitorSessions.map((item) => ({
      id: item.id,
      anonymousId: item.anonymousId,
      referrer: item.referrer || null,
      utmSource: item.utmSource || null,
      utmMedium: item.utmMedium || null,
      utmCampaign: item.utmCampaign || null,
      startedAt: new Date(item.startedAt),
      lastSeenAt: new Date(item.lastSeenAt)
    })) });
    await tx.conversionEvent.createMany({ data: data.conversionEvents.map((item) => ({
      id: item.id,
      visitorSessionId: item.visitorSessionId || null,
      userId: item.userId || null,
      caseId: item.caseId || null,
      propertyId: item.propertyId || null,
      eventType: item.eventType,
      metadata: item.metadata || {},
      createdAt: new Date(item.createdAt)
    })) });
    await tx.auditLog.createMany({ data: data.auditLogs.map((item) => ({
      id: item.id,
      actorUserId: item.actorUserId || null,
      entityType: item.entityType,
      entityId: item.entityId,
      action: item.action,
      before: item.before || null,
      after: item.after || null,
      createdAt: new Date(item.createdAt)
    })) });
  });
}

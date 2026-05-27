import { createSeedData } from "./seed.js";
import { getPrisma, hasDatabaseUrl } from "./prisma-client.js";
import { readPrismaState, writePrismaState } from "./prisma-state.js";
import { describeSeedTarget, ensureSeedFile, readSeedFile, writeSeedData } from "./json-store.js";
import { assignPropertyDisplayIds } from "../utils/property-display-id.js";
import { normalizeTextTree } from "../utils/text-normalization.js";

function normalizeData(data) {
  const normalized = normalizeTextTree(data);
  const serviceStages = normalized.serviceStages || [];
  const users = normalized.users || [];
  const properties = assignPropertyDisplayIds(normalized.properties || []);
  const stageCodes = new Set(serviceStages.map((stage) => stage.code));
  const userIds = new Set(users.map((user) => user.id));
  const propertyIds = new Set(properties.map((property) => property.id));
  const cases = (normalized.cases || []).filter((caseRecord) => (
    userIds.has(caseRecord.userId) &&
    propertyIds.has(caseRecord.propertyId) &&
    (!caseRecord.assignedStaffUserId || userIds.has(caseRecord.assignedStaffUserId))
  ));
  const caseIds = new Set(cases.map((caseRecord) => caseRecord.id));
  const authIdentities = (normalized.authIdentities || []).filter((identity) => userIds.has(identity.userId));
  const passwordResetTokens = (normalized.passwordResetTokens || []).filter((token) => userIds.has(token.userId));
  const caseEvents = (normalized.caseEvents || []).filter((event) => (
    caseIds.has(event.caseId) && (!event.actorUserId || userIds.has(event.actorUserId))
  ));
  const payments = (normalized.payments || []).filter((payment) => (
    caseIds.has(payment.caseId) && stageCodes.has(payment.stageCode)
  ));
  const conversations = (normalized.conversations || []).filter((conversation) => caseIds.has(conversation.caseId));
  const conversationIds = new Set(conversations.map((conversation) => conversation.id));
  const conversationParticipants = (normalized.conversationParticipants || []).filter((participant) => (
    conversationIds.has(participant.conversationId) && userIds.has(participant.userId)
  ));
  const messages = (normalized.messages || []).filter((message) => (
    conversationIds.has(message.conversationId) && userIds.has(message.senderUserId)
  ));
  const internalNotes = (normalized.internalNotes || []).filter((note) => (
    caseIds.has(note.caseId) && userIds.has(note.authorUserId)
  ));
  const visitorSessions = normalized.visitorSessions || [];
  const visitorSessionIds = new Set(visitorSessions.map((session) => session.id));
  const conversionEvents = (normalized.conversionEvents || []).filter((event) => (
    (!event.userId || userIds.has(event.userId)) &&
    (!event.propertyId || propertyIds.has(event.propertyId)) &&
    (!event.caseId || caseIds.has(event.caseId)) &&
    (!event.visitorSessionId || visitorSessionIds.has(event.visitorSessionId))
  ));
  const auditLogs = (normalized.auditLogs || []).filter((log) => !log.actorUserId || userIds.has(log.actorUserId));

  return {
    ...normalized,
    serviceStages,
    users,
    authIdentities,
    passwordResetTokens,
    properties,
    cases,
    caseEvents,
    payments,
    conversations,
    conversationParticipants,
    messages,
    internalNotes,
    visitorSessions,
    conversionEvents,
    auditLogs
  };
}

export async function ensureDb() {
  const prisma = await getPrisma();
  if (prisma) {
    const roleCount = await prisma.role.count();
    if (roleCount === 0) {
      await writePrismaState(prisma, createSeedData());
    }
    return;
  }

  await ensureSeedFile();
}

export async function readDb() {
  const prisma = await getPrisma();
  if (prisma) {
    await ensureDb();
    return normalizeData(await readPrismaState(prisma));
  }

  return normalizeData(await readSeedFile());
}

export async function writeDb(data) {
  const normalized = normalizeData(data);
  const prisma = await getPrisma();
  if (prisma) {
    await writePrismaState(prisma, normalized);
    return normalized;
  }

  return writeSeedData(normalized);
}

export async function mutateDb(mutator) {
  const db = await readDb();
  const updated = await mutator(structuredClone(db));
  await writeDb(updated);
  return updated;
}

export async function resetDb() {
  const prisma = await getPrisma();
  if (prisma) {
    const seed = normalizeData(createSeedData());
    await writePrismaState(prisma, seed);
    return seed;
  }

  return writeSeedData(normalizeData(createSeedData()));
}

if (process.argv.includes("--reset")) {
  await resetDb();
  const target = hasDatabaseUrl() ? "RDS PostgreSQL" : describeSeedTarget();
  process.stdout.write(`Demo database reset at ${target}\n`);
}

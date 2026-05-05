import crypto from "node:crypto";

export function randomId(prefix = "id") {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

export function sanitizeText(value = "", maxLength = 2000) {
  return String(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const normalized = String(password || "");
  const hash = crypto.pbkdf2Sync(normalized, salt, 100000, 64, "sha512").toString("hex");
  return { salt, hash };
}

export function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createSignedToken(payload, secret, expiresInSeconds = 60 * 60 * 12) {
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(body));
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifySignedToken(token, secret) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");

  if (signature !== expectedSignature) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

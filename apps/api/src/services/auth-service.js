import { config } from "../config.js";
import { createSignedToken, normalizeEmail, randomId, sanitizeText, verifyPassword, hashPassword } from "../utils/security.js";

const STAFF_ROLES = new Set(["SALES", "LEGAL", "FINANCE", "CONTENT", "ADMIN"]);

export function createAuthResponse(user) {
  const token = createSignedToken(
    {
      sub: user.id,
      email: user.email,
      roles: user.roles
    },
    config.jwtSecret
  );

  return {
    token,
    user: exposeUser(user)
  };
}

export function exposeUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    gender: user.gender || "UNSPECIFIED",
    phone: user.phone,
    status: user.status,
    roles: user.roles
  };
}

export function isStaff(user) {
  return Boolean(user?.roles?.some((role) => STAFF_ROLES.has(role)));
}

export function hasAnyRole(user, roles = []) {
  return Boolean(user?.roles?.some((role) => roles.includes(role)));
}

export function registerUser(db, payload) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const fullName = sanitizeText(payload.fullName || "", 120);
  const gender = ["FEMALE", "MALE", "UNSPECIFIED"].includes(payload.gender) ? payload.gender : "UNSPECIFIED";
  const phone = sanitizeText(payload.phone || "", 40);

  if (!email || !password || password.length < 8 || !fullName) {
    throw new Error("Datos de registro inválidos");
  }

  if (db.users.some((user) => user.email === email)) {
    throw new Error("Este correo ya está registrado");
  }

  const { salt, hash } = hashPassword(password);
  const user = {
    id: randomId("usr"),
    email,
    fullName,
    gender,
    phone,
    status: "ACTIVE",
    roles: ["CLIENT"],
    salt,
    passwordHash: hash,
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  db.authIdentities.push({
    id: randomId("auth"),
    userId: user.id,
    provider: "email",
    providerSubject: email
  });

  return user;
}

export function loginUser(db, payload) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const user = db.users.find((candidate) => candidate.email === email);

  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    throw new Error("Credenciales inválidas");
  }

  return user;
}

export function socialDemoLogin(db, provider) {
  const normalizedProvider = String(provider || "").toLowerCase();

  if (!["google", "facebook"].includes(normalizedProvider)) {
    throw new Error("Proveedor social no soportado");
  }

  const email = `${normalizedProvider}.demo@remates.mx`;
  let user = db.users.find((candidate) => candidate.email === email);

  if (!user) {
    const { salt, hash } = hashPassword("SocialDemo123!");
    user = {
      id: randomId("usr"),
      email,
      fullName: normalizedProvider === "google" ? "Cliente Google" : "Cliente Facebook",
      gender: "UNSPECIFIED",
      phone: "+52 55 0000 0000",
      status: "ACTIVE",
      roles: ["CLIENT"],
      salt,
      passwordHash: hash,
      createdAt: new Date().toISOString()
    };

    db.users.push(user);
    db.authIdentities.push({
      id: randomId("auth"),
      userId: user.id,
      provider: normalizedProvider,
      providerSubject: email
    });
  }

  return user;
}

export function authProviders() {
  const cognitoConfigured = config.authMode === "cognito" && config.cognitoDomain && config.cognitoClientId;

  return {
    mode: config.authMode,
    cognitoConfigured,
    providers: {
      google: cognitoConfigured
        ? `${config.cognitoDomain}/oauth2/authorize?identity_provider=Google&response_type=code&client_id=${encodeURIComponent(config.cognitoClientId)}&redirect_uri=${encodeURIComponent(config.cognitoRedirectUri)}&scope=${encodeURIComponent("openid email profile")}`
        : null,
      facebook: cognitoConfigured
        ? `${config.cognitoDomain}/oauth2/authorize?identity_provider=Facebook&response_type=code&client_id=${encodeURIComponent(config.cognitoClientId)}&redirect_uri=${encodeURIComponent(config.cognitoRedirectUri)}&scope=${encodeURIComponent("openid email profile")}`
        : null
    },
    demoFallback: true
  };
}

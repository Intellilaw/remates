import "./utils/load-env.js";

const localApiProxyDisabled = ["1", "true", "yes"].includes(String(process.env.DISABLE_LOCAL_API_PROXY || "").toLowerCase());

export const config = {
  port: Number(process.env.PORT || 3000),
  appEnv: process.env.APP_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "demo-secret-change-me",
  authMode: process.env.AUTH_MODE || "demo",
  cognitoDomain: process.env.COGNITO_DOMAIN || "",
  cognitoClientId: process.env.COGNITO_CLIENT_ID || "",
  cognitoRedirectUri: process.env.COGNITO_REDIRECT_URI || "http://localhost:3000/auth/callback",
  mercadoPagoMode: process.env.MERCADO_PAGO_MODE || "mock",
  mercadoPagoAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
  mercadoPagoWebhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiExtractionModel: process.env.OPENAI_EXTRACTION_MODEL || "gpt-4.1-mini",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
  localApiProxyUrl: localApiProxyDisabled ? "" : process.env.LOCAL_API_PROXY_URL || "",
  publicWebUrl: process.env.PUBLIC_WEB_URL || "http://localhost:3000",
  publicAdminUrl: process.env.PUBLIC_ADMIN_URL || "http://localhost:3000/admin"
};

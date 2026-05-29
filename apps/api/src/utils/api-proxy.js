import http from "node:http";
import https from "node:https";
import fs from "node:fs/promises";
import path from "node:path";
import { buildFallbackLocationImage } from "../services/property-location-image-service.js";
import { normalizeTextTree } from "./text-normalization.js";

const overrideFilePath = path.join(process.cwd(), ".remates-local-proxy-overrides.json");
const PUBLIC_PROPERTY_STATUS_ALIASES = {
  PUBLISHED: "PUBLISHED",
  PUBLICADO: "PUBLISHED",
  SOLD: "SOLD",
  VENDIDO: "SOLD",
  DELIVERED: "DELIVERED",
  ENTREGADO: "DELIVERED"
};
const PUBLIC_PROPERTY_STATUSES = new Set(["PUBLISHED", "SOLD", "DELIVERED"]);

export async function proxyApiRequest(req, res, upstreamBaseUrl) {
  const propertyDeleteMatch = req.url.match(/^\/api\/admin\/properties\/([^/?#]+)/);
  if (req.method === "DELETE" && propertyDeleteMatch) {
    return proxyPropertyDelete(req, res, upstreamBaseUrl, decodeURIComponent(propertyDeleteMatch[1]));
  }

  const upstream = new URL(req.url, upstreamBaseUrl);
  const transport = upstream.protocol === "https:" ? https : http;
  const headers = { ...req.headers, host: upstream.host };

  delete headers["content-length"];
  delete headers["accept-encoding"];

  const proxyReq = transport.request(
    upstream,
    {
      method: req.method,
      headers
    },
    (proxyRes) => {
      const contentType = String(proxyRes.headers["content-type"] || "");
      if (!contentType.includes("application/json")) {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
        return;
      }

      const chunks = [];
      proxyRes.on("data", (chunk) => chunks.push(chunk));
      proxyRes.on("end", async () => {
        const responseHeaders = { ...proxyRes.headers };
        delete responseHeaders["content-length"];
        try {
          const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          const normalizedPayload = normalizeTextTree(payload);
          const overrideResult = await applyLocalProxyOverrides(req.url, normalizedPayload, proxyRes.statusCode || 502, req.method);
          res.writeHead(overrideResult.statusCode, {
            ...responseHeaders,
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
          });
          res.end(JSON.stringify(overrideResult.payload));
        } catch {
          res.writeHead(proxyRes.statusCode || 502, responseHeaders);
          res.end(Buffer.concat(chunks));
        }
      });
    }
  );

  proxyReq.on("error", (error) => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    }
    res.end(JSON.stringify({ error: "API proxy error", detail: error.message }));
  });

  req.pipe(proxyReq);
}

async function proxyPropertyDelete(req, res, upstreamBaseUrl, propertyId) {
  try {
    const result = await requestUpstream(req, upstreamBaseUrl, req.url, { method: "DELETE" });
    if (result.statusCode < 400) {
      await forgetHiddenProperty(propertyId);
      res.writeHead(result.statusCode, withoutContentLength(result.headers));
      res.end(result.body);
      return;
    }

    const bodyText = result.body.toString("utf8");
    if (!isConversionEventForeignKeyError(bodyText)) {
      res.writeHead(result.statusCode, withoutContentLength(result.headers));
      res.end(result.body);
      return;
    }

    await requestUpstream(req, upstreamBaseUrl, `/api/admin/properties/${encodeURIComponent(propertyId)}`, {
      method: "PATCH",
      body: JSON.stringify({ publicStatus: "ARCHIVED", featured: false })
    });
    await rememberHiddenProperty(propertyId);
    res.writeHead(204, { "Cache-Control": "no-store" });
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    }
    res.end(JSON.stringify({ error: "API proxy error", detail: error.message }));
  }
}

function requestUpstream(req, upstreamBaseUrl, requestPath, { method, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const upstream = new URL(requestPath, upstreamBaseUrl);
    const transport = upstream.protocol === "https:" ? https : http;
    const headers = { ...req.headers, host: upstream.host };

    delete headers["accept-encoding"];
    delete headers["content-length"];

    if (body !== null) {
      headers["content-type"] = "application/json";
      headers["content-length"] = Buffer.byteLength(body);
    }

    const upstreamReq = transport.request(upstream, { method, headers }, (upstreamRes) => {
      const chunks = [];
      upstreamRes.on("data", (chunk) => chunks.push(chunk));
      upstreamRes.on("end", () => {
        resolve({
          statusCode: upstreamRes.statusCode || 502,
          headers: upstreamRes.headers,
          body: Buffer.concat(chunks)
        });
      });
    });

    upstreamReq.on("error", reject);
    if (body !== null) {
      upstreamReq.end(body);
    } else {
      upstreamReq.end();
    }
  });
}

function isConversionEventForeignKeyError(bodyText) {
  return bodyText.includes("conversion_events_property_id_fkey") ||
    bodyText.includes("conversionEvent.createMany") ||
    bodyText.includes("Foreign key constraint");
}

function withoutContentLength(headers) {
  const cleaned = { ...headers };
  delete cleaned["content-length"];
  return cleaned;
}

async function readOverrides() {
  try {
    return JSON.parse(await fs.readFile(overrideFilePath, "utf8"));
  } catch {
    return { hiddenPropertyIds: [], cachedAdminProperties: [] };
  }
}

async function writeOverrides(overrides) {
  await fs.writeFile(overrideFilePath, `${JSON.stringify(overrides, null, 2)}\n`);
}

async function rememberHiddenProperty(propertyId) {
  const overrides = await readOverrides();
  const hiddenPropertyIds = new Set(overrides.hiddenPropertyIds || []);
  hiddenPropertyIds.add(propertyId);
  await writeOverrides({ ...overrides, hiddenPropertyIds: [...hiddenPropertyIds] });
}

async function forgetHiddenProperty(propertyId) {
  const overrides = await readOverrides();
  const hiddenPropertyIds = (overrides.hiddenPropertyIds || []).filter((id) => id !== propertyId);
  if (hiddenPropertyIds.length !== (overrides.hiddenPropertyIds || []).length) {
    await writeOverrides({ ...overrides, hiddenPropertyIds });
  }
}

async function applyLocalProxyOverrides(requestUrl, payload, statusCode = 200, requestMethod = "GET") {
  if (!payload || typeof payload !== "object") {
    return { statusCode, payload };
  }

  const pathname = new URL(requestUrl, "http://localhost").pathname;
  const overrides = await readOverrides();
  const hiddenPropertyIds = new Set(overrides.hiddenPropertyIds || []);
  let nextPayload = payload;

  if ((pathname === "/api/admin/properties" || pathname === "/api/properties") && Array.isArray(nextPayload.items)) {
    nextPayload = {
      ...nextPayload,
      items: nextPayload.items.filter((property) => !hiddenPropertyIds.has(property.id))
    };
  }

  if (pathname === "/api/admin/properties" && Array.isArray(nextPayload.items)) {
    await writeOverrides({
      ...overrides,
      cachedAdminProperties: nextPayload.items
    });
    return { statusCode, payload: nextPayload };
  }

  const adminPropertyMatch = pathname.match(/^\/api\/admin\/properties\/([^/]+)$/);
  if (requestMethod === "PATCH" && adminPropertyMatch && nextPayload.item?.id) {
    const cachedAdminProperties = upsertCachedAdminProperty(overrides.cachedAdminProperties || [], nextPayload.item);
    await writeOverrides({
      ...overrides,
      cachedAdminProperties
    });
    return { statusCode, payload: nextPayload };
  }

  if (pathname === "/api/properties" && Array.isArray(nextPayload.items)) {
    const merged = new Map(nextPayload.items.map((property) => [property.id, toPublicProperty(property)]));
    for (const property of overrides.cachedAdminProperties || []) {
      if (!hiddenPropertyIds.has(property.id) && isPublicProperty(property)) {
        merged.set(property.id, toPublicProperty(property));
      }
    }

    return {
      statusCode,
      payload: {
        ...nextPayload,
        items: [...merged.values()]
          .filter((property) => !hiddenPropertyIds.has(property.id) && isPublicProperty(property))
          .sort((left, right) => Number(right.featured) - Number(left.featured))
      }
    };
  }

  const publicPropertyMatch = pathname.match(/^\/api\/properties\/([^/]+)$/);
  if (publicPropertyMatch) {
    const slug = decodeURIComponent(publicPropertyMatch[1]);
    const cachedProperty = (overrides.cachedAdminProperties || []).find((property) => (
      property.slug === slug && !hiddenPropertyIds.has(property.id) && isPublicProperty(property)
    ));
    if (cachedProperty) {
      const item = toPublicProperty(cachedProperty);
      return {
        statusCode: 200,
        payload: {
          item,
          gated: true,
          entitlements: item.visibility
        }
      };
    }
    if (nextPayload.item?.id && isPublicProperty(nextPayload.item)) {
      const item = toPublicProperty(nextPayload.item);
      return {
        statusCode,
        payload: {
          ...nextPayload,
          item,
          entitlements: item.visibility
        }
      };
    }
  }

  if (nextPayload.item?.id && hiddenPropertyIds.has(nextPayload.item.id)) {
    return {
      statusCode: 404,
      payload: { error: "Inmueble no encontrado" }
    };
  }

  return { statusCode, payload: nextPayload };
}

function upsertCachedAdminProperty(properties, updatedProperty) {
  const index = properties.findIndex((property) => property.id === updatedProperty.id);
  if (index === -1) {
    return [updatedProperty, ...properties];
  }

  return properties.map((property, propertyIndex) => (
    propertyIndex === index ? { ...property, ...updatedProperty } : property
  ));
}

function normalizePublicPropertyStatus(status) {
  return PUBLIC_PROPERTY_STATUS_ALIASES[String(status || "").toUpperCase()] || String(status || "").toUpperCase();
}

function isPublicProperty(property) {
  return PUBLIC_PROPERTY_STATUSES.has(normalizePublicPropertyStatus(property.publicStatus));
}

function toPublicProperty(property) {
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
    discountPct: property.discountPct,
    auctionRound: property.auctionRound,
    shortDescription: property.shortDescription,
    publicStatus: normalizePublicPropertyStatus(property.publicStatus),
    featured: Boolean(property.featured),
    tags: property.tags || [],
    heroTone: property.heroTone || "cobalt",
    imageAccent: property.imageAccent || "#2563eb",
    locationImage: toPublicLocationImage(property.locationImage || buildFallbackLocationImage(property)),
    publishedAt: property.publishedAt || null,
    auctionDate: property.auctionDate || null,
    auctionTime: property.auctionTime || "",
    fullAddress: property.fullAddress || "",
    visibility: {
      showAuctionDate: true,
      showAuctionTime: true,
      showFullAddress: true,
      showCourtAndTime: false,
      showFullDetails: false
    }
  };
}

function toPublicLocationImage(locationImage) {
  if (!locationImage) {
    return null;
  }

  const { endpoint, params, ...safeImage } = locationImage;
  const imageUrl = safeImage.imageUrl || buildGoogleImageUrl(endpoint, params);
  return {
    ...safeImage,
    imageUrl
  };
}

function buildGoogleImageUrl(endpoint, params) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || "";
  if (!endpoint || !params || !apiKey) {
    return "";
  }

  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  url.searchParams.set("key", apiKey);
  return url.toString();
}

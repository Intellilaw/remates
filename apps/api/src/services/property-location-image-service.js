import { config } from "../config.js";
import { sanitizeText } from "../utils/security.js";

const GOOGLE_GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";
const GOOGLE_STREET_VIEW_ENDPOINT = "https://maps.googleapis.com/maps/api/streetview";
const GOOGLE_STREET_VIEW_METADATA_ENDPOINT = "https://maps.googleapis.com/maps/api/streetview/metadata";
const GOOGLE_STATIC_MAP_ENDPOINT = "https://maps.googleapis.com/maps/api/staticmap";

export const LOCATION_IMAGE_DISCLAIMER = "Imagen obtenida de Google. Puede no corresponder de manera exacta al inmueble rematado.";
const FALLBACK_IMAGE_DISCLAIMER = "Imagen de referencia generada por la plataforma. Puede no corresponder de manera exacta al inmueble rematado.";

export async function resolveLocationImage(property) {
  if (!config.googleMapsApiKey) {
    return buildFallbackLocationImage(property, "MISSING_GOOGLE_MAPS_API_KEY");
  }

  const candidates = buildGeocodeCandidates(property);
  if (!candidates.length) {
    return buildFallbackLocationImage(property, "MISSING_ADDRESS");
  }

  try {
    const geocode = await resolveBestGeocode(candidates);
    if (!geocode) {
      return buildFallbackLocationImage(property, "GEOCODE_ZERO_RESULTS");
    }

    const streetView = await resolveStreetViewImage(geocode);
    if (streetView) {
      return streetView;
    }

    return buildStaticMapImage(geocode);
  } catch (error) {
    return buildFallbackLocationImage(property, sanitizeText(error.message || "GOOGLE_MAPS_ERROR", 120));
  }
}

export function locationImageKey(property) {
  return [
    property.fullAddress,
    property.zoneLabel,
    property.city,
    property.state
  ].map((value) => sanitizeText(value || "", 240).toLowerCase()).join("|");
}

function buildGeocodeCandidates(property) {
  const fullAddress = sanitizeText(property.fullAddress || "", 240);
  const zoneLabel = sanitizeText(property.zoneLabel || "", 120);
  const city = sanitizeText(property.city || "", 80);
  const state = sanitizeText(property.state || "", 80);
  const country = "México";

  return uniqueTexts([
    [fullAddress, city, state, country].filter(Boolean).join(", "),
    [zoneLabel, city, state, country].filter(Boolean).join(", "),
    [city, state, country].filter(Boolean).join(", ")
  ]).filter((candidate) => candidate.length >= 8);
}

async function resolveBestGeocode(candidates) {
  let lastStatus = "";
  for (const [index, query] of candidates.entries()) {
    const result = await geocodeAddress(query);
    lastStatus = result.status;
    if (result.item) {
      return {
        ...result.item,
        requestedAddress: query,
        usedFallbackQuery: index > 0
      };
    }
    if (["REQUEST_DENIED", "OVER_DAILY_LIMIT", "OVER_QUERY_LIMIT", "INVALID_REQUEST"].includes(result.status)) {
      break;
    }
  }

  if (lastStatus && lastStatus !== "ZERO_RESULTS") {
    return null;
  }
  return null;
}

async function geocodeAddress(address) {
  const data = await fetchGoogleJson(GOOGLE_GEOCODE_ENDPOINT, {
    address,
    components: "country:MX",
    key: config.googleMapsApiKey
  });

  if (data.status !== "OK" || !Array.isArray(data.results) || !data.results.length) {
    return { status: data.status || "UNKNOWN", item: null };
  }

  const result = data.results[0];
  const location = result.geometry?.location;
  if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) {
    return { status: "NO_LOCATION", item: null };
  }

  return {
    status: data.status,
    item: {
      lat: Number(location.lat),
      lng: Number(location.lng),
      formattedAddress: sanitizeText(result.formatted_address || address, 260),
      locationType: sanitizeText(result.geometry?.location_type || "UNKNOWN", 40),
      partialMatch: Boolean(result.partial_match)
    }
  };
}

async function resolveStreetViewImage(geocode) {
  const metadata = await fetchGoogleJson(GOOGLE_STREET_VIEW_METADATA_ENDPOINT, {
    location: coordinates(geocode),
    radius: "90",
    source: "outdoor",
    key: config.googleMapsApiKey
  });

  if (metadata.status !== "OK") {
    return null;
  }

  return buildLocationImage({
    provider: "GOOGLE_STREET_VIEW",
    imageKind: "street_view",
    sourceLabel: "Google Street View",
    endpoint: GOOGLE_STREET_VIEW_ENDPOINT,
    params: {
      size: "640x360",
      location: coordinates(geocode),
      radius: "90",
      source: "outdoor",
      fov: "80",
      pitch: "0"
    },
    geocode,
    panoramaId: sanitizeText(metadata.pano_id || "", 120)
  });
}

function buildStaticMapImage(geocode) {
  const marker = coordinates(geocode);
  const zoom = isPreciseMatch(geocode) ? "19" : "16";
  return buildLocationImage({
    provider: "GOOGLE_MAPS_STATIC",
    imageKind: "satellite_map",
    sourceLabel: "Google Maps",
    endpoint: GOOGLE_STATIC_MAP_ENDPOINT,
    params: {
      center: marker,
      zoom,
      size: "640x360",
      scale: "2",
      maptype: "satellite",
      markers: `color:red|${marker}`
    },
    geocode
  });
}

export function buildFallbackLocationImage(property, reason = "MISSING_LOCATION_IMAGE") {
  const title = sanitizeText(property.title || "Remate inmobiliario", 90);
  const address = sanitizeText(property.fullAddress || "", 150);
  const location = sanitizeText([property.zoneLabel, property.city, property.state].filter(Boolean).join(", "), 130);
  const label = address || location || "Ubicación por confirmar";
  const svg = fallbackSvg(title, label);

  return {
    provider: "LOCAL_FALLBACK",
    imageKind: "fallback",
    sourceLabel: "Imagen de referencia",
    imageUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    attribution: "Remates Inmobiliarios México",
    disclaimer: FALLBACK_IMAGE_DISCLAIMER,
    matchStatus: "FALLBACK",
    geocodeLocationType: "",
    geocodePartialMatch: false,
    resolvedAddress: label,
    requestedAddress: address,
    fallbackReason: reason,
    generatedAt: property.publishedAt || new Date().toISOString()
  };
}

function buildLocationImage({ provider, imageKind, sourceLabel, endpoint, params, geocode, panoramaId = "" }) {
  return {
    provider,
    imageKind,
    sourceLabel,
    endpoint,
    params,
    attribution: "Google",
    disclaimer: LOCATION_IMAGE_DISCLAIMER,
    matchStatus: isPreciseMatch(geocode) ? "PRECISE" : "APPROXIMATE",
    geocodeLocationType: geocode.locationType,
    geocodePartialMatch: geocode.partialMatch,
    resolvedAddress: geocode.formattedAddress,
    requestedAddress: geocode.requestedAddress,
    panoramaId,
    generatedAt: new Date().toISOString()
  };
}

function fallbackSvg(title, label) {
  const safeTitle = escapeXml(title);
  const safeLabel = escapeXml(label);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-label="${safeTitle}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f766e"/>
      <stop offset="0.55" stop-color="#2563eb"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="building" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f8fafc"/>
      <stop offset="1" stop-color="#cbd5e1"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#sky)"/>
  <path d="M0 525 C180 470 280 560 430 508 C590 454 680 510 840 482 C1010 452 1110 510 1280 466 L1280 720 L0 720 Z" fill="#0f172a" opacity="0.45"/>
  <g transform="translate(360 165)">
    <rect x="70" y="125" width="440" height="350" rx="12" fill="url(#building)" opacity="0.96"/>
    <path d="M40 165 L290 40 L540 165 Z" fill="#1f2937"/>
    <rect x="245" y="325" width="90" height="150" rx="8" fill="#334155"/>
    <g fill="#1d4ed8" opacity="0.78">
      <rect x="125" y="185" width="72" height="62" rx="8"/>
      <rect x="255" y="185" width="72" height="62" rx="8"/>
      <rect x="385" y="185" width="72" height="62" rx="8"/>
      <rect x="125" y="280" width="72" height="62" rx="8"/>
      <rect x="385" y="280" width="72" height="62" rx="8"/>
    </g>
  </g>
  <g opacity="0.24" fill="#ffffff">
    <circle cx="1010" cy="122" r="54"/>
    <path d="M1038 122c0 36-28 66-28 66s-28-30-28-66a28 28 0 1 1 56 0Z"/>
  </g>
  <title>${safeTitle}</title>
  <desc>${safeLabel}</desc>
</svg>`.trim();
}

function escapeXml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function fetchGoogleJson(endpoint, params) {
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Maps respondió con estado ${response.status}.`);
  }

  return response.json();
}

function coordinates(geocode) {
  return `${geocode.lat},${geocode.lng}`;
}

function isPreciseMatch(geocode) {
  return !geocode.usedFallbackQuery && !geocode.partialMatch && geocode.locationType === "ROOFTOP";
}

function uniqueTexts(values) {
  const seen = new Set();
  return values.filter((value) => {
    const text = sanitizeText(value || "", 300);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

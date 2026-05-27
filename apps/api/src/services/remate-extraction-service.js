import { config } from "../config.js";
import { sanitizeText } from "../utils/security.js";

const MAX_IMAGE_BYTES = 7 * 1024 * 1024;

const MONTHS = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  septiembre: "09",
  setiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12"
};

const TARGET_FIELDS = [
  "courtName",
  "estimatedValueMxn",
  "legalBidMxn",
  "auctionDate",
  "fullAddress"
];

const REMATE_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "courtName",
    "estimatedValueMxn",
    "legalBidMxn",
    "legalBidWasComputed",
    "auctionDate",
    "auctionTime",
    "fullAddress",
    "state",
    "city",
    "zoneLabel",
    "title",
    "shortDescription",
    "confidence",
    "missingFields",
    "rawNotes"
  ],
  properties: {
    courtName: { type: ["string", "null"] },
    estimatedValueMxn: { type: ["number", "null"] },
    legalBidMxn: { type: ["number", "null"] },
    legalBidWasComputed: { type: "boolean" },
    auctionDate: {
      type: ["string", "null"],
      description: "Fecha del remate en formato YYYY-MM-DD."
    },
    auctionTime: {
      type: ["string", "null"],
      description: "Hora del remate si aparece en el edicto, en formato HH:mm cuando sea posible."
    },
    fullAddress: { type: ["string", "null"] },
    state: { type: ["string", "null"] },
    city: { type: ["string", "null"] },
    zoneLabel: { type: ["string", "null"] },
    title: { type: ["string", "null"] },
    shortDescription: { type: ["string", "null"] },
    confidence: {
      type: "object",
      additionalProperties: false,
      required: TARGET_FIELDS,
      properties: {
        courtName: { type: "number" },
        estimatedValueMxn: { type: "number" },
        legalBidMxn: { type: "number" },
        auctionDate: { type: "number" },
        fullAddress: { type: "number" }
      }
    },
    missingFields: {
      type: "array",
      items: { type: "string" }
    },
    rawNotes: { type: ["string", "null"] }
  }
};

export function assertSupportedImageDataUrl(imageDataUrl) {
  const value = String(imageDataUrl || "");
  const match = value.match(/^data:image\/(png|jpe?g|webp);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) {
    throw new Error("La foto debe enviarse como data URL base64 de imagen PNG, JPG o WebP");
  }

  const base64 = match[2].replace(/\s+/g, "");
  const bytes = Math.ceil((base64.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) {
    throw new Error("La foto es demasiado grande. Intenta recortarla o tomarla con menor resolucion.");
  }
}

export async function extractRemateFromImage({ imageDataUrl, textHint = "" }) {
  assertSupportedImageDataUrl(imageDataUrl);

  if (config.openaiApiKey) {
    return extractWithOpenAI({ imageDataUrl, textHint });
  }

  const fallback = extractFromTextHint(textHint);
  return normalizeExtraction({
    ...fallback,
    provider: "manual",
    rawNotes: fallback.rawNotes || "OPENAI_API_KEY no esta configurada; se genero una captura editable sin OCR automatico."
  });
}

async function extractWithOpenAI({ imageDataUrl, textHint }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.openaiExtractionModel,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "Eres un extractor de datos de edictos de remate judicial en México.",
                "Devuelve solo datos encontrados o inferidos con alta cautela.",
                "La postura legal debe ser el monto expresamente indicado; si no aparece, calcula dos terceras partes del valor de avalúo y marca legalBidWasComputed=true.",
                "Normaliza montos a numeros MXN sin comas ni simbolos.",
                "Normaliza fechas a YYYY-MM-DD y horas a HH:mm si aparecen.",
                "No inventes juzgado, direccion ni fecha si no son legibles."
              ].join(" ")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Extrae: juzgado del remate, valor de avalúo, postura legal, fecha del remate y dirección del inmueble.",
                "Tambien sugiere titulo, estado, ciudad, colonia y descripcion corta para publicar el inmueble.",
                textHint ? `Nota del usuario: ${sanitizeText(textHint, 1000)}` : ""
              ].filter(Boolean).join(" ")
            },
            {
              type: "input_image",
              image_url: imageDataUrl,
              detail: "high"
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "remate_extraction",
          strict: true,
          schema: REMATE_EXTRACTION_SCHEMA
        }
      }
    })
  });

  const payloadText = await response.text();
  let payload = null;
  try {
    payload = payloadText ? JSON.parse(payloadText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error?.message || payloadText || "No fue posible extraer la información del remate";
    throw new Error(message);
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error("El extractor no devolvió datos legibles");
  }

  let extracted;
  try {
    extracted = JSON.parse(outputText);
  } catch {
    throw new Error("El extractor devolvió un formato inválido");
  }

  return normalizeExtraction({
    ...extracted,
    provider: "openai",
    model: config.openaiExtractionModel
  });
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }

  for (const item of payload?.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return "";
}

function extractFromTextHint(textHint) {
  const text = sanitizeText(textHint || "", 4000);
  if (!text) {
    return emptyExtraction();
  }

  const estimatedValueMxn = findMoneyNear(text, ["avaluo", "avalúo", "valor"]);
  let legalBidMxn = findMoneyNear(text, ["postura legal", "postura", "sirva de postura"]);
  let legalBidWasComputed = false;
  if (!legalBidMxn && estimatedValueMxn) {
    legalBidMxn = computeLegalBid(estimatedValueMxn);
    legalBidWasComputed = true;
  }

  return {
    courtName: findCourtName(text),
    estimatedValueMxn,
    legalBidMxn,
    legalBidWasComputed,
    auctionDate: findDate(text),
    auctionTime: findTime(text),
    fullAddress: findAddress(text),
    state: findKnownState(text),
    city: null,
    zoneLabel: null,
    title: null,
    shortDescription: null,
    confidence: confidenceFromValues({
      courtName: findCourtName(text),
      estimatedValueMxn,
      legalBidMxn,
      auctionDate: findDate(text),
      fullAddress: findAddress(text)
    }),
    missingFields: [],
    rawNotes: "Extraccion aproximada desde texto auxiliar; revisar antes de publicar."
  };
}

function emptyExtraction() {
  return {
    courtName: null,
    estimatedValueMxn: null,
    legalBidMxn: null,
    legalBidWasComputed: false,
    auctionDate: null,
    auctionTime: null,
    fullAddress: null,
    state: null,
    city: null,
    zoneLabel: null,
    title: null,
    shortDescription: null,
    confidence: confidenceFromValues({}),
    missingFields: TARGET_FIELDS,
    rawNotes: null
  };
}

export function normalizeExtraction(value = {}) {
  const estimatedValueMxn = toMoneyNumber(value.estimatedValueMxn);
  let legalBidMxn = toMoneyNumber(value.legalBidMxn);
  let legalBidWasComputed = Boolean(value.legalBidWasComputed);

  if (!legalBidMxn && estimatedValueMxn) {
    legalBidMxn = computeLegalBid(estimatedValueMxn);
    legalBidWasComputed = true;
  }

  const normalized = {
    provider: value.provider || "unknown",
    model: value.model || null,
    courtName: nullableText(value.courtName, 180),
    estimatedValueMxn,
    legalBidMxn,
    legalBidWasComputed,
    auctionDate: normalizeDate(value.auctionDate),
    auctionTime: normalizeTime(value.auctionTime),
    fullAddress: nullableText(value.fullAddress, 240),
    state: nullableText(value.state, 80),
    city: nullableText(value.city, 80),
    zoneLabel: nullableText(value.zoneLabel, 120),
    title: nullableText(value.title, 120),
    shortDescription: nullableText(value.shortDescription, 240),
    confidence: normalizeConfidence(value.confidence),
    missingFields: Array.isArray(value.missingFields) ? value.missingFields.map((field) => sanitizeText(field, 80)).filter(Boolean) : [],
    rawNotes: nullableText(value.rawNotes, 500)
  };

  normalized.missingFields = uniqueMissingFields(normalized);
  return normalized;
}

export function computeLegalBid(estimatedValueMxn) {
  return Math.round((Number(estimatedValueMxn || 0) * 2) / 3);
}

function nullableText(value, maxLength) {
  const text = sanitizeText(value || "", maxLength);
  return text || null;
}

function normalizeConfidence(value = {}) {
  return Object.fromEntries(
    TARGET_FIELDS.map((field) => {
      const score = Number(value?.[field]);
      return [field, Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0];
    })
  );
}

function confidenceFromValues(values) {
  return Object.fromEntries(TARGET_FIELDS.map((field) => [field, values[field] ? 0.55 : 0]));
}

function uniqueMissingFields(value) {
  const missing = new Set(value.missingFields || []);
  for (const field of TARGET_FIELDS) {
    if (!value[field]) {
      missing.add(field);
    }
  }
  return [...missing];
}

function normalizeDate(value) {
  const text = sanitizeText(value || "", 40).toLowerCase();
  if (!text) {
    return null;
  }

  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const slash = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (slash) {
    const year = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    return `${year}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  }

  const spanish = text.match(/\b(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})\b/i);
  if (spanish) {
    const month = MONTHS[removeDiacritics(spanish[2])];
    if (month) {
      return `${spanish[3]}-${month}-${spanish[1].padStart(2, "0")}`;
    }
  }

  return null;
}

function normalizeTime(value) {
  const text = sanitizeText(value || "", 40);
  if (!text) {
    return null;
  }

  const match = text.match(/\b(\d{1,2})(?::| h | horas? ?)(\d{2})?\b/i);
  if (!match) {
    return text;
  }
  const hour = Math.min(23, Number(match[1]));
  const minute = Math.min(59, Number(match[2] || 0));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function findMoneyNear(text, labels) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}.{0,120}?\\$?\\s*([0-9][0-9,\\.\\s]{3,})`, "iu");
    const match = text.match(pattern);
    const amount = match ? toMoneyNumber(match[1]) : null;
    if (amount) {
      return amount;
    }
  }
  return null;
}

function findCourtName(text) {
  const match = text.match(/(juzgado\s+[^.,;\n]{8,170})/iu);
  return match ? sanitizeText(match[1], 180) : null;
}

function findAddress(text) {
  const match = text.match(/(?:ubicad[oa]\s+en|sito\s+en|inmueble\s+ubicad[oa]\s+en)\s+([^.;\n]{12,240})/iu);
  return match ? sanitizeText(match[1], 240) : null;
}

function findDate(text) {
  const iso = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (iso) {
    return normalizeDate(iso[0]);
  }

  const slash = text.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/);
  if (slash) {
    return normalizeDate(slash[0]);
  }

  const spanish = text.match(/\b\d{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4}\b/iu);
  return spanish ? normalizeDate(spanish[0]) : null;
}

function findTime(text) {
  const match = text.match(/(?:a\s+las|hora(?:\s+del\s+remate)?|remate\s+a\s+las)\s+(\d{1,2})(?::(\d{2}))?/iu);
  return match ? normalizeTime(`${match[1]}:${match[2] || "00"}`) : null;
}

function findKnownState(text) {
  const states = [
    "Ciudad de México",
    "Estado de México",
    "Jalisco",
    "Nuevo Leon",
    "Puebla",
    "Queretaro",
    "Morelos"
  ];
  const normalizedText = removeDiacritics(text).toLowerCase();
  return states.find((state) => normalizedText.includes(removeDiacritics(state).toLowerCase())) || null;
}

function toMoneyNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }

  const normalized = String(value)
    .replace(/[^\d.,]/g, "")
    .replace(/,(?=\d{3}\b)/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

function removeDiacritics(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const DISPLAY_TEXT_KEYS = new Set([
  "alt",
  "attribution",
  "bodyMarkdown",
  "description",
  "disclaimer",
  "error",
  "label",
  "message",
  "name",
  "rawNotes",
  "riskNotes",
  "shortDescription",
  "summary",
  "tags",
  "text",
  "title"
]);

const URL_KEYS = new Set([
  "imageUrl",
  "publicUrl",
  "url"
]);

export function normalizeBrandText(value) {
  return String(value || "")
    .replace(/\bRemates inmobiliarios\b/g, "Subastas inmobiliarias")
    .replace(/\bremates inmobiliarios\b/g, "subastas inmobiliarias")
    .replace(/\bREMATES INMOBILIARIOS\b/g, "SUBASTAS INMOBILIARIAS")
    .replace(/\bRemates Inmobiliarios\b/g, "Subastas inmobiliarias")
    .replace(/\bRemate inmobiliario\b/g, "Subasta inmobiliaria")
    .replace(/\bremate inmobiliario\b/g, "subasta inmobiliaria")
    .replace(/\bREMATE INMOBILIARIO\b/g, "SUBASTA INMOBILIARIA")
    .replace(/\bRemate judicial\b/g, "Subasta judicial")
    .replace(/\bremate judicial\b/g, "subasta judicial")
    .replace(/\bREMATE JUDICIAL\b/g, "SUBASTA JUDICIAL")
    .replace(/\brematados\b/g, "subastados")
    .replace(/\brematadas\b/g, "subastadas")
    .replace(/\brematado\b/g, "subastado")
    .replace(/\brematada\b/g, "subastada")
    .replace(/\bRematados\b/g, "Subastados")
    .replace(/\bRematadas\b/g, "Subastadas")
    .replace(/\bRematado\b/g, "Subastado")
    .replace(/\bRematada\b/g, "Subastada")
    .replace(/\bREMATADOS\b/g, "SUBASTADOS")
    .replace(/\bREMATADAS\b/g, "SUBASTADAS")
    .replace(/\bREMATADO\b/g, "SUBASTADO")
    .replace(/\bREMATADA\b/g, "SUBASTADA")
    .replace(/\bremates\b/g, "subastas")
    .replace(/\bRemates\b/g, "Subastas")
    .replace(/\bREMATES\b/g, "SUBASTAS")
    .replace(/\bremate\b/g, "subasta")
    .replace(/\bRemate\b/g, "Subasta")
    .replace(/\bREMATE\b/g, "SUBASTA");
}

export function normalizeBrandUrl(value) {
  return String(value || "")
    .replaceAll("https://remates.legalflow.solutions", "https://subastas.legalflow.solutions")
    .replaceAll("http://remates.legalflow.solutions", "https://subastas.legalflow.solutions")
    .replaceAll("remates.legalflow.solutions", "subastas.legalflow.solutions");
}

export function normalizeBrandTree(value, key = "") {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeBrandTree(item, key));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        normalizeBrandTree(entryValue, entryKey)
      ])
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (URL_KEYS.has(key)) {
    return normalizeBrandUrl(value);
  }

  return DISPLAY_TEXT_KEYS.has(key) ? normalizeBrandText(value) : value;
}

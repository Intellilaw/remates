const TEXT_REPLACEMENTS = [
  [/\bM[?e]xico\b/g, "México"],
  [/\bJu[?a]rez\b/g, "Juárez"],
  [/\bCuauht[?e]moc\b/g, "Cuauhtémoc"],
  [/\bCoyoac[?a]n\b/g, "Coyoacán"],
  [/\bTlahuac\b/g, "Tláhuac"],
  [/\bAlvaro Obregon\b/g, "Álvaro Obregón"],
  [/\balcald[?i]a\b/gi, "alcaldía"],
  [/\bdirecci[?o]n\b/gi, "dirección"],
  [/\bdescripci[?o]n\b/gi, "descripción"],
  [/\bpublicaci[?o]n\b/gi, "publicación"],
  [/\bactualizaci[?o]n\b/gi, "actualización"],
  [/\bcat[?a]logo\b/gi, "catálogo"],
  [/\baval[?u]o\b/gi, "avalúo"],
  [/\bsesi[?o]n\b/gi, "sesión"],
  [/\bcontrase[?n]a\b/gi, "contraseña"],
  [/\btel[?e]fono\b/gi, "teléfono"],
  [/\bg[?e]nero\b/gi, "género"],
  [/\bp[?u]blico\b/gi, "público"],
  [/\binformaci[?o]n\b/gi, "información"],
  [/\bn[?u]mero\b/gi, "número"],
  [/\bm[?o]vil\b/gi, "móvil"],
  [/\bdevolvi[?o]\b/gi, "devolvió"],
  [/\binv[?a]lido\b/gi, "inválido"]
];

const MOJIBAKE_REPLACEMENTS = [
  ["Ã¡", "á"],
  ["Ã©", "é"],
  ["Ã­", "í"],
  ["Ã³", "ó"],
  ["Ãº", "ú"],
  ["Ã±", "ñ"],
  ["Ã", "Á"],
  ["Ã‰", "É"],
  ["Ã", "Í"],
  ["Ã“", "Ó"],
  ["Ãš", "Ú"],
  ["Ã‘", "Ñ"],
  ["Â¿", "¿"],
  ["Â¡", "¡"],
  ["Â·", "·"],
  ["â€“", "-"],
  ["â€”", "-"],
  ["â€œ", "\""],
  ["â€", "\""],
  ["â€˜", "'"],
  ["â€™", "'"]
];

export function normalizeDisplayText(value = "") {
  let text = String(value);
  for (const [broken, fixed] of MOJIBAKE_REPLACEMENTS) {
    text = text.replaceAll(broken, fixed);
  }
  for (const [pattern, replacement] of TEXT_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

export function normalizeTextTree(value) {
  if (typeof value === "string") {
    return normalizeDisplayText(value);
  }
  if (!value || typeof value !== "object" || value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeTextTree(item));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, normalizeTextTree(item)])
  );
}

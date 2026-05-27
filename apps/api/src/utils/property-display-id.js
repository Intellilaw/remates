const PROPERTY_DISPLAY_ID_PREFIX = "Inmueble";
const PROPERTY_DISPLAY_ID_PATTERN = /^Inmueble\s+(\d+)$/i;

export function formatPropertyDisplayId(number) {
  return `${PROPERTY_DISPLAY_ID_PREFIX} ${String(number).padStart(3, "0")}`;
}

function displayIdNumber(displayId) {
  const match = String(displayId || "").trim().match(PROPERTY_DISPLAY_ID_PATTERN);
  return match ? Number(match[1]) : null;
}

export function assignPropertyDisplayIds(properties = []) {
  const usedNumbers = new Set();
  let nextNumber = 1;

  return properties.map((property) => {
    const currentNumber = displayIdNumber(property.displayId);
    if (Number.isInteger(currentNumber) && currentNumber > 0 && !usedNumbers.has(currentNumber)) {
      usedNumbers.add(currentNumber);
      return property;
    }

    while (usedNumbers.has(nextNumber)) {
      nextNumber += 1;
    }

    const displayId = formatPropertyDisplayId(nextNumber);
    usedNumbers.add(nextNumber);
    nextNumber += 1;
    return {
      ...property,
      displayId
    };
  });
}

export function nextPropertyDisplayId(properties = []) {
  const numbers = assignPropertyDisplayIds(properties)
    .map((property) => displayIdNumber(property.displayId))
    .filter((number) => Number.isInteger(number) && number > 0);
  const maxNumber = numbers.length ? Math.max(...numbers) : 0;
  return formatPropertyDisplayId(maxNumber + 1);
}

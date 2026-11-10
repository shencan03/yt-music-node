/**
 * Small helpers that reproduce Python semantics the parsers rely on.
 * Ported code must not silently switch to JS semantics (truthiness, Unicode digits, dict equality).
 */

/** Python truthiness: `None`, `False`, `0`, `""`, `[]` and `{}` are falsy. */
export function truthy(value: unknown): boolean {
  if (value === null || value === undefined || value === false || value === 0 || value === "") return false;
  if (Number.isNaN(value)) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

/** Python `a or b`. */
export function or<A, B>(a: A, b: B): A | B {
  return truthy(a) ? a : b;
}

/** Structural equality for JSON values (Python `==` on dicts/lists). */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const other = b as unknown[];
    return a.length === other.length && a.every((item, i) => jsonEqual(item, other[i]));
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return (
    ka.length === kb.length &&
    ka.every((k) => Object.hasOwn(b, k) && jsonEqual((a as any)[k], (b as any)[k]))
  );
}

/** `key in obj` for objects (never inherited properties). */
export function has(obj: unknown, key: string): boolean {
  return obj !== null && typeof obj === "object" && !Array.isArray(obj) && Object.hasOwn(obj, key);
}

const DIGIT = /\p{Nd}/u;
const ALL_DIGITS = /^\p{Nd}+$/u;
const ALL_NUMERIC = /^\p{N}+$/u;

/** Python `str.isdigit()` for decimal digits in any script. */
export function isDigits(text: string): boolean {
  return ALL_DIGITS.test(text);
}

/** Python `str.isnumeric()` (approximation: Unicode category N). */
export function isNumeric(text: string): boolean {
  return ALL_NUMERIC.test(text);
}

/** Python `str.isascii()`. */
export function isAscii(text: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7f]*$/.test(text);
}

/**
 * Converts decimal digits of any script to ASCII ("٣:٤٥" → "3:45"), so they can be parsed like
 * Python's `int()` does. Unicode decimal digits come in contiguous runs of ten starting at zero.
 */
export function toAsciiDigits(text: string): string {
  let out = "";
  for (const char of text) {
    if (char >= "0" && char <= "9") {
      out += char;
    } else if (DIGIT.test(char)) {
      const cp = char.codePointAt(0)!;
      // adjacent runs exist (e.g. mathematical digits), so walk to the start and take the offset mod 10
      let start = cp;
      while (DIGIT.test(String.fromCodePoint(start - 1))) start--;
      out += String((cp - start) % 10);
    } else {
      out += char;
    }
  }
  return out;
}

/** Python `int(text)` for a string of decimal digits (any script). Throws on anything else. */
export function pyInt(text: string): number {
  const trimmed = text.trim();
  if (!isDigits(trimmed.replace(/^[+-]/, ""))) throw new SyntaxError(`invalid literal for int(): '${text}'`);
  return Number.parseInt(toAsciiDigits(trimmed), 10);
}

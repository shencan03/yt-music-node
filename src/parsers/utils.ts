/** Port of ytmusicapi/parsers/_utils.py, parsers/constants.py and the parsing helpers in helpers.py. */
import {
  ICON_TYPE,
  MENU_ITEMS,
  MNIR,
  NAVIGATION_BROWSE_ID,
  findObjectsByKey,
  nav,
} from "../nav.ts";
import { has, isDigits, jsonEqual, toAsciiDigits } from "./py.ts";

export const DOT_SEPARATOR_RUN = { text: " • " } as const;

/** Sets `shuffleId` / `radioId` on `result` from the item's menu, in place. */
export function parseMenuPlaylists(data: any, result: Record<string, any>): void {
  const menuItems = nav(data, MENU_ITEMS, true);
  if (menuItems == null) return;
  for (const { [MNIR]: item } of findObjectsByKey(menuItems, MNIR)) {
    const icon = nav(item, ICON_TYPE);
    let watchKey: string;
    if (icon === "MUSIC_SHUFFLE") watchKey = "shuffleId";
    else if (icon === "MIX") watchKey = "radioId";
    else continue;

    const watchId =
      nav(item, ["navigationEndpoint", "watchPlaylistEndpoint", "playlistId"], true) ||
      nav(item, ["navigationEndpoint", "watchEndpoint", "playlistId"], true);
    if (watchId) result[watchKey] = watchId;
  }
}

export function getItemText(item: any, index: number, runIndex = 0, noneIfAbsent = false): string | null {
  const column = getFlexColumnItem(item, index);
  if (!column) return null;
  if (noneIfAbsent && column.text.runs.length < runIndex + 1) return null;
  return nav(column, ["text", "runs", runIndex, "text"]);
}

export function getFlexColumnItem(item: any, index: number): any | null {
  const columns: any[] = nav(item, ["flexColumns"]);
  if (columns.length <= index) return null;
  const renderer = nav(columns, [index, "musicResponsiveListItemFlexColumnRenderer"]);
  if (!has(renderer, "text") || !has(renderer.text, "runs")) return null;
  return renderer;
}

export function getFixedColumnItem(item: any, index: number): any | null {
  const renderer = nav(item, ["fixedColumns", index, "musicResponsiveListItemFixedColumnRenderer"]);
  if (!has(renderer, "text") || !has(renderer.text, "runs")) return null;
  return renderer;
}

export function getDotSeparatorIndex(runs: readonly any[]): number {
  const index = runs.findIndex((run) => jsonEqual(run, DOT_SEPARATOR_RUN));
  return index === -1 ? runs.length : index;
}

/** Parses `"1:23:45"` into seconds. Returns `null` for empty or non-numeric input (e.g. `"2,343"`). */
export function parseDuration(duration: string | null | undefined): number | null {
  // duration may be falsy or a single space: ' '
  if (!duration || !duration.trim()) return null;
  const parts = duration.trim().split(":");
  if (!parts.every(isDigits)) return null;
  const multipliers = [1, 60, 3600];
  let seconds = 0;
  parts.reverse().forEach((part, i) => {
    if (i < multipliers.length) seconds += multipliers[i]! * Number.parseInt(toAsciiDigits(part), 10);
  });
  return seconds;
}

export function parseIdName(subRun: any): { id: string | null; name: string | null } {
  return {
    id: nav(subRun, NAVIGATION_BROWSE_ID, true) ?? null,
    name: nav(subRun, ["text"], true) ?? null,
  };
}

/**
 * Parses an integer count such as `"1,234 songs"` or `"12 Titel"` by keeping only its digits.
 * Returns `null` when the text has no digits. (Upstream `to_int` raises ValueError there.)
 *
 * Do not use this for abbreviated counts like `"2M views"`; use {@link parseCount}.
 */
export function toInt(text: string): number | null {
  const digits = toAsciiDigits(text.normalize("NFKD")).replace(/\D/g, "");
  return digits === "" ? null : Number.parseInt(digits, 10);
}

/** Magnitude words YouTube Music uses in abbreviated counts (lower-cased), shared by most languages. */
const MAGNITUDES: Record<string, number> = {
  k: 1e3, m: 1e6, b: 1e9, // en, fr, es, nl
  md: 1e9, // fr
  mil: 1e3, mi: 1e6, bi: 1e9, // es, pt
  "tsd.": 1e3, "mio.": 1e6, "mrd.": 1e9, // de
  mln: 1e6, "mln.": 1e6, mld: 1e9, "mld.": 1e9, "tis.": 1e3, // it, nl, cs
  "тыс.": 1e3, "млн": 1e6, "млрд": 1e9, // ru
  mn: 1e6, mr: 1e9, // tr
  "ألف": 1e3, "مليون": 1e6, "مليار": 1e9, // ar
  "हज़ार": 1e3, "लाख": 1e5, "करोड़": 1e7, // hi
  "ہزار": 1e3, "لاکھ": 1e5, "کروڑ": 1e7, "ارب": 1e9, // ur
};
/** Overrides where a language uses a shared abbreviation differently. */
const LANGUAGE_MAGNITUDES: Record<string, Record<string, number>> = {
  tr: { b: 1e3 }, // "B" = bin (thousand)
};
/** CJK magnitudes are glued to the following word ("3406万回視聴", "17억회"). */
const CJK_MAGNITUDES: Record<string, number> = {
  "千": 1e3, "万": 1e4, "萬": 1e4, "億": 1e8, "亿": 1e8, "천": 1e3, "만": 1e4, "억": 1e8,
};

/**
 * Parses a possibly abbreviated count: `"2M views"` → 2000000, `"1.3M views"` → 1300000,
 * `"1,234 views"` → 1234, `"1,7 Mrd. Aufrufe"` → 1700000000, `"3406万回視聴"` → 34060000.
 *
 * Upstream uses `to_int` here, which keeps only the digits: `"2M views"` → 2, `"1.3M"` → 13.
 * Returns `null` when the text does not start with a number, or when it has a decimal part followed
 * by an unknown word (the magnitude cannot be determined, so any number would be wrong).
 */
export function parseCount(text: string | null | undefined, language = "en"): number | null {
  if (!text) return null;
  const normalized = toAsciiDigits(text.replace(/[\u200e\u200f\u202a-\u202e]/g, ""))
    .replace(/[\u00a0\u202f]/g, " ")
    .trim();
  const match = /^(\d[\d.,]*)\s*(\S*)/u.exec(normalized);
  if (!match) return null;
  const number = match[1]!.replace(/[.,]$/, "");
  const word = match[2]!.toLowerCase();

  let magnitude = LANGUAGE_MAGNITUDES[language]?.[word] ?? MAGNITUDES[word];
  if (magnitude === undefined) magnitude = CJK_MAGNITUDES[[...word][0] ?? ""];

  // "1.3" / "1,7": one separator followed by one or two digits is a decimal part
  const isDecimal = /^\d+[.,]\d{1,2}$/.test(number);
  if (magnitude === undefined) {
    if (isDecimal && word !== "") return null;
    return Number.parseInt(number.replace(/[.,]/g, ""), 10);
  }
  const value = isDecimal ? Number.parseFloat(number.replace(",", ".")) : Number.parseInt(number.replace(/[.,]/g, ""), 10);
  return Math.round(value * magnitude);
}

export function sumTotalDuration(item: { tracks?: readonly any[] }): number {
  if (!item.tracks) return 0;
  return item.tracks.reduce(
    (sum, track) => sum + (Number.isInteger(track?.duration_seconds) ? track.duration_seconds : 0),
    0,
  );
}

/** A piece of text; `url` is set for links. */
export type TextRun = { text: string } | { text: string; url: string };

/** Joins description runs into text and keeps links. Port of `parse_description_runs`. */
export function parseDescriptionRuns(runs: unknown): [string, TextRun[]] {
  if (!Array.isArray(runs)) return ["", []];
  let description = "";
  const descriptionRuns: TextRun[] = [];
  for (const run of runs) {
    description += run.text;
    // hashtag runs carry a searchEndpoint instead of an urlEndpoint - treat them as plain text
    const link = nav(run, ["navigationEndpoint", "urlEndpoint", "url"], true);
    descriptionRuns.push(link != null ? { text: run.text, url: link } : { text: run.text });
  }
  return [description, descriptionRuns];
}

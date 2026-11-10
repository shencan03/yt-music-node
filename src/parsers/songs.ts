/** Port of ytmusicapi/parsers/songs.py and parsers/artists.py. */
import { FEEDBACK_TOKEN, MENU_ITEMS, NAVIGATION_BROWSE_ID, TEXT_RUN, TOGGLE_MENU, nav } from "../nav.ts";
import { has, isAscii, jsonEqual, or } from "./py.ts";
import { DOT_SEPARATOR_RUN, getFlexColumnItem, getItemText, parseDuration } from "./utils.ts";

/** An artist credited on an item. `id` is null for artists without a channel. */
export interface ArtistRef {
  name: string;
  id: string | null;
}

/** The album an item belongs to. */
export interface AlbumRef {
  name: string;
  id: string | null;
}

/** Returns artist names and ids, skipping the separator runs between them. */
export function parseArtistsRuns(runs: readonly any[]): ArtistRef[] {
  const artists: ArtistRef[] = [];
  // upstream indexes past the end (IndexError) when runs has an even length
  for (let i = 0; i < runs.length; i += 2) {
    artists.push({ name: runs[i].text, id: nav(runs[i], NAVIGATION_BROWSE_ID, true) ?? null });
  }
  return artists;
}

export function parseSongArtists(data: any, index: number): ArtistRef[] {
  const flexItem = getFlexColumnItem(data, index);
  return flexItem ? parseArtistsRuns(flexItem.text.runs) : [];
}

// leading views word ("조회수 17억회", "播放次數：4505") or bidi mark (ur), up to the first digit
const VIEWS_PREFIX = /^[^\p{Nd}]*?[\s:\uff1a\u200e-\u200f\u202a-\u202e]/u;
const STARTS_WITH_DIGIT = /^\p{Nd}/u;

/** Returns the view count part of a views text ("1.7B views" → "1.7B"), or `null` if it is not one. */
export function parseViews(text: string): string | null {
  // only for non-latin scripts: "Maroon 5" is indistinguishable from a prefixed count
  let prefixed = false;
  if (!/[a-zA-Z]/.test(text)) {
    const stripped = text.replace(VIEWS_PREFIX, "");
    prefixed = stripped !== text;
    text = stripped;
  }

  if (!STARTS_WITH_DIGIT.test(text)) return null;

  // a bare ASCII token like "2Pac" is an artist, not a view count with a stripped word
  if (!prefixed && isAscii(text) && !text.includes(" ")) return null;

  // note: \xa0 glues number and magnitude ("1,7\xa0Mrd. Aufrufe"), but some locales use
  // it before the views word too ("88\xa0k\xa0vues"); CJK has no separator ("3406万回視聴")
  const head = text.split(" ")[0]!.split("\u00a0");
  return head.slice(0, 2).join("\u00a0");
}

export type SongRun =
  | { type: "album"; data: { name: string; id: string | null } }
  | { type: "artist"; data: { name: string; id: string | null } }
  | { type: "duration"; data: string }
  | { type: "year"; data: string }
  | { type: "views"; data: string };

const DURATION = /^(\p{Nd}+:)*\p{Nd}+:\p{Nd}+$/u;
const YEAR = /^\p{Nd}{4}$/u;

export function parseSongRun(run: any): SongRun {
  const text: string = run.text;

  if (has(run, "navigationEndpoint")) {
    // artist or album
    const item = { name: text, id: (nav(run, NAVIGATION_BROWSE_ID, true) ?? null) as string | null };
    if (item.id && (item.id.startsWith("MPRE") || item.id.includes("release_detail"))) {
      return { type: "album", data: item };
    }
    return { type: "artist", data: item };
  }

  if (DURATION.test(text)) return { type: "duration", data: text };
  if (YEAR.test(text)) return { type: "year", data: text };
  const views = parseViews(text);
  if (views !== null) return { type: "views", data: views };
  // artist without id
  return { type: "artist", data: { name: text, id: null } };
}

export interface SongRunsInfo {
  artists?: ArtistRef[];
  album?: AlbumRef;
  views?: string;
  duration?: string;
  duration_seconds?: number | null;
  year?: string;
}

/**
 * @param skipTypeSpec skip the type specifier ("Song", "Single", "Album", …) that may precede the
 *   artists ("Song • Eminem"). Otherwise it is parsed as an artist without id.
 */
export function parseSongRuns(runs: readonly any[], skipTypeSpec = false): SongRunsInfo {
  const parsed: SongRunsInfo = {};

  // prevent type specifier from being parsed as an artist
  // it's the unlinked first run, separated by " • " from the artists, or from
  // metadata (duration/views/year) when the song lists no artist at all
  if (
    skipTypeSpec &&
    runs.length > 2 &&
    !has(runs[0], "navigationEndpoint") &&
    parseSongRun(runs[0]).type === "artist" &&
    jsonEqual(runs[1], DOT_SEPARATOR_RUN) &&
    ["artist", "duration", "views", "year"].includes(parseSongRun(runs[2]).type)
  ) {
    runs = runs.slice(2);
  }

  runs.forEach((run, i) => {
    if (i % 2) return; // uneven items are always separators
    const parsedRun = parseSongRun(run);
    switch (parsedRun.type) {
      case "album":
        parsed.album = parsedRun.data;
        break;
      case "artist":
        (parsed.artists ??= []).push(parsedRun.data);
        break;
      case "views":
        parsed.views = parsedRun.data;
        break;
      case "duration":
        parsed.duration = parsedRun.data;
        parsed.duration_seconds = parseDuration(parsedRun.data);
        break;
      case "year":
        parsed.year = parsedRun.data;
        break;
    }
  });
  return parsed;
}

export function parseSongAlbum(data: any, index: number): AlbumRef | null {
  const flexItem = getFlexColumnItem(data, index);
  const browseId = nav(flexItem, [...TEXT_RUN, ...NAVIGATION_BROWSE_ID], true) ?? null;
  return flexItem ? { name: getItemText(data, index)!, id: browseId } : null;
}

/**
 * Tokens for adding an item to, or removing it from, the library with {@link
 * YTMusic.editSongLibraryStatus}.
 */
export interface FeedbackTokens {
  add: string | null;
  remove: string | null;
}

export interface SongMenuData {
  inLibrary?: boolean;
  pinnedToListenAgain?: boolean;
  feedbackTokens?: FeedbackTokens;
  listenAgainFeedbackTokens?: { pin: string | null; unpin: string | null };
  feedbackToken?: string | null;
}

/** Library and listen-again state and feedback tokens from a song's context menu. */
export function parseSongMenuData(data: any): SongMenuData {
  if (!has(data, "menu")) return {};

  const songData: SongMenuData = {};
  for (const item of nav(data, MENU_ITEMS) as any[]) {
    const menuItem = or(nav(item, [TOGGLE_MENU], true), nav(item, ["menuServiceItemRenderer"], true));
    if (menuItem == null) continue;

    songData.inLibrary ??= false;
    songData.pinnedToListenAgain ??= false;

    const currentIconType = or(
      nav(menuItem, ["defaultIcon", "iconType"], true),
      nav(menuItem, ["icon", "iconType"], true),
    );
    const feedbackToken = (endpointType: string): string | null =>
      nav(menuItem, [endpointType, ...FEEDBACK_TOKEN], true) ?? null;

    // YTM signals the current state with isToggled instead of swapping the default/toggled icons
    const isToggled = Boolean(menuItem.isToggled);

    switch (currentIconType) {
      case "KEEP": // pin to listen again
        songData.pinnedToListenAgain = isToggled;
        songData.listenAgainFeedbackTokens = {
          pin: feedbackToken("defaultServiceEndpoint"),
          unpin: feedbackToken("toggledServiceEndpoint"),
        };
        break;
      case "KEEP_OFF": // unpin from listen again
        songData.pinnedToListenAgain = true;
        songData.listenAgainFeedbackTokens = {
          pin: feedbackToken("toggledServiceEndpoint"),
          unpin: feedbackToken("defaultServiceEndpoint"),
        };
        break;
      case "BOOKMARK_BORDER": // add to library
        songData.inLibrary = isToggled;
        songData.feedbackTokens = {
          add: feedbackToken("defaultServiceEndpoint"),
          remove: feedbackToken("toggledServiceEndpoint"),
        };
        break;
      case "BOOKMARK": // remove from library
        songData.inLibrary = true;
        songData.feedbackTokens = {
          add: feedbackToken("toggledServiceEndpoint"),
          remove: feedbackToken("defaultServiceEndpoint"),
        };
        break;
      case "REMOVE_FROM_HISTORY":
        songData.feedbackToken = feedbackToken("serviceEndpoint");
        break;
    }
  }
  return songData;
}

/** The user's rating of a song, album or playlist. */
export type LikeStatus = "LIKE" | "DISLIKE" | "INDIFFERENT";

/**
 * The like button's endpoint carries the status it would *set*, so the current status is the
 * other one. Port of `parse_like_status`.
 */
export function parseLikeStatus(service: any): LikeStatus {
  const status = nav(service, ["likeEndpoint", "status"]);
  if (status === "LIKE") return "INDIFFERENT";
  if (status === "INDIFFERENT") return "LIKE";
  throw new SyntaxError(`Unexpected like endpoint status: ${String(status)}`);
}

/**
 * Navigation helpers and commonly used paths into InnerTube renderer trees.
 * Port of ytmusicapi/navigation.py.
 */
import { YTMusicNavigationError } from "./errors.ts";

/** A key or array index in a {@link Path}. */
export type PathSegment = string | number;
/** A path into a JSON response, as used by {@link nav}. */
export type Path = readonly PathSegment[];

/**
 * Access a nested value by path.
 *
 * Unlike optional chaining, the strict form throws {@link YTMusicNavigationError} when a segment is
 * missing, so YouTube layout changes surface as errors instead of silently producing `undefined`.
 *
 * - Negative array indices count from the end (`-1` is the last item), as in Python.
 * - A `null` value at an intermediate segment counts as "absent". (Upstream raises an uncaught
 *   TypeError here even when `none_if_absent=True`.)
 * - Like upstream, a `null`/`undefined` root returns `null` in both modes.
 * - Absent values are `null` (Python `None`), so parsed results serialize like upstream's.
 *
 * Returns `any` on purpose: parsers walk untyped JSON and validate shape at their own boundaries.
 */
export function nav(root: unknown, path: Path, noneIfAbsent?: false): any;
export function nav(root: unknown, path: Path, noneIfAbsent: true): any | null;
export function nav(root: unknown, path: Path, noneIfAbsent = false): any {
  if (root === null || root === undefined) return null;
  let current: unknown = root;
  for (const key of path) {
    const next = step(current, key);
    if (next === MISSING) {
      if (noneIfAbsent) return null;
      throw new YTMusicNavigationError(path, key, current);
    }
    current = next;
  }
  return current;
}

const MISSING: unique symbol = Symbol("missing");

function step(value: unknown, key: PathSegment): unknown {
  if (value === null || typeof value !== "object") return MISSING;
  if (Array.isArray(value)) {
    if (typeof key !== "number" || !Number.isInteger(key)) return MISSING;
    const index = key < 0 ? value.length + key : key;
    return index >= 0 && index < value.length ? value[index] : MISSING;
  }
  const k = String(key);
  return Object.hasOwn(value, k) ? (value as Record<string, unknown>)[k] : MISSING;
}

/** Returns the first item containing `key` (optionally inside `item[nested]`). Port of `find_object_by_key`. */
export function findObjectByKey(objectList: readonly any[], key: string, nested?: string, isKey = false): any {
  for (let item of objectList) {
    if (nested) item = item[nested];
    if (isObject(item) && Object.hasOwn(item, key)) return isKey ? item[key] : item;
  }
  return null;
}

/** Returns all items containing `key` (optionally inside `item[nested]`). Port of `find_objects_by_key`. */
export function findObjectsByKey(objectList: readonly any[], key: string, nested?: string): any[] {
  const objects: any[] = [];
  for (let item of objectList) {
    if (nested) item = item[nested];
    if (isObject(item) && Object.hasOwn(item, key)) objects.push(item);
  }
  return objects;
}

function isObject(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === "object";
}

// ---------------------------------------------------------------------------------------------
// Commonly used navigation paths (names match upstream navigation.py)
// ---------------------------------------------------------------------------------------------

export const CONTENT = ["contents", 0] as const;
export const RUN_TEXT = ["runs", 0, "text"] as const;
export const TAB_CONTENT = ["tabs", 0, "tabRenderer", "content"] as const;
export const TAB_1_CONTENT = ["tabs", 1, "tabRenderer", "content"] as const;
export const TAB_2_CONTENT = ["tabs", 2, "tabRenderer", "content"] as const;
export const TWO_COLUMN_RENDERER = ["contents", "twoColumnBrowseResultsRenderer"] as const;
export const SINGLE_COLUMN = ["contents", "singleColumnBrowseResultsRenderer"] as const;
export const SINGLE_COLUMN_TAB = [...SINGLE_COLUMN, ...TAB_CONTENT] as const;
export const SECTION = ["sectionListRenderer"] as const;
export const SECTION_LIST = [...SECTION, "contents"] as const;
export const SECTION_LIST_ITEM = [...SECTION, ...CONTENT] as const;
export const RESPONSIVE_HEADER = ["musicResponsiveHeaderRenderer"] as const;
export const ITEM_SECTION = ["itemSectionRenderer", ...CONTENT] as const;
export const MUSIC_SHELF = ["musicShelfRenderer"] as const;
export const GRID = ["gridRenderer"] as const;
export const GRID_ITEMS = [...GRID, "items"] as const;
export const MENU = ["menu", "menuRenderer"] as const;
export const MENU_ITEMS = [...MENU, "items"] as const;
export const MENU_LIKE_STATUS = [...MENU, "topLevelButtons", 0, "likeButtonRenderer", "likeStatus"] as const;
export const MENU_SERVICE = ["menuServiceItemRenderer", "serviceEndpoint"] as const;
export const TOGGLE_MENU = "toggleMenuServiceItemRenderer";
export const OVERLAY_RENDERER = ["musicItemThumbnailOverlayRenderer", "content", "musicPlayButtonRenderer"] as const;
export const PLAY_BUTTON = ["overlay", ...OVERLAY_RENDERER] as const;
export const NAVIGATION_BROWSE = ["navigationEndpoint", "browseEndpoint"] as const;
export const NAVIGATION_BROWSE_ID = [...NAVIGATION_BROWSE, "browseId"] as const;
export const PAGE_TYPE = [
  "browseEndpointContextSupportedConfigs",
  "browseEndpointContextMusicConfig",
  "pageType",
] as const;
export const WATCH_VIDEO_ID = ["watchEndpoint", "videoId"] as const;
export const PLAYLIST_ID = ["playlistId"] as const;
export const WATCH_PLAYLIST_ID = ["watchEndpoint", ...PLAYLIST_ID] as const;
export const NAVIGATION_VIDEO_ID = ["navigationEndpoint", ...WATCH_VIDEO_ID] as const;
export const QUEUE_VIDEO_ID = ["queueAddEndpoint", "queueTarget", "videoId"] as const;
export const NAVIGATION_PLAYLIST_ID = ["navigationEndpoint", ...WATCH_PLAYLIST_ID] as const;
export const WATCH_PID = ["watchPlaylistEndpoint", ...PLAYLIST_ID] as const;
export const NAVIGATION_WATCH_PLAYLIST_ID = ["navigationEndpoint", ...WATCH_PID] as const;
export const NAVIGATION_VIDEO_TYPE = [
  "watchEndpoint",
  "watchEndpointMusicSupportedConfigs",
  "watchEndpointMusicConfig",
  "musicVideoType",
] as const;
export const ICON_TYPE = ["icon", "iconType"] as const;
export const TOGGLED_BUTTON = ["toggleButtonRenderer", "isToggled"] as const;
export const TITLE = ["title", "runs", 0] as const;
export const TITLE_TEXT = ["title", ...RUN_TEXT] as const;
export const TEXT_RUNS = ["text", "runs"] as const;
export const TEXT_RUN = [...TEXT_RUNS, 0] as const;
export const TEXT_RUN_TEXT = [...TEXT_RUN, "text"] as const;
export const SUBTITLE = ["subtitle", ...RUN_TEXT] as const;
export const SUBTITLE_RUNS = ["subtitle", "runs"] as const;
export const SUBTITLE_RUN = [...SUBTITLE_RUNS, 0] as const;
export const SUBTITLE2 = [...SUBTITLE_RUNS, 2, "text"] as const;
export const SUBTITLE3 = [...SUBTITLE_RUNS, 4, "text"] as const;
export const THUMBNAIL = ["thumbnail", "thumbnails"] as const;
export const THUMBNAILS = ["thumbnail", "musicThumbnailRenderer", ...THUMBNAIL] as const;
export const THUMBNAIL_RENDERER = ["thumbnailRenderer", "musicThumbnailRenderer", ...THUMBNAIL] as const;
export const THUMBNAIL_OVERLAY_NAVIGATION = ["thumbnailOverlay", ...OVERLAY_RENDERER, "playNavigationEndpoint"] as const;
export const THUMBNAIL_OVERLAY = [...THUMBNAIL_OVERLAY_NAVIGATION, ...WATCH_PID] as const;
export const THUMBNAIL_CROPPED = ["thumbnail", "croppedSquareThumbnailRenderer", ...THUMBNAIL] as const;
export const FEEDBACK_TOKEN = ["feedbackEndpoint", "feedbackToken"] as const;
export const BADGE_PATH = [0, "musicInlineBadgeRenderer", "accessibilityData", "accessibilityData", "label"] as const;
export const BADGE_LABEL = ["badges", ...BADGE_PATH] as const;
export const SUBTITLE_BADGE_LABEL = ["subtitleBadges", ...BADGE_PATH] as const;
export const CATEGORY_TITLE = ["musicNavigationButtonRenderer", "buttonText", ...RUN_TEXT] as const;
export const CATEGORY_PARAMS = ["musicNavigationButtonRenderer", "clickCommand", "browseEndpoint", "params"] as const;
export const MMRIR = "musicMultiRowListItemRenderer";
export const MRLIR = "musicResponsiveListItemRenderer";
export const MTRIR = "musicTwoRowItemRenderer";
export const MNIR = "menuNavigationItemRenderer";
export const TASTE_PROFILE_ITEMS = ["contents", "tastebuilderRenderer", "contents"] as const;
export const TASTE_PROFILE_ARTIST = ["title", "runs"] as const;
export const SECTION_LIST_CONTINUATION = ["continuationContents", "sectionListContinuation"] as const;
export const MENU_PLAYLIST_ID = [...MENU_ITEMS, 0, MNIR, ...NAVIGATION_WATCH_PLAYLIST_ID] as const;
export const MULTI_SELECT = ["musicMultiSelectMenuItemRenderer"] as const;
export const HEADER = ["header"] as const;
export const HEADER_DETAIL = [...HEADER, "musicDetailHeaderRenderer"] as const;
export const EDITABLE_PLAYLIST_DETAIL_HEADER = ["musicEditablePlaylistDetailHeaderRenderer"] as const;
export const HEADER_EDITABLE_DETAIL = [...HEADER, ...EDITABLE_PLAYLIST_DETAIL_HEADER] as const;
export const HEADER_SIDE = [...HEADER, "musicSideAlignedItemRenderer"] as const;
export const HEADER_MUSIC_VISUAL = [...HEADER, "musicVisualHeaderRenderer"] as const;
export const DESCRIPTION_SHELF = ["musicDescriptionShelfRenderer"] as const;
export const DESCRIPTION = ["description", ...RUN_TEXT] as const;
export const DESCRIPTION_RUN_LIST = ["description", RUN_TEXT[0]] as const;
export const CAROUSEL = ["musicCarouselShelfRenderer"] as const;
export const IMMERSIVE_CAROUSEL = ["musicImmersiveCarouselShelfRenderer"] as const;
export const CAROUSEL_CONTENTS = [...CAROUSEL, "contents"] as const;
export const CAROUSEL_TITLE = [...HEADER, "musicCarouselShelfBasicHeaderRenderer", ...TITLE] as const;
export const CAROUSEL_STRAPLINE = [...HEADER, "musicCarouselShelfBasicHeaderRenderer", "strapline", "runs", 0] as const;
export const CARD_SHELF_TITLE = [...HEADER, "musicCardShelfHeaderBasicRenderer", ...TITLE_TEXT] as const;
export const FRAMEWORK_MUTATIONS = ["frameworkUpdates", "entityBatchUpdate", "mutations"] as const;
export const TIMESTAMPED_LYRICS = [
  "contents",
  "elementRenderer",
  "newElement",
  "type",
  "componentType",
  "model",
  "timedLyricsModel",
  "lyricsData",
] as const;
export const ENGAGEMENT_BAR = [
  "engagementBar",
  "engagementBarViewModel",
  "actions",
  0,
  "votingViewModel",
  "initialState",
] as const;
export const CREDITS_SECTIONS = [
  "onResponseReceivedActions",
  0,
  "openPopupAction",
  "popup",
  "dismissableDialogRenderer",
  "sections",
] as const;

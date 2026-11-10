/** Port of ytmusicapi/parsers/search.py. */
import { YTMusicError } from "../errors.ts";
import {
  BADGE_LABEL,
  CARD_SHELF_TITLE,
  MENU_PLAYLIST_ID,
  MRLIR,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_PLAYLIST_ID,
  NAVIGATION_VIDEO_ID,
  NAVIGATION_VIDEO_TYPE,
  PLAY_BUTTON,
  SUBTITLE,
  SUBTITLE2,
  SUBTITLE_RUNS,
  TEXT_RUNS,
  THUMBNAILS,
  THUMBNAIL_OVERLAY_NAVIGATION,
  TITLE,
  TITLE_TEXT,
  WATCH_VIDEO_ID,
  nav,
} from "../nav.ts";
import { parseAlbumPlaylistIdIfExists } from "./albums.ts";
import { has, isNumeric, or } from "./py.ts";
import { parseArtistsRuns, parseSongMenuData, parseSongRuns } from "./songs.ts";
import { getFlexColumnItem, getItemText, parseIdName, parseMenuPlaylists, toInt } from "./utils.ts";

export const ALL_RESULT_TYPES = [
  "album",
  "artist",
  "playlist",
  "song",
  "video",
  "station",
  "profile",
  "podcast",
  "episode",
] as const;
export const API_RESULT_TYPES = ["single", "ep", ...ALL_RESULT_TYPES] as const;

export type SearchResultType = (typeof ALL_RESULT_TYPES)[number] | "upload";

/** Maps a localized result type label ("Künstler") to its canonical name ("artist"). */
export function getSearchResultType(resultTypeLocal: string | null, resultTypesLocal: readonly string[]): string | null {
  if (!resultTypeLocal) return null;
  const local = resultTypeLocal.toLowerCase();
  const index = resultTypesLocal.indexOf(local);
  // default to album since it's labeled with multiple values ('Single', 'EP', etc.)
  return index === -1 ? "album" : ALL_RESULT_TYPES[index]!;
}

export function parseTopResult(data: any, searchResultTypes: readonly string[]): Record<string, any> {
  const resultType = getSearchResultType(nav(data, SUBTITLE), searchResultTypes);
  // header element is missing in some edge cases (#799)
  const category = or(nav(data, CARD_SHELF_TITLE, true), "Top result");
  const result: Record<string, any> = { category, resultType };

  if (resultType === "artist") {
    const subscribers = nav(data, SUBTITLE2, true);
    if (subscribers) result.subscribers = subscribers.split(" ")[0];
    Object.assign(result, parseSongRuns(nav(data, ["title", "runs"])));
  }

  if (resultType === "song" || resultType === "video") {
    const onTap = data.onTap;
    if (onTap) {
      result.videoId = nav(onTap, WATCH_VIDEO_ID);
      result.videoType = nav(onTap, NAVIGATION_VIDEO_TYPE);
    }
  }

  if (resultType === "song" || resultType === "video" || resultType === "album") {
    result.videoId = nav(data, ["onTap", ...WATCH_VIDEO_ID], true);
    result.videoType = nav(data, ["onTap", ...NAVIGATION_VIDEO_TYPE], true);
    result.title = nav(data, TITLE_TEXT);
    Object.assign(result, parseSongRuns((nav(data, ["subtitle", "runs"]) as any[]).slice(2)));
  }

  if (resultType === "album") {
    result.browseId = nav(data, [...TITLE, ...NAVIGATION_BROWSE_ID], true);
    result.playlistId = parseAlbumPlaylistIdIfExists(nav(data, ["buttons", 0, "buttonRenderer", "command"], true));
  }

  if (resultType === "playlist") {
    result.playlistId = nav(data, MENU_PLAYLIST_ID);
    result.title = nav(data, TITLE_TEXT);
    result.author = parseArtistsRuns((nav(data, ["subtitle", "runs"]) as any[]).slice(2));
  }

  if (resultType === "episode") {
    result.title = nav(data, TITLE_TEXT);
    result.videoId = nav(data, [...THUMBNAIL_OVERLAY_NAVIGATION, ...WATCH_VIDEO_ID]);
    result.videoType = nav(data, [...THUMBNAIL_OVERLAY_NAVIGATION, ...NAVIGATION_VIDEO_TYPE]);
    const runs = (nav(data, SUBTITLE_RUNS) as any[]).slice(2);
    result.date = nav(runs, [0, "text"]);
    result.podcast = parseIdName(runs[2]);
  }

  result.thumbnails = nav(data, THUMBNAILS, true);
  return result;
}

const BROWSE_ID_RESULT_TYPES: [string, string][] = [
  ["VM", "playlist"],
  ["RD", "playlist"],
  ["VL", "playlist"],
  ["MPLA", "artist"],
  ["MPRE", "album"],
  ["MPSP", "podcast"],
  ["MPED", "episode"],
  ["UC", "artist"],
];

export function parseSearchResult(data: any, resultType: string | null, category: string | null): Record<string, any> {
  const defaultOffset = !resultType || resultType === "album" ? 2 : 0;
  const result: Record<string, any> = { category };
  const videoType = nav(data, [...PLAY_BUTTON, "playNavigationEndpoint", ...NAVIGATION_VIDEO_TYPE], true);

  // determine result type based on browseId
  //  if there was no category title (i.e. for extra results in Top Result)
  if (!resultType) {
    const browseId = nav(data, NAVIGATION_BROWSE_ID, true);
    if (browseId) {
      resultType = BROWSE_ID_RESULT_TYPES.find(([prefix]) => browseId.startsWith(prefix))?.[1] ?? null;
    } else {
      resultType =
        { MUSIC_VIDEO_TYPE_ATV: "song", MUSIC_VIDEO_TYPE_PODCAST_EPISODE: "episode" }[videoType as string] ?? "video";
    }
  }
  result.resultType = resultType;

  if (resultType !== "artist") result.title = getItemText(data, 0);

  if (resultType === "artist") {
    result.artist = getItemText(data, 0);
    parseMenuPlaylists(data, result);
  } else if (resultType === "album") {
    result.type = getItemText(data, 1);
    result.playlistId = parseAlbumPlaylistIdIfExists(nav(data, [...PLAY_BUTTON, "playNavigationEndpoint"], true));
  } else if (resultType === "playlist") {
    const flexItem: any[] = nav(getFlexColumnItem(data, 1), TEXT_RUNS);
    const hasAuthor = flexItem.length === defaultOffset + 3;
    const itemInfoText = (getItemText(data, 1, hasAuthor ? 2 : 0) ?? "").split(" ");
    result.itemCount = itemInfoText.length >= 2 && itemInfoText[1] === "songs" ? itemInfoText[0] : null;
    if (result.itemCount && isNumeric(result.itemCount)) result.itemCount = toInt(result.itemCount);
    result.author = hasAuthor ? getItemText(data, 1, defaultOffset) : null;
  } else if (resultType === "station") {
    result.videoId = nav(data, NAVIGATION_VIDEO_ID);
    result.playlistId = nav(data, NAVIGATION_PLAYLIST_ID);
  } else if (resultType === "profile") {
    result.name = getItemText(data, 1, 2, true);
  } else if (resultType === "song") {
    result.album = null;
    Object.assign(result, parseSongMenuData(data));
  } else if (resultType === "upload") {
    const browseId = nav(data, NAVIGATION_BROWSE_ID, true);
    if (!browseId) {
      // song result
      const flexItems = [0, 1].map((i) => nav(getFlexColumnItem(data, i), ["text", "runs"], true));
      if (flexItems[0]?.length) {
        result.videoId = nav(flexItems[0][0], NAVIGATION_VIDEO_ID, true);
        result.playlistId = nav(flexItems[0][0], NAVIGATION_PLAYLIST_ID, true);
      }
      if (flexItems[1]?.length) Object.assign(result, parseSongRuns(flexItems[1]));
      result.resultType = "song";
    } else {
      // artist or album result
      result.browseId = browseId;
      if (browseId.includes("artist")) {
        result.resultType = "artist";
      } else {
        const flexItem2 = getFlexColumnItem(data, 1);
        const runs: string[] = flexItem2
          ? (flexItem2.text.runs as any[]).filter((_, i) => i % 2 === 0).map((run) => run.text)
          : [];
        if (runs.length > 1) result.artist = runs[1];
        if (runs.length > 2) result.releaseDate = runs[2]; // date may be missing
        result.resultType = "album";
      }
    }
  }

  const isPlayable = resultType === "song" || resultType === "video" || resultType === "episode";
  if (isPlayable) {
    result.videoId = nav(data, [...PLAY_BUTTON, "playNavigationEndpoint", "watchEndpoint", "videoId"], true);
    result.videoType = videoType;
    result.isAvailable = has(data, "musicItemRendererDisplayPolicy")
      ? data.musicItemRendererDisplayPolicy !== "MUSIC_ITEM_RENDERER_DISPLAY_POLICY_GREY_OUT"
      : true;
  }

  if (resultType === "song" || resultType === "video" || resultType === "album") {
    result.duration = null;
    result.year = null;
    const flexItem = getFlexColumnItem(data, 1);
    if (!flexItem) throw new YTMusicError("Expected flex column item at index 1");
    // copy: upstream extends the response's runs list in place
    const runs: any[] = [...flexItem.text.runs];
    const flexItem2 = getFlexColumnItem(data, 2);
    if (flexItem2) runs.push({ text: "" }, ...flexItem2.text.runs); // first item is a dummy separator
    Object.assign(result, parseSongRuns(runs, true));
  }

  if (["artist", "album", "playlist", "profile", "podcast"].includes(resultType as string)) {
    result.browseId = nav(data, NAVIGATION_BROWSE_ID, true);
  }

  if (resultType === "song" || resultType === "album") result.isExplicit = nav(data, BADGE_LABEL, true) !== null;

  if (resultType === "episode") {
    const runs = (nav(getFlexColumnItem(data, 1), TEXT_RUNS) as any[]).slice(defaultOffset);
    const hasDate = runs.length > 1 ? 1 : 0;
    result.live = Boolean(nav(data, ["badges", 0, "liveBadgeRenderer"], true));
    if (hasDate) result.date = runs[0].text;
    result.podcast = parseIdName(runs[hasDate * 2]);
  }

  result.thumbnails = nav(data, THUMBNAILS, true);
  return result;
}

export function parseSearchResults(results: readonly any[], resultType: string | null = null, category: string | null = null): any[] {
  return results.map((result) => parseSearchResult(nav(result, [MRLIR]), resultType, category));
}

/** Restricts {@link YTMusic.search} to one result type. */
export type SearchFilter =
  | "songs"
  | "videos"
  | "albums"
  | "artists"
  | "playlists"
  | "community_playlists"
  | "featured_playlists"
  | "uploads"
  | "profiles"
  | "podcasts"
  | "episodes";
/** Searches the user's library or uploads instead of the whole catalog (requires authentication). */
export type SearchScope = "library" | "uploads";

/** Search params for the search request, based on filter, scope and spelling correction. */
export function getSearchParams(filter: string | null | undefined, scope: string | null | undefined, ignoreSpelling: boolean): string | null {
  const filteredParam1 = "EgWKAQ";
  let params: string | null = null;
  let param1 = "";
  let param2 = "";
  let param3 = "";
  if (!filter && !scope && !ignoreSpelling) return null;

  if (scope === "uploads") params = "agIYAw%3D%3D";

  if (scope === "library") {
    if (filter) {
      param1 = filteredParam1;
      param2 = getParam2(filter);
      param3 = "AWoKEAUQCRADEAoYBA%3D%3D";
    } else {
      params = "agIYBA%3D%3D";
    }
  }

  if (!scope && filter) {
    if (filter === "playlists") {
      params = "Eg-KAQwIABAAGAAgACgB";
      params += ignoreSpelling ? "MABCAggBagoQBBADEAkQBRAK" : "MABqChAEEAMQCRAFEAo%3D";
    } else if (filter.includes("playlists")) {
      param1 = "EgeKAQQoA";
      param2 = filter === "featured_playlists" ? "Dg" : "EA"; // else community_playlists
      param3 = ignoreSpelling ? "BQgIIAWoMEA4QChADEAQQCRAF" : "BagwQDhAKEAMQBBAJEAU%3D";
    } else {
      param1 = filteredParam1;
      param2 = getParam2(filter);
      param3 = ignoreSpelling ? "AUICCAFqDBAOEAoQAxAEEAkQBQ%3D%3D" : "AWoMEA4QChADEAQQCRAF";
    }
  }

  if (!scope && !filter && ignoreSpelling) params = "EhGKAQ4IARABGAEgASgAOAFAAUICCAE%3D";

  return params || param1 + param2 + param3;
}

const FILTER_PARAMS: Record<string, string> = {
  songs: "II",
  videos: "IQ",
  albums: "IY",
  artists: "Ig",
  playlists: "Io",
  profiles: "JY",
  podcasts: "JQ",
  episodes: "JI",
};

function getParam2(filter: string): string {
  const param = FILTER_PARAMS[filter];
  if (param === undefined) throw new YTMusicError(`No search params for filter "${filter}"`);
  return param;
}

export interface SearchSuggestion {
  text: string;
  runs: any[];
  fromHistory: boolean;
  feedbackToken: string | null;
}

export function parseSearchSuggestions(results: any, detailedRuns: boolean): string[] | SearchSuggestion[] {
  const rawSuggestions: any[] | null = nav(results, ["contents", 0, "searchSuggestionsSectionRenderer", "contents"], true);
  if (!rawSuggestions?.length) return [];

  const suggestions: any[] = [];
  for (const raw of rawSuggestions) {
    let content: any;
    let feedbackToken: string | null = null;
    if (has(raw, "historySuggestionRenderer")) {
      content = raw.historySuggestionRenderer;
      feedbackToken = nav(content, ["serviceEndpoint", "feedbackEndpoint", "feedbackToken"], true);
    } else {
      content = nav(raw, ["searchSuggestionRenderer"]);
    }
    const text = nav(content, ["navigationEndpoint", "searchEndpoint", "query"]);
    const runs = nav(content, ["suggestion", "runs"]);
    suggestions.push(detailedRuns ? { text, runs, fromHistory: feedbackToken !== null, feedbackToken } : text);
  }
  return suggestions;
}

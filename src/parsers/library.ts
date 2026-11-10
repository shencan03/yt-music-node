/** Port of ytmusicapi/parsers/library.py. */
import { getContinuations, type RequestFn } from "../continuations.ts";
import {
  GRID,
  ITEM_SECTION,
  MENU_PLAYLIST_ID,
  MRLIR,
  MTRIR,
  MUSIC_SHELF,
  NAVIGATION_BROWSE,
  NAVIGATION_BROWSE_ID,
  PAGE_TYPE,
  SECTION_LIST,
  SECTION_LIST_ITEM,
  SINGLE_COLUMN,
  SINGLE_COLUMN_TAB,
  SUBTITLE,
  TAB_1_CONTENT,
  TAB_2_CONTENT,
  THUMBNAILS,
  THUMBNAIL_RENDERER,
  TITLE,
  TITLE_TEXT,
  findObjectByKey,
  nav,
  type Path,
} from "../nav.ts";
import { parseContentList } from "./browsing.ts";
import { parsePlaylistItems } from "./playlists.ts";
import { parsePodcast } from "./podcasts.ts";
import { has } from "./py.ts";
import { parseSongRuns } from "./songs.ts";
import { getItemText, parseMenuPlaylists } from "./utils.ts";

export function parseArtists(results: readonly any[], uploaded = false): any[] {
  return results.map((result) => {
    const data = nav(result, [MRLIR]);
    const artist: Record<string, any> = {
      browseId: nav(data, NAVIGATION_BROWSE_ID),
      artist: getItemText(data, 0),
    };
    const pageType = nav(data, [...NAVIGATION_BROWSE, ...PAGE_TYPE], true);
    if (pageType === "MUSIC_PAGE_TYPE_USER_CHANNEL") artist.type = "channel";
    else if (pageType === "MUSIC_PAGE_TYPE_ARTIST") artist.type = "artist";
    parseMenuPlaylists(data, artist);
    if (uploaded) {
      artist.songs = (getItemText(data, 1) ?? "").split(" ")[0];
    } else {
      const subtitle = getItemText(data, 1);
      if (subtitle) artist.subscribers = subtitle.split(" ")[0];
    }
    artist.thumbnails = nav(data, THUMBNAILS, true);
    return artist;
  });
}

export function parseAlbums(results: readonly any[]): any[] {
  return results.map((result) => {
    const data = nav(result, [MTRIR]);
    const album: Record<string, any> = {
      browseId: nav(data, [...TITLE, ...NAVIGATION_BROWSE_ID]),
      playlistId: nav(data, MENU_PLAYLIST_ID, true),
      title: nav(data, TITLE_TEXT),
      thumbnails: nav(data, THUMBNAIL_RENDERER, true),
    };
    if (has(data.subtitle, "runs")) {
      album.type = nav(data, SUBTITLE);
      Object.assign(album, parseSongRuns(data.subtitle.runs.slice(2)));
    }
    return album;
  });
}

async function parseLibraryContinued(
  results: any,
  firstPage: any[],
  continuationType: string,
  requestFn: RequestFn,
  parseFn: (items: any[]) => any[],
  limit: number | null | undefined,
): Promise<any[]> {
  if (has(results, "continuations")) {
    const remaining = limit == null ? null : limit - firstPage.length;
    firstPage.push(...(await getContinuations(results, continuationType, remaining, requestFn, parseFn)));
  }
  return firstPage;
}

export function parseLibraryAlbums(response: any, requestFn: RequestFn, limit: number | null | undefined): Promise<any[]> {
  const results = getLibraryContents(response, GRID);
  if (results === null) return Promise.resolve([]);
  return parseLibraryContinued(results, parseAlbums(results.items), "gridContinuation", requestFn, parseAlbums, limit);
}

export function parseLibraryPodcasts(response: any, requestFn: RequestFn, limit: number | null | undefined): Promise<any[]> {
  const results = getLibraryContents(response, GRID);
  if (results === null) return Promise.resolve([]);
  const parseFn = (contents: any[]) => parseContentList(contents, parsePodcast);
  // skip first entry "Add podcast"
  return parseLibraryContinued(results, parseFn(results.items.slice(1)), "gridContinuation", requestFn, parseFn, limit);
}

export function parseLibraryArtists(response: any, requestFn: RequestFn, limit: number | null | undefined): Promise<any[]> {
  const results = getLibraryContents(response, MUSIC_SHELF);
  if (results === null) return Promise.resolve([]);
  const parseFn = (contents: any[]) => parseArtists(contents);
  return parseLibraryContinued(results, parseFn(results.contents), "musicShelfContinuation", requestFn, parseFn, limit);
}

/** Removes the random mix that conditionally appears at the start of library songs (in place). */
export function popSongsRandomMix(results: any): void {
  if (results && results.contents.length >= 2) results.contents.shift();
}

export function parseLibrarySongs(response: any): { results: any; parsed: any[] | null } {
  const results = getLibraryContents(response, MUSIC_SHELF);
  popSongsRandomMix(results);
  return { results, parsed: results ? parsePlaylistItems(results.contents) : null };
}

/**
 * Finds library contents. Supports both the old and new library response layouts.
 * @param renderer GRID or MUSIC_SHELF
 */
export function getLibraryContents(response: any, renderer: Path): any | null {
  const section = nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST], true);
  if (section === null) {
    // empty library or uploads
    // covers the case of non-premium subscribers - no downloads tab
    const numTabs = (nav(response, [...SINGLE_COLUMN, "tabs"]) as any[]).length;
    const libraryTab = numTabs < 3 ? TAB_1_CONTENT : TAB_2_CONTENT;
    return nav(response, [...SINGLE_COLUMN, ...libraryTab, ...SECTION_LIST_ITEM, ...renderer], true);
  }
  const results = findObjectByKey(section, "itemSectionRenderer");
  if (results === null) return nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST_ITEM, ...renderer], true);
  return nav(results, [...ITEM_SECTION, ...renderer], true);
}

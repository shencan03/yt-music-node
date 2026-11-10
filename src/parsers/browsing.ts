/** Port of ytmusicapi/parsers/browsing.py. */
import {
  BADGE_LABEL,
  CAROUSEL_STRAPLINE,
  CAROUSEL_TITLE,
  DESCRIPTION,
  DESCRIPTION_SHELF,
  MENU_ITEMS,
  MENU_SERVICE,
  MMRIR,
  MRLIR,
  MTRIR,
  NAVIGATION_BROWSE,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_PLAYLIST_ID,
  NAVIGATION_VIDEO_ID,
  NAVIGATION_VIDEO_TYPE,
  NAVIGATION_WATCH_PLAYLIST_ID,
  PAGE_TYPE,
  PLAY_BUTTON,
  QUEUE_VIDEO_ID,
  RUN_TEXT,
  SUBTITLE,
  SUBTITLE2,
  SUBTITLE_BADGE_LABEL,
  SUBTITLE_RUNS,
  TEXT_RUN,
  TEXT_RUNS,
  TEXT_RUN_TEXT,
  THUMBNAILS,
  THUMBNAIL_OVERLAY_NAVIGATION,
  THUMBNAIL_RENDERER,
  TITLE,
  TITLE_TEXT,
  WATCH_PLAYLIST_ID,
  WATCH_VIDEO_ID,
  nav,
} from "../nav.ts";
import { YTMusicNavigationError } from "../errors.ts";
import { parseAlbumPlaylistIdIfExists } from "./albums.ts";
import { parseEpisode, parsePodcast } from "./podcasts.ts";
import { has, isNumeric, or } from "./py.ts";
import { parseArtistsRuns, parseSongRuns } from "./songs.ts";
import { getDotSeparatorIndex, getFlexColumnItem, parseIdName } from "./utils.ts";

export interface MixedContentSection {
  title: string | null;
  contents: any[] | string;
}

/** Parses home/related style sections: carousels of mixed item types and description shelves. */
export function parseMixedContent(rows: readonly any[]): MixedContentSection[] {
  const items: MixedContentSection[] = [];
  for (const row of rows) {
    let title: string | null;
    let contents: any[] | string;
    if (has(row, DESCRIPTION_SHELF[0])) {
      const results = nav(row, DESCRIPTION_SHELF);
      title = nav(results, ["header", ...RUN_TEXT]);
      contents = nav(results, DESCRIPTION);
    } else {
      const results = Object.values(row)[0] as any;
      if (!has(results, "contents")) continue;
      // some carousel headers only carry a strapline (e.g. "MORE FROM") instead of a title
      title = or(nav(results, [...CAROUSEL_TITLE, "text"], true), nav(results, [...CAROUSEL_STRAPLINE, "text"], true));
      contents = [];
      for (const result of results.contents) {
        let content: any = null;
        let data = nav(result, [MTRIR], true);
        if (data) {
          const pageType = nav(data, [...TITLE, ...NAVIGATION_BROWSE, ...PAGE_TYPE], true);
          if (pageType === null) {
            // song or watch_playlist
            if (nav(data, NAVIGATION_WATCH_PLAYLIST_ID, true) !== null) content = parseWatchPlaylist(data);
            else if (nav(data, NAVIGATION_VIDEO_ID, true) !== null) content = parseSong(data);
            // Deleted uploads can still appear in Listen again
            // without a usable browse or playback destination.
            else continue;
          } else if (pageType === "MUSIC_PAGE_TYPE_ALBUM" || pageType === "MUSIC_PAGE_TYPE_AUDIOBOOK") {
            content = parseAlbum(data);
          } else if (pageType === "MUSIC_PAGE_TYPE_ARTIST" || pageType === "MUSIC_PAGE_TYPE_USER_CHANNEL") {
            content = parseRelatedArtist(data);
          } else if (pageType === "MUSIC_PAGE_TYPE_PLAYLIST") {
            content = parsePlaylist(data);
          } else if (pageType === "MUSIC_PAGE_TYPE_PODCAST_SHOW_DETAIL_PAGE") {
            content = parsePodcast(data);
          }
        } else if ((data = nav(result, [MRLIR], true))) {
          content = parseSongFlat(data);
        } else if ((data = nav(result, [MMRIR], true))) {
          content = parseEpisode(data);
        } else {
          continue;
        }
        contents.push(content);
      }
    }
    items.push({ title, contents });
  }
  return items;
}

/** Parses the items of a carousel that use renderer `key`, skipping other renderer types. */
export function parseContentList<T>(results: readonly any[], parseFunc: (data: any) => T, key: string = MTRIR): T[] {
  const contents: T[] = [];
  for (const result of results) {
    // carousels can mix renderer types (e.g. songs/videos alongside playlists)
    if (!has(result, key)) continue;
    contents.push(parseFunc(result[key]));
  }
  return contents;
}

function parseAlbumSingleSubtitle(result: any, albumOrSingle: Record<string, any>): Record<string, any> {
  const typeOrYear = nav(result, SUBTITLE, true);
  if (typeOrYear) {
    if (isNumeric(typeOrYear)) {
      albumOrSingle.year = typeOrYear;
    } else {
      albumOrSingle.type = typeOrYear;
      const year = nav(result, SUBTITLE2, true);
      if (year && isNumeric(year)) albumOrSingle.year = year;
    }
  }
  return albumOrSingle;
}

export function parseAlbum(result: any): Record<string, any> {
  const album = {
    title: nav(result, TITLE_TEXT),
    artists: ((nav(result, ["subtitle", "runs"], true) ?? []) as any[])
      .filter((x) => has(x, "navigationEndpoint"))
      .map(parseIdName),
    browseId: nav(result, [...TITLE, ...NAVIGATION_BROWSE_ID]),
    audioPlaylistId: parseAlbumPlaylistIdIfExists(nav(result, THUMBNAIL_OVERLAY_NAVIGATION, true)),
    thumbnails: nav(result, THUMBNAIL_RENDERER, true),
    isExplicit: nav(result, SUBTITLE_BADGE_LABEL, true) !== null,
  };
  return parseAlbumSingleSubtitle(result, album);
}

export function parseSingle(result: any): Record<string, any> {
  const single = {
    title: nav(result, TITLE_TEXT),
    browseId: nav(result, [...TITLE, ...NAVIGATION_BROWSE_ID]),
    thumbnails: nav(result, THUMBNAIL_RENDERER, true),
  };
  return parseAlbumSingleSubtitle(result, single);
}

export function parseSong(result: any): Record<string, any> {
  return {
    title: nav(result, TITLE_TEXT),
    videoId: nav(result, NAVIGATION_VIDEO_ID),
    playlistId: nav(result, NAVIGATION_PLAYLIST_ID, true),
    thumbnails: nav(result, THUMBNAIL_RENDERER, true),
    ...parseSongRuns(nav(result, SUBTITLE_RUNS), true),
  };
}

export function parseSongFlat(data: any, withPlaylistId = false): Record<string, any> {
  const columns = (nav(data, ["flexColumns"]) as any[]).map((_, i) => getFlexColumnItem(data, i));
  // podcast episodes link their title to the episode page instead of a watchEndpoint,
  // so the playable videoId must come from the play button instead
  const videoId = or(
    or(
      nav(columns[0], [...TEXT_RUN, ...NAVIGATION_VIDEO_ID], true),
      nav(data, [...PLAY_BUTTON, "playNavigationEndpoint", ...WATCH_VIDEO_ID], true),
    ),
    // greyed-out tracks have neither, only playlistItemData
    nav(data, ["playlistItemData", "videoId"], true),
  );
  const song: Record<string, any> = {
    title: nav(columns[0], TEXT_RUN_TEXT),
    videoId,
    videoType: nav(data, [...PLAY_BUTTON, "playNavigationEndpoint", ...NAVIGATION_VIDEO_TYPE], true),
    thumbnails: nav(data, THUMBNAILS, true),
    isExplicit: nav(data, BADGE_LABEL, true) !== null,
  };
  if (withPlaylistId) {
    // optional: greyed-out tracks have no play button endpoint (upstream raises KeyError)
    song.playlistId = nav(data, [...PLAY_BUTTON, "playNavigationEndpoint", ...WATCH_PLAYLIST_ID], true);
  }

  Object.assign(song, parseSongRuns(nav(columns[1], TEXT_RUNS), true));

  if (columns.length > 2 && columns[2] != null && has(nav(columns[2], TEXT_RUN), "navigationEndpoint")) {
    song.album = {
      name: nav(columns[2], TEXT_RUN_TEXT),
      id: nav(columns[2], [...TEXT_RUN, ...NAVIGATION_BROWSE_ID]),
    };
  }
  return song;
}

export function parseVideo(result: any): Record<string, any> {
  const runs: any[] = nav(result, SUBTITLE_RUNS);
  const artistsLen = getDotSeparatorIndex(runs);
  let videoId = nav(result, NAVIGATION_VIDEO_ID, true);
  if (!videoId) {
    const menuItems: any[] = nav(result, MENU_ITEMS);
    videoId = menuItems.map((entry) => nav(entry, [...MENU_SERVICE, ...QUEUE_VIDEO_ID], true)).find(Boolean);
    if (!videoId) throw new YTMusicNavigationError([...MENU_ITEMS, "*", ...MENU_SERVICE, ...QUEUE_VIDEO_ID], "videoId", result);
  }
  return {
    title: nav(result, TITLE_TEXT),
    videoId,
    artists: parseArtistsRuns(runs.slice(0, artistsLen)),
    playlistId: nav(result, NAVIGATION_PLAYLIST_ID, true),
    thumbnails: nav(result, THUMBNAIL_RENDERER, true),
    views: nav(runs, [-1, "text"]).split(" ")[0],
  };
}

export function parsePlaylist(data: any): Record<string, any> {
  const playlistId = (nav(data, [...TITLE, ...NAVIGATION_BROWSE_ID]) as string).slice(2);
  const menuItems: any[] = nav(data, ["menu", "menuRenderer", "items"], true) ?? [];
  const playlist: Record<string, any> = {
    // rare but possible for playlist title to be missing
    title: nav(data, TITLE_TEXT, true),
    playlistId,
    thumbnails: nav(data, THUMBNAIL_RENDERER, true),
    owned: menuItems.some(
      (item) =>
        nav(item, ["menuNavigationItemRenderer", "navigationEndpoint", "playlistEditorEndpoint", "playlistId"], true) ===
        playlistId,
    ),
  };
  const subtitle = nav(data, ["subtitle"]);
  if (has(subtitle, "runs")) {
    playlist.description = subtitle.runs.map((run: any) => run.text).join("");
    if (subtitle.runs.length === 3 && /\p{Nd}+ /u.test(nav(data, SUBTITLE2))) {
      playlist.count = nav(data, SUBTITLE2).split(" ")[0];
      playlist.author = parseArtistsRuns(subtitle.runs.slice(0, 1));
    }
  }
  return playlist;
}

export function parseRelatedArtist(data: any): Record<string, any> {
  let subscribers = nav(data, SUBTITLE, true);
  if (subscribers) subscribers = subscribers.split(" ")[0];
  return {
    title: nav(data, TITLE_TEXT),
    browseId: nav(data, [...TITLE, ...NAVIGATION_BROWSE_ID]),
    subscribers,
    thumbnails: nav(data, THUMBNAIL_RENDERER, true),
  };
}

export function parseWatchPlaylist(data: any): Record<string, any> {
  return {
    title: nav(data, TITLE_TEXT),
    playlistId: nav(data, NAVIGATION_WATCH_PLAYLIST_ID),
    thumbnails: nav(data, THUMBNAIL_RENDERER, true),
  };
}

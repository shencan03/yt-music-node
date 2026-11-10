/** Port of ytmusicapi/parsers/playlists.py. */
import { getContinuations2025, type RequestBodyFn } from "../continuations.ts";
import {
  BADGE_LABEL,
  CONTENT,
  DESCRIPTION,
  DESCRIPTION_SHELF,
  EDITABLE_PLAYLIST_DETAIL_HEADER,
  ENGAGEMENT_BAR,
  HEADER,
  HEADER_DETAIL,
  MENU_ITEMS,
  MENU_LIKE_STATUS,
  MENU_SERVICE,
  MNIR,
  MRLIR,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_VIDEO_TYPE,
  PLAY_BUTTON,
  RESPONSIVE_HEADER,
  SECTION,
  SECTION_LIST_ITEM,
  SUBTITLE2,
  TAB_CONTENT,
  TEXT_RUN,
  TEXT_RUN_TEXT,
  THUMBNAILS,
  THUMBNAIL_CROPPED,
  TWO_COLUMN_RENDERER,
  nav,
} from "../nav.ts";
import { has, pyInt } from "./py.ts";
import { parseSongAlbum, parseSongArtists, parseSongMenuData, parseSongRun } from "./songs.ts";
import { getFixedColumnItem, getFlexColumnItem, getItemText, parseCount, parseDuration, sumTotalDuration, toInt } from "./utils.ts";

export function parsePlaylistHeader(response: any, language = "en"): Record<string, any> {
  const playlist: Record<string, any> = {};
  const editableHeader = nav(response, [...HEADER, ...EDITABLE_PLAYLIST_DETAIL_HEADER], true);
  playlist.owned = editableHeader !== null;
  playlist.privacy = "PUBLIC";
  let header: any;
  if (editableHeader !== null) {
    // owned playlist
    header = nav(editableHeader, HEADER_DETAIL);
    playlist.privacy = nav(editableHeader, ["editHeader", "musicPlaylistEditHeaderRenderer", "privacy"]);
  } else {
    header =
      nav(response, HEADER_DETAIL, true) ??
      nav(response, [...TWO_COLUMN_RENDERER, ...TAB_CONTENT, ...SECTION_LIST_ITEM, ...RESPONSIVE_HEADER]);
  }

  Object.assign(playlist, parsePlaylistHeaderMeta(header, language));
  if (playlist.thumbnails === null) playlist.thumbnails = nav(header, THUMBNAIL_CROPPED, true);
  playlist.description = nav(header, ["description", ...DESCRIPTION_SHELF, ...DESCRIPTION], true);
  playlist.year = nav(header, SUBTITLE2);
  return playlist;
}

export function parsePlaylistHeaderMeta(header: any, language = "en"): Record<string, any> {
  const meta: Record<string, any> = {
    views: null,
    duration: null,
    trackCount: null,
    title: ((header.title?.runs ?? []) as any[]).map((run) => run.text).join(""),
    thumbnails: nav(header, THUMBNAILS, true),
  };

  if (has(header, "facepile")) {
    const avatarRenderer = nav(header, ["facepile", "avatarStackViewModel", "rendererContext"]);
    const avatarCommand = nav(avatarRenderer, ["commandContext", "onTap", "innertubeCommand"], true);
    if (nav(avatarCommand, ["showEngagementPanelEndpoint", "identifier", "tag"], true) === "PAplaylist_collaborate") {
      const avatars: any[] = nav(header, ["facepile", "avatarStackViewModel", "avatars"]);
      meta.collaborators = {
        text: nav(avatarRenderer, ["accessibilityContext", "label"]),
        avatars: avatars.map((avatar) => nav(avatar, ["avatarViewModel", "image", "sources", 0])),
      };
    } else {
      meta.author = {
        name: nav(header, ["facepile", "avatarStackViewModel", "text", "content"]),
        id: nav(avatarCommand, ["browseEndpoint", "browseId"], true),
      };
    }
  }

  const runs = nav(header, ["secondSubtitle", "runs"], true);
  if (Array.isArray(runs)) {
    // runs: [views •] trackCount • duration
    const viewsOffset = runs.length > 3 ? 2 : 0;
    // upstream keeps only the digits: "2M views" → 2, "1.3M views" → 13
    meta.views = viewsOffset ? parseCount(runs[0].text, language) : null;
    meta.duration = runs.length > 1 ? runs[viewsOffset + 2].text : null;
    // upstream raises ValueError when the track count text has no digits
    meta.trackCount = toInt(runs[viewsOffset].text);
  }
  return meta;
}

/** Playlists of type `OLAK5uy_…` that belong to an album and use the two-column layout. */
export async function parseAudioPlaylist(
  response: any,
  limit: number | null | undefined,
  requestFn: RequestBodyFn,
): Promise<Record<string, any>> {
  const playlist: Record<string, any> = {
    owned: false,
    privacy: "PUBLIC",
    description: null,
    views: null,
    duration: null,
    tracks: [],
    thumbnails: [],
    related: [],
  };

  const sectionList = nav(response, [...TWO_COLUMN_RENDERER, "secondaryContents", ...SECTION]);
  const contentData = nav(sectionList, [...CONTENT, "musicPlaylistShelfRenderer"]);
  playlist.id = nav(contentData, ["targetId"]);
  playlist.tracks = [];
  if (has(contentData, "contents")) {
    playlist.tracks = parsePlaylistItems(contentData.contents);
    // see getPlaylist: the first page counts towards the limit (upstream passes `limit` unchanged)
    const remaining = limit == null ? null : limit - playlist.tracks.length;
    playlist.tracks.push(...(await getContinuations2025(contentData, remaining, requestFn, (c) => parsePlaylistItems(c))));
  }
  playlist.trackCount = playlist.tracks.length;
  playlist.title = nav(playlist.tracks, [0, "album", "name"], true);
  playlist.duration_seconds = sumTotalDuration(playlist);
  return playlist;
}

export function parsePlaylistItems(results: readonly any[], isAlbum = false, isCollaborative = false): any[] {
  const songs: any[] = [];
  for (const result of results) {
    if (!has(result, MRLIR)) continue;
    const song = parsePlaylistItem(result[MRLIR], isAlbum, isCollaborative);
    if (song) songs.push(song);
  }
  return songs;
}

export function parsePlaylistItem(data: any, isAlbum = false, isCollaborative = false): Record<string, any> | null {
  let videoId: string | null = null;
  let setVideoId: string | null = null;
  let creditsBrowseId: string | null = null;
  let like: string | null = null;

  // if the item has a menu, find its setVideoId
  if (has(data, "menu")) {
    for (const item of nav(data, MENU_ITEMS) as any[]) {
      if (has(item, "menuServiceItemRenderer")) {
        const menuService = nav(item, MENU_SERVICE);
        if (has(menuService, "playlistEditEndpoint")) {
          setVideoId = nav(menuService, ["playlistEditEndpoint", "actions", 0, "setVideoId"], true);
          videoId = nav(menuService, ["playlistEditEndpoint", "actions", 0, "removedVideoId"], true);
        }
      } else if (has(item, MNIR)) {
        const maybeCredits = nav(item, [MNIR, ...NAVIGATION_BROWSE_ID], true);
        if (maybeCredits && maybeCredits.startsWith("MPTC")) creditsBrowseId = maybeCredits;
      }
    }
  }

  const songMenuData = { inLibrary: null, pinnedToListenAgain: null, ...parseSongMenuData(data) };

  // if item is not playable, the videoId was retrieved above
  const playButton = nav(data, PLAY_BUTTON, true);
  if (playButton !== null && has(playButton, "playNavigationEndpoint")) {
    videoId = nav(playButton, ["playNavigationEndpoint", "watchEndpoint", "videoId"]);
    if (has(data, "menu")) like = nav(data, MENU_LIKE_STATUS, true);
  }

  let isAvailable = true;
  if (has(data, "musicItemRendererDisplayPolicy")) {
    isAvailable = data.musicItemRendererDisplayPolicy !== "MUSIC_ITEM_RENDERER_DISPLAY_POLICY_GREY_OUT";
  }

  // For unavailable items and for album track lists indexes are preset,
  // because meaning of the flex column cannot be reliably found using navigationEndpoint
  const usePresetColumns = !isAvailable || isAlbum;

  let titleIndex: number | null = usePresetColumns ? 0 : null;
  let artistIndex: number | null = usePresetColumns ? 1 : null;
  let durationIndex: number | null = null;
  // collaborative playlists have duration in flexColumns (between artist and album)
  let albumIndex: number | null = isCollaborative ? 3 : usePresetColumns ? 2 : null;
  const userChannelIndexes: number[] = [];
  let unrecognizedIndex: number | null = null;

  const flexColumns: any[] = nav(data, ["flexColumns"]);
  for (let index = 0; index < flexColumns.length; index++) {
    const flexColumnItem = getFlexColumnItem(data, index);
    const navigationEndpoint = nav(flexColumnItem, [...TEXT_RUN, "navigationEndpoint"], true);

    if (!navigationEndpoint) {
      const run = nav(flexColumnItem, TEXT_RUN, true);
      if (run && has(run, "text")) {
        if (parseSongRun(run).type === "duration") durationIndex = index;
        else unrecognizedIndex ??= index;
      }
      continue;
    }

    if (has(navigationEndpoint, "watchEndpoint")) {
      titleIndex = index;
    } else if (has(navigationEndpoint, "browseEndpoint")) {
      const pageType = nav(navigationEndpoint, [
        "browseEndpoint",
        "browseEndpointContextSupportedConfigs",
        "browseEndpointContextMusicConfig",
        "pageType",
      ]);
      // MUSIC_PAGE_TYPE_ARTIST for regular songs, MUSIC_PAGE_TYPE_UNKNOWN for uploads
      if (pageType === "MUSIC_PAGE_TYPE_ARTIST" || pageType === "MUSIC_PAGE_TYPE_UNKNOWN") artistIndex = index;
      else if (pageType === "MUSIC_PAGE_TYPE_ALBUM" || pageType === "MUSIC_PAGE_TYPE_AUDIOBOOK") albumIndex = index;
      else if (pageType === "MUSIC_PAGE_TYPE_USER_CHANNEL") userChannelIndexes.push(index);
      // Non music videos, for example: podcast episodes
      else if (pageType === "MUSIC_PAGE_TYPE_NON_MUSIC_AUDIO_TRACK_PAGE") titleIndex = index;
    }
  }

  // Extra check for rare songs, where artist is non-clickable and does not have navigationEndpoint
  if (artistIndex === null && unrecognizedIndex !== null) artistIndex = unrecognizedIndex;
  // Extra check for non-song videos, last channel is treated as artist
  if (artistIndex === null && userChannelIndexes.length > 0) artistIndex = userChannelIndexes.at(-1)!;

  const title = titleIndex !== null ? getItemText(data, titleIndex) : null;
  if (title === "Song deleted") return null;

  const artists = artistIndex !== null ? parseSongArtists(data, artistIndex) : null;
  const album = albumIndex !== null ? parseSongAlbum(data, albumIndex) : null;
  const views = isAlbum ? getItemText(data, 2) : null;

  // upstream: `if duration_index` (index 0 is the title, so it never holds the duration)
  let duration = durationIndex ? getItemText(data, durationIndex) : null;
  if (has(data, "fixedColumns")) {
    const fixed = getFixedColumnItem(data, 0);
    duration = has(nav(fixed, ["text"]), "simpleText") ? nav(fixed, ["text", "simpleText"]) : nav(fixed, TEXT_RUN_TEXT);
  }

  const votingStatus = nav(data, ENGAGEMENT_BAR, true);

  const song: Record<string, any> = {
    videoId,
    title,
    artists,
    album,
    likeStatus: like,
    ...songMenuData,
    thumbnails: nav(data, THUMBNAILS, true),
    isAvailable,
    isExplicit: nav(data, BADGE_LABEL, true) !== null,
    videoType: nav(data, [...MENU_ITEMS, 0, MNIR, "navigationEndpoint", ...NAVIGATION_VIDEO_TYPE], true),
    views,
    communityVoteStatus:
      votingStatus === null ? null : { netVoteValue: votingStatus.votes, status: votingStatus.status },
  };

  if (isAlbum) song.trackNumber = isAvailable ? pyInt(nav(data, ["index", "runs", 0, "text"])) : null;
  if (duration) {
    song.duration = duration;
    song.duration_seconds = parseDuration(duration);
  }
  if (setVideoId) song.setVideoId = setVideoId;
  if (creditsBrowseId) song.creditsBrowseId = creditsBrowseId;
  return song;
}

export function validatePlaylistId(playlistId: string): string {
  return playlistId.startsWith("VL") ? playlistId.slice(2) : playlistId;
}

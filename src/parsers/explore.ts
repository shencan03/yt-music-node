/** Port of ytmusicapi/parsers/explore.py. */
import {
  ICON_TYPE,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_VIDEO_TYPE,
  PLAY_BUTTON,
  TEXT_RUN_TEXT,
  THUMBNAILS,
  THUMBNAIL_RENDERER,
  TITLE,
  TITLE_TEXT,
  nav,
} from "../nav.ts";
import { parseSongFlat } from "./browsing.ts";
import { DURATION_TEXT, PROGRESS_RENDERER, parseEpisode, parseEpisodeFlat } from "./podcasts.ts";
import { getFlexColumnItem, parseIdName } from "./utils.ts";

const TRENDS: Record<string, string> = {
  ARROW_DROP_UP: "up",
  ARROW_DROP_DOWN: "down",
  ARROW_CHART_NEUTRAL: "neutral",
};

const PLAY_VIDEO_TYPE = [...PLAY_BUTTON, "playNavigationEndpoint", ...NAVIGATION_VIDEO_TYPE] as const;

export function parseChartSong(data: any): Record<string, any> {
  const videoType = nav(data, PLAY_VIDEO_TYPE, true);
  const parsed =
    videoType === "MUSIC_VIDEO_TYPE_PODCAST_EPISODE" ? parseEpisodeFlat(data) : parseSongFlat(data, true);
  return { ...parsed, ...parseRanking(data, false) };
}

export function parseTrendingItem(data: any): Record<string, any> {
  // optional: greyed-out (unplayable) tracks have no play endpoint; upstream raises KeyError
  const videoType = nav(data, PLAY_VIDEO_TYPE, true);
  return videoType === "MUSIC_VIDEO_TYPE_PODCAST_EPISODE" ? parseEpisodeFlat(data) : parseSongFlat(data, true);
}

export function parseChartPlaylist(data: any): Record<string, any> {
  return {
    title: nav(data, TITLE_TEXT),
    playlistId: (nav(data, [...TITLE, ...NAVIGATION_BROWSE_ID]) as string).slice(2),
    thumbnails: nav(data, THUMBNAIL_RENDERER, true),
  };
}

export function parseChartEpisode(data: any): Record<string, any> {
  const { index: _index, ...episode } = parseEpisode(data);
  episode.podcast = parseIdName(nav(data, ["secondTitle", "runs", 0]));
  // upstream reads only playbackProgress, which current responses lack; the subtitle is "<date> • <duration>"
  const subtitleRuns: any[] | null = nav(data, ["subtitle", "runs"], true);
  episode.duration =
    nav(data, ["playbackProgress", ...PROGRESS_RENDERER, ...DURATION_TEXT], true) ??
    (subtitleRuns && subtitleRuns.length >= 3 ? (nav(subtitleRuns, [-1, "text"], true) ?? null) : null);
  return episode;
}

export function parseChartArtist(data: any): Record<string, any> {
  const subscribersColumn = getFlexColumnItem(data, 1);
  const subscribers = subscribersColumn ? (nav(subscribersColumn, TEXT_RUN_TEXT) as string).split(" ")[0] : null;
  return {
    title: nav(getFlexColumnItem(data, 0), TEXT_RUN_TEXT),
    browseId: nav(data, NAVIGATION_BROWSE_ID),
    subscribers,
    thumbnails: nav(data, THUMBNAILS, true),
    ...parseRanking(data, true),
  };
}

export function parseRanking(data: any, noneIfAbsent: boolean): { rank: string | null; trend: string | null } {
  const column = ["customIndexColumn", "musicCustomIndexColumnRenderer"];
  const trendIconType = noneIfAbsent ? nav(data, [...column, ...ICON_TYPE], true) : nav(data, [...column, ...ICON_TYPE]);
  const rank = noneIfAbsent ? nav(data, [...column, ...TEXT_RUN_TEXT], true) : nav(data, [...column, ...TEXT_RUN_TEXT]);
  return { rank, trend: trendIconType != null ? (TRENDS[trendIconType] ?? null) : null };
}

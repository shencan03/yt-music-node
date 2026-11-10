/** Port of ytmusicapi/parsers/podcasts.py. */
import {
  DESCRIPTION,
  DESCRIPTION_SHELF,
  ICON_TYPE,
  MNIR,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_VIDEO_TYPE,
  PLAY_BUTTON,
  RUN_TEXT,
  SUBTITLE,
  SUBTITLE_RUNS,
  TEXT_RUN,
  TEXT_RUN_TEXT,
  THUMBNAILS,
  THUMBNAIL_OVERLAY,
  THUMBNAIL_RENDERER,
  TITLE,
  TITLE_TEXT,
  TOGGLED_BUTTON,
  WATCH_PLAYLIST_ID,
  WATCH_VIDEO_ID,
  nav,
} from "../nav.ts";
import { or } from "./py.ts";
import { getFlexColumnItem, parseIdName } from "./utils.ts";

export const PROGRESS_RENDERER = ["musicPlaybackProgressRenderer"] as const;
export const DURATION_TEXT = ["durationText", "runs", 1, "text"] as const;

/**
 * One element of a parsed description. Upstream uses `DescriptionElement` / `Link` / `Timestamp`
 * classes; here a `type` discriminator tells them apart.
 */
export type DescriptionElement =
  | { type: "text"; text: string }
  | { type: "link"; text: string; url: string }
  | { type: "timestamp"; text: string; seconds: number | null };

/** A parsed description: its elements, plus `text`, the concatenated plain text. */
export interface Description {
  text: string;
  elements: DescriptionElement[];
}

export function parseDescription(descriptionRuns: readonly any[]): Description {
  const elements: DescriptionElement[] = [];
  for (const run of descriptionRuns) {
    const endpoint = nav(run, ["navigationEndpoint"], true);
    if (endpoint) {
      if (endpoint.urlEndpoint) {
        elements.push({ type: "link", text: run.text, url: endpoint.urlEndpoint.url });
      } else if (endpoint.watchEndpoint) {
        elements.push({
          type: "timestamp",
          text: run.text,
          seconds: nav(endpoint, ["watchEndpoint", "startTimeSeconds"], true) ?? null,
        });
      } else {
        elements.push({ type: "text", text: "" });
      }
    } else {
      elements.push({ type: "text", text: nav(run, ["text"], true) ?? "" });
    }
  }
  return { text: elements.map((e) => e.text).join(""), elements };
}

/** Common left hand side (header) items of an episode or podcast page. */
export function parseBaseHeader(header: any): Record<string, any> {
  const strapline = nav(header, ["straplineTextOne"]);
  const author = {
    name: nav(strapline, RUN_TEXT, true) ?? null,
    id: nav(strapline, ["runs", 0, ...NAVIGATION_BROWSE_ID], true) ?? null,
  };
  return {
    author: author.name ? author : null,
    title: nav(header, TITLE_TEXT),
    thumbnails: nav(header, THUMBNAILS, true) ?? null,
  };
}

export function parsePodcastHeader(header: any): Record<string, any> {
  const metadata = parseBaseHeader(header);
  metadata.description = nav(header, ["description", ...DESCRIPTION_SHELF, ...DESCRIPTION], true) ?? null;
  metadata.saved = nav(header, ["buttons", 1, ...TOGGLED_BUTTON]);
  return metadata;
}

export function parseEpisodeHeader(header: any): Record<string, any> {
  const metadata = parseBaseHeader(header);
  metadata.date = nav(header, SUBTITLE);
  const progressRenderer = nav(header, ["progress", ...PROGRESS_RENDERER]);
  metadata.duration = nav(progressRenderer, DURATION_TEXT, true) ?? null;
  metadata.progressPercentage = nav(progressRenderer, ["playbackProgressPercentage"]);
  metadata.saved = or(nav(header, ["buttons", 0, ...TOGGLED_BUTTON], true), false);

  metadata.playlistId = null;
  for (const button of nav(header, ["buttons", -1, "menuRenderer", "items"]) as any[]) {
    if (nav(button, [MNIR, ...ICON_TYPE], true) === "BROADCAST") {
      metadata.playlistId = nav(button, [MNIR, ...NAVIGATION_BROWSE_ID]);
    }
  }
  return metadata;
}

/** A single episode under "Episodes" on a channel page or on a podcast page. */
export function parseEpisode(data: any): Record<string, any> {
  return {
    index: nav(data, ["onTap", "watchEndpoint", "index"], true) ?? null,
    title: nav(data, TITLE_TEXT),
    description: nav(data, DESCRIPTION, true) ?? null,
    duration: nav(data, ["playbackProgress", ...PROGRESS_RENDERER, ...DURATION_TEXT], true) ?? null,
    videoId: nav(data, ["onTap", ...WATCH_VIDEO_ID], true) ?? null,
    browseId: nav(data, [...TITLE, ...NAVIGATION_BROWSE_ID], true) ?? null,
    videoType: nav(data, ["onTap", ...NAVIGATION_VIDEO_TYPE], true) ?? null,
    date: nav(data, SUBTITLE, true) ?? null,
    thumbnails: nav(data, THUMBNAILS, true) ?? null,
  };
}

export function parseEpisodeFlat(data: any): Record<string, any> {
  return {
    title: nav(getFlexColumnItem(data, 0), TEXT_RUN_TEXT),
    podcast: parseIdName(nav(getFlexColumnItem(data, 1), TEXT_RUN)),
    videoId: nav(data, ["playlistItemData", "videoId"]),
    browseId: nav(getFlexColumnItem(data, 0), [...TEXT_RUN, ...NAVIGATION_BROWSE_ID]),
    playlistId: nav(data, [...PLAY_BUTTON, "playNavigationEndpoint", ...WATCH_PLAYLIST_ID]),
    videoType: nav(data, [...PLAY_BUTTON, "playNavigationEndpoint", ...NAVIGATION_VIDEO_TYPE]),
    date: nav(getFlexColumnItem(data, 2), TEXT_RUN_TEXT),
    thumbnails: nav(data, THUMBNAILS, true) ?? null,
  };
}

/** A single podcast under "Podcasts" on a channel page. */
export function parsePodcast(data: any): Record<string, any> {
  return {
    title: nav(data, TITLE_TEXT),
    channel: parseIdName(nav(data, [...SUBTITLE_RUNS, 0], true)),
    browseId: nav(data, [...TITLE, ...NAVIGATION_BROWSE_ID]),
    podcastId: nav(data, THUMBNAIL_OVERLAY, true) ?? null,
    thumbnails: nav(data, THUMBNAIL_RENDERER, true) ?? null,
  };
}

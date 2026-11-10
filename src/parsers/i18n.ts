/**
 * Port of ytmusicapi/parsers/i18n.py. Every function takes the client's translator explicitly
 * instead of reading a module-global `_`.
 */
import type { Translator } from "../i18n/index.ts";
import { CAROUSEL, CAROUSEL_TITLE, MMRIR, MTRIR, NAVIGATION_BROWSE, NAVIGATION_BROWSE_ID, nav } from "../nav.ts";
import { parseAlbum, parseContentList, parsePlaylist, parseRelatedArtist, parseSingle, parseVideo } from "./browsing.ts";
import { parseEpisode, parsePodcast } from "./podcasts.ts";
import { has } from "./py.ts";

export function getSearchResultTypes(t: Translator): string[] {
  return ["album", "artist", "playlist", "song", "video", "station", "profile", "podcast", "episode"].map(t);
}

export function getApiResultTypes(t: Translator): string[] {
  return [t("single"), t("ep"), ...getSearchResultTypes(t)];
}

export function getSongCreditSectionMap(t: Translator): Record<string, string> {
  const keys = ["performed_by", "written_by", "produced_by", "music_metadata_provided_by"];
  return Object.fromEntries(keys.map((key) => [t(key), key]));
}

export interface ChannelSection {
  browseId: string | null;
  params?: string | null;
  results: any[];
}

/** Parses the carousels of an artist/channel page into `albums`, `singles`, `videos`, … */
export function parseChannelContents(results: readonly any[], t: Translator): Record<string, ChannelSection> {
  const categories: [string, string, (data: any) => any, string][] = [
    ["albums", t("albums"), parseAlbum, MTRIR],
    ["singles", t("singles & eps"), parseSingle, MTRIR],
    ["shows", t("shows"), parseAlbum, MTRIR],
    ["videos", t("videos"), parseVideo, MTRIR],
    ["playlists", t("playlists"), parsePlaylist, MTRIR],
    ["related", t("related"), parseRelatedArtist, MTRIR],
    ["episodes", t("episodes"), parseEpisode, MMRIR],
    ["podcasts", t("podcasts"), parsePodcast, MTRIR],
  ];
  const artist: Record<string, ChannelSection> = {};
  for (const [category, categoryLocal, categoryParser, categoryKey] of categories) {
    const data = results
      .filter(
        (r) =>
          has(r, "musicCarouselShelfRenderer") &&
          String(nav(r, [...CAROUSEL, ...CAROUSEL_TITLE]).text).toLowerCase() === categoryLocal.toLowerCase(),
      )
      .map((r) => r.musicCarouselShelfRenderer);
    if (data.length === 0) continue;

    const section: ChannelSection = { browseId: null, results: [] };
    if (has(nav(data[0], CAROUSEL_TITLE), "navigationEndpoint")) {
      section.browseId = nav(data[0], [...CAROUSEL_TITLE, ...NAVIGATION_BROWSE_ID]);
      section.params = nav(data[0], [...CAROUSEL_TITLE, ...NAVIGATION_BROWSE, "params"], true);
    }
    section.results = parseContentList(data[0].contents, categoryParser, categoryKey);
    artist[category] = section;
  }
  return artist;
}

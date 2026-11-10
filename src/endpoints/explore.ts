/** Port of ytmusicapi/mixins/explore.py and mixins/charts.py. */
import type { CallOptions, ClientContext } from "../context.ts";
import {
  CAROUSEL,
  CAROUSEL_CONTENTS,
  CAROUSEL_TITLE,
  CATEGORY_PARAMS,
  CATEGORY_TITLE,
  FRAMEWORK_MUTATIONS,
  GRID,
  GRID_ITEMS,
  MMRIR,
  MRLIR,
  MTRIR,
  MUSIC_SHELF,
  NAVIGATION_BROWSE_ID,
  SECTION_LIST,
  SINGLE_COLUMN_TAB,
  TITLE,
  TITLE_TEXT,
  nav,
  type Path,
} from "../nav.ts";
import { parseAlbum, parseContentList, parsePlaylist, parseVideo } from "../parsers/browsing.ts";
import { parseChartArtist, parseChartEpisode, parseChartPlaylist, parseChartSong, parseTrendingItem } from "../parsers/explore.ts";
import { has } from "../parsers/py.ts";
import type { Charts, Explore, MoodCategories, MoodCategory, PlaylistSummary } from "../types/results.ts";

// extra playlist carousel some countries return between the video charts and the artists
const COUNTRY_EXTRA_CATEGORY: Record<string, string> = { US: "genres", IN: "languages" };

function isPlaylistCarousel(contents: readonly any[]): boolean {
  const browseId = nav(contents[0], [MTRIR, ...TITLE, ...NAVIGATION_BROWSE_ID], true);
  return Boolean(browseId && browseId.startsWith("VL"));
}

function isArtistCarousel(contents: readonly any[]): boolean {
  return has(contents[0], MRLIR);
}

function parseCategory(category: any): MoodCategory {
  return { title: nav(category, CATEGORY_TITLE), params: nav(category, CATEGORY_PARAMS) };
}

export const exploreMethods = {
  /** Mood and genre categories, grouped by section title. Use `params` with {@link getMoodPlaylists}. */
  async getMoodCategories(this: ClientContext, options: CallOptions = {}): Promise<MoodCategories> {
    const response = await this.sendRequest("browse", { browseId: "FEmusic_moods_and_genres" }, { signal: options.signal });
    const sections: MoodCategories = {};
    for (const section of nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST]) as any[]) {
      const title = nav(section, [...GRID, "header", "gridHeaderRenderer", ...TITLE_TEXT]);
      sections[title] = (nav(section, GRID_ITEMS) as any[]).map(parseCategory);
    }
    return sections;
  },

  /** Playlists of a mood or genre, using `params` from {@link getMoodCategories}. */
  async getMoodPlaylists(this: ClientContext, params: string, options: CallOptions = {}): Promise<PlaylistSummary[]> {
    const response = await this.sendRequest(
      "browse",
      { browseId: "FEmusic_moods_and_genres_category", params },
      { signal: options.signal },
    );
    const playlists: PlaylistSummary[] = [];
    for (const section of nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST]) as any[]) {
      let path: Path | null = null;
      if (has(section, "gridRenderer")) path = GRID_ITEMS;
      else if (has(section, "musicCarouselShelfRenderer")) path = CAROUSEL_CONTENTS;
      else if (has(section, "musicImmersiveCarouselShelfRenderer")) path = ["musicImmersiveCarouselShelfRenderer", "contents"];
      if (path) playlists.push(...(parseContentList(nav(section, path), parsePlaylist) as PlaylistSummary[]));
    }
    return playlists;
  },

  /** The explore page: new releases, moods & genres, top songs, trending, top episodes, new videos. */
  async getExplore(this: ClientContext, options: CallOptions = {}): Promise<Explore> {
    const response = await this.sendRequest("browse", { browseId: "FEmusic_explore" }, { signal: options.signal });
    const explore: Record<string, any> = {};
    for (const result of nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST]) as any[]) {
      const browseId: string | null = nav(result, [...CAROUSEL, ...CAROUSEL_TITLE, ...NAVIGATION_BROWSE_ID], true);
      if (browseId === null) continue;
      const contents = nav(result, CAROUSEL_CONTENTS);
      if (browseId === "FEmusic_new_releases_albums") {
        explore.new_releases = parseContentList(contents, parseAlbum);
      } else if (browseId === "FEmusic_moods_and_genres") {
        explore.moods_and_genres = (contents as any[]).map(parseCategory);
      } else if (browseId === "FEmusic_top_non_music_audio_episodes") {
        explore.top_episodes = parseContentList(contents, parseChartEpisode, MMRIR);
      } else if (browseId === "FEmusic_new_releases_videos") {
        explore.new_videos = parseContentList(contents, parseVideo, MTRIR);
      } else if (browseId.startsWith("VLPL")) {
        explore.top_songs = { playlist: browseId, items: parseContentList(contents, parseChartSong, MRLIR) };
      } else if (browseId.startsWith("VLOLA")) {
        explore.trending = { playlist: browseId, items: parseContentList(contents, parseTrendingItem, MRLIR) };
      }
    }
    return explore as Explore;
  },

  /**
   * Latest charts of a country: video chart playlists, genre/language playlists (US/IN), artists.
   */
  async getCharts(
    this: ClientContext,
    options: ChartsOptions = {},
  ): Promise<Charts> {
    const { country = "ZZ", signal } = options;
    const body: Record<string, any> = { browseId: "FEmusic_charts" };
    if (country) body.formData = { selectedValues: [country] };

    const response = await this.sendRequest("browse", body, { signal });
    const results: any[] = nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST]);
    const menu = nav(results[0], [
      ...MUSIC_SHELF,
      "subheaders",
      0,
      "musicSideAlignedItemRenderer",
      "startItems",
      0,
      "musicSortFilterButtonRenderer",
    ]);
    const charts: Record<string, any> = {
      countries: {
        selected: nav(menu, TITLE),
        options: (nav(response, FRAMEWORK_MUTATIONS) as any[])
          .map((m) => nav(m, ["payload", "musicFormBooleanChoice", "opaqueToken"], true))
          .filter(Boolean),
      },
    };

    // carousels carry no machine-readable identity, so recognize them by their contents;
    // anything else (some regions add an album chart) is ignored instead of shifting the
    // categories that come after it
    const carousels = results
      .slice(1)
      .map((section) => nav(section, CAROUSEL_CONTENTS, true))
      .filter((c): c is any[] => Array.isArray(c) && c.length > 0);
    const playlistCarousels = carousels.filter(isPlaylistCarousel);
    const artistCarousels = carousels.filter(isArtistCarousel);

    let playlistNames = ["videos"];
    const extra = COUNTRY_EXTRA_CATEGORY[country];
    if (extra) playlistNames.push(extra);
    // premium sessions get daily and weekly carousels in place of the "videos" one
    if (playlistCarousels.length > playlistNames.length) playlistNames = ["daily", "weekly", ...playlistNames.slice(1)];

    // like Python's zip: YTM omits categories unpredictably (e.g. "genres" in some US responses)
    playlistNames.slice(0, playlistCarousels.length).forEach((name, i) => {
      charts[name] = parseContentList(playlistCarousels[i]!, parseChartPlaylist, MTRIR);
    });
    if (artistCarousels.length > 0) charts.artists = parseContentList(artistCarousels[0]!, parseChartArtist, MRLIR);
    return charts as Charts;
  },
};

/** Options of {@link YTMusic.getCharts}. */
export interface ChartsOptions extends CallOptions {
  /** ISO 3166-1 alpha-2 country code. Default: `"ZZ"` (global). */
  country?: string;
}

/** Explore, mood and chart methods of {@link YTMusic}. */
export type ExploreMethods = typeof exploreMethods;

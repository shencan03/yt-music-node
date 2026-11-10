/** Port of ytmusicapi/mixins/browsing.py. */
import { getContinuations, getReloadableContinuationParams } from "../continuations.ts";
import { YTM_DOMAIN } from "../constants.ts";
import { MOBILE_CLIENT, type CallOptions, type ClientContext, type LimitOptions } from "../context.ts";
import { YTMusicError, YTMusicUserError } from "../errors.ts";
import {
  CAROUSEL,
  CAROUSEL_CONTENTS,
  CONTENT,
  CREDITS_SECTIONS,
  DESCRIPTION,
  DESCRIPTION_RUN_LIST,
  DESCRIPTION_SHELF,
  GRID,
  GRID_ITEMS,
  HEADER_MUSIC_VISUAL,
  HEADER_SIDE,
  MULTI_SELECT,
  MUSIC_SHELF,
  NAVIGATION_BROWSE_ID,
  NAVIGATION_PLAYLIST_ID,
  NAVIGATION_WATCH_PLAYLIST_ID,
  RUN_TEXT,
  SECTION,
  SECTION_LIST,
  SECTION_LIST_CONTINUATION,
  SECTION_LIST_ITEM,
  SINGLE_COLUMN_TAB,
  SUBTITLE_RUNS,
  TAB_CONTENT,
  TASTE_PROFILE_ARTIST,
  TASTE_PROFILE_ITEMS,
  THUMBNAILS,
  TIMESTAMPED_LYRICS,
  TITLE,
  TITLE_TEXT,
  TWO_COLUMN_RENDERER,
  findObjectByKey,
  nav,
} from "../nav.ts";
import { parseAlbumHeader2024 } from "../parsers/albums.ts";
import { parseAlbum, parseContentList, parseMixedContent, parsePlaylist, parseVideo } from "../parsers/browsing.ts";
import { getSongCreditSectionMap, parseChannelContents } from "../parsers/i18n.ts";
import { parseAlbums } from "../parsers/library.ts";
import { parsePlaylistItems } from "../parsers/playlists.ts";
import { has, or, pyInt } from "../parsers/py.ts";
import { parseDescriptionRuns, sumTotalDuration } from "../parsers/utils.ts";
import type {
  Album,
  AlbumSummary,
  Artist,
  HomeSection,
  Lyrics,
  PlaylistSummary,
  SongCredits,
  SongPlayerResponse,
  TasteProfile,
  TimedLyrics,
  User,
  VideoSummary,
} from "../types/results.ts";
import type { JsonObject } from "../types/json.ts";

/** Sort order of {@link YTMusic.getArtistAlbums}. */
export type ArtistOrder = "Recency" | "Popularity" | "Alphabetical order";

/** Options of {@link YTMusic.getHome}. */
export interface HomeOptions extends CallOptions {
  /** Number of rows to aim for. Default: 3 (the first page). */
  limit?: number;
}

/** Options of {@link YTMusic.getArtistAlbums}. */
export interface ArtistAlbumsOptions extends LimitOptions {
  /** Sort order. Default: the page's own order. */
  order?: ArtistOrder;
}

/** Options of {@link YTMusic.getSong}. */
export interface GetSongOptions extends CallOptions {
  /**
   * The `signatureTimestamp` of the current player (see {@link YTMusic.getSignatureTimestamp}),
   * needed for valid stream URLs. Default: an estimate from today's date.
   */
  signatureTimestamp?: number;
}

/** Options of {@link YTMusic.getLyrics}. */
export interface LyricsOptions extends CallOptions {
  /** Request timed lyrics (sent as the mobile app). Default: `false`. */
  timestamps?: boolean;
}

/** Options of {@link YTMusic.getSignatureTimestamp}. */
export interface SignatureTimestampOptions extends CallOptions {
  /** URL of `base.js`. Default: looked up with {@link YTMusic.getBasejsUrl} (and cached for an hour). */
  url?: string;
}

/** Options of {@link YTMusic.setTasteProfile}. */
export interface SetTasteProfileOptions extends CallOptions {
  /** Result of {@link YTMusic.getTasteProfile}. Default: fetched. */
  tasteProfile?: TasteProfile;
}

const BASEJS_TTL_MS = 60 * 60 * 1000;

/** Days since the Unix epoch (UTC). Used for the default signature timestamp in {@link getSong}. */
export function getDatestamp(now: number = Date.now()): number {
  return Math.floor(now / 86_400_000);
}

export const browsingMethods = {
  /**
   * Returns the home page: titled rows of music suggestions. The first request returns 3 rows;
   * further rows are fetched until `limit` is reached.
   */
  async getHome(this: ClientContext, options: HomeOptions = {}): Promise<HomeSection[]> {
    const { limit = 3, signal } = options;
    const body = { browseId: "FEmusic_home" };
    const response = await this.sendRequest("browse", body, { signal });
    const home = parseMixedContent(nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST]));

    const sectionList = nav(response, [...SINGLE_COLUMN_TAB, "sectionListRenderer"]);
    if (has(sectionList, "continuations")) {
      const requestFn = (additionalParams: string) => this.sendRequest("browse", body, { additionalParams, signal });
      home.push(...(await getContinuations(sectionList, "sectionListContinuation", limit - home.length, requestFn, parseMixedContent)));
    }
    return home as HomeSection[];
  },

  /** Information about an artist and their top releases (songs, albums, singles, videos, related). */
  async getArtist(this: ClientContext, channelId: string, options: CallOptions = {}): Promise<Artist> {
    channelId = channelId.startsWith("MPLA") ? channelId.slice(4) : channelId;
    const response = await this.sendRequest("browse", { browseId: channelId }, { signal: options.signal });
    // some artist pages use twoColumnBrowseResultsRenderer instead of singleColumn (#929)
    const results: any[] =
      nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST], true) ??
      nav(response, [...TWO_COLUMN_RENDERER, ...TAB_CONTENT, ...SECTION_LIST]);

    const artist: Record<string, any> = { description: null, descriptionRuns: [], views: null };
    const header = nav(response, ["header", "musicImmersiveHeaderRenderer"]);
    artist.name = nav(header, TITLE_TEXT);

    const descriptionShelf = findObjectByKey(results, DESCRIPTION_SHELF[0], undefined, true);
    if (descriptionShelf) {
      const [description, descriptionRuns] = parseDescriptionRuns(nav(descriptionShelf, DESCRIPTION_RUN_LIST));
      artist.description = description;
      artist.descriptionRuns = descriptionRuns;
      artist.views = has(descriptionShelf, "subheader") ? nav(descriptionShelf, ["subheader", "runs", 0, "text"]) : null;
    }

    const subscriptionButton = nav(header, ["subscriptionButton", "subscribeButtonRenderer"]);
    artist.channelId = subscriptionButton.channelId;
    artist.shuffleId = nav(header, ["playButton", "buttonRenderer", ...NAVIGATION_PLAYLIST_ID], true);
    const radioButton = nav(header, ["startRadioButton", "buttonRenderer"], true);
    // the page for the artist's own channelId links the radio with a watchPlaylistEndpoint
    artist.radioId = or(nav(radioButton, NAVIGATION_PLAYLIST_ID, true), nav(radioButton, NAVIGATION_WATCH_PLAYLIST_ID, true));
    artist.subscribers = nav(subscriptionButton, ["subscriberCountText", "runs", 0, "text"], true);
    const monthlyListeners: string | null = nav(header, ["monthlyListenerCount", "runs", 0, "text"], true);
    artist.monthlyListeners = monthlyListeners ? monthlyListeners.replace(" monthly audience", "") : null;
    artist.subscribed = subscriptionButton.subscribed;
    artist.thumbnails = nav(header, THUMBNAILS, true);
    artist.songs = { browseId: null };
    // API sometimes does not return songs
    if (results.length > 0 && has(results[0], "musicShelfRenderer")) {
      const musicShelf = nav(results[0], MUSIC_SHELF);
      if (has(nav(musicShelf, TITLE), "navigationEndpoint")) {
        artist.songs.browseId = nav(musicShelf, [...TITLE, ...NAVIGATION_BROWSE_ID]);
      }
      artist.songs.results = parsePlaylistItems(musicShelf.contents);
    }

    Object.assign(artist, parseChannelContents(results, this.t));
    return artist as Artist;
  },

  /**
   * All albums or singles of an artist. Use the `browseId` and `params` of the artist's
   * `albums`/`singles` section from {@link getArtist}.
   */
  async getArtistAlbums(
    this: ClientContext,
    channelId: string,
    params: string,
    options: ArtistAlbumsOptions = {},
  ): Promise<AlbumSummary[]> {
    const { limit = 100, order, signal } = options;
    const body = { browseId: channelId, params };
    let response = await this.sendRequest("browse", body, { signal });
    const requestFn = (additionalParams: string) => this.sendRequest("browse", body, { additionalParams, signal });

    let results: any;
    if (order) {
      // pick the correct continuation from response depending on the order chosen
      const sortOptions: any[] = nav(response, [
        ...SINGLE_COLUMN_TAB,
        ...SECTION,
        ...HEADER_SIDE,
        "endItems",
        0,
        "musicSortFilterButtonRenderer",
        "menu",
        "musicMultiSelectMenuRenderer",
        "options",
      ]);
      const option = sortOptions.find((o) => String(nav(o, [...MULTI_SELECT, ...TITLE_TEXT])).toLowerCase() === order.toLowerCase());
      if (!option) throw new YTMusicUserError(`Invalid order parameter ${order}`);
      const continuation = nav(option, [
        ...MULTI_SELECT,
        "selectedCommand",
        "commandExecutorCommand",
        "commands",
        -1,
        "browseSectionListReloadEndpoint",
      ]);
      // request the reload continuation and replace the original response
      response = await requestFn(getReloadableContinuationParams({ continuations: [continuation.continuation] }));
      results = nav(response, [...SECTION_LIST_CONTINUATION, ...CONTENT]);
    } else {
      // just use the results from the first request
      results = nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST_ITEM]);
    }

    const contents = or(nav(results, GRID_ITEMS, true), null) ?? nav(results, CAROUSEL_CONTENTS);
    const albums = parseAlbums(contents);

    const grid = nav(results, GRID, true);
    if (has(grid, "continuations")) {
      const remaining = limit == null ? null : limit - albums.length;
      albums.push(...(await getContinuations(grid, "gridContinuation", remaining, requestFn, parseAlbums)));
    }
    return albums as AlbumSummary[];
  },

  /** A user's page (name, playlists, videos). */
  async getUser(this: ClientContext, channelId: string, options: CallOptions = {}): Promise<User> {
    const response = await this.sendRequest("browse", { browseId: channelId }, { signal: options.signal });
    const user: Record<string, any> = { name: nav(response, [...HEADER_MUSIC_VISUAL, ...TITLE_TEXT]) };
    Object.assign(user, parseChannelContents(nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST]), this.t));
    return user as User;
  },

  /** All playlists of a user, using `params` from the user's `playlists` section in {@link getUser}. */
  async getUserPlaylists(this: ClientContext, channelId: string, params: string, options: CallOptions = {}): Promise<PlaylistSummary[]> {
    const response = await this.sendRequest("browse", { browseId: channelId, params }, { signal: options.signal });
    const results = nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST_ITEM, ...GRID_ITEMS], true);
    return results?.length ? (parseContentList(results, parsePlaylist) as PlaylistSummary[]) : [];
  },

  /** All videos of a user, using `params` from the user's `videos` section in {@link getUser}. */
  async getUserVideos(this: ClientContext, channelId: string, params: string, options: CallOptions = {}): Promise<VideoSummary[]> {
    const response = await this.sendRequest("browse", { browseId: channelId, params }, { signal: options.signal });
    const results = nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST_ITEM, ...GRID_ITEMS], true);
    return results?.length ? (parseContentList(results, parseVideo) as VideoSummary[]) : [];
  },

  /**
   * An album's browseId (`MPREb_…`) from its audioPlaylistId (`OLAK5uy_…`).
   * @returns the browseId, or `null` if none was found
   */
  async getAlbumBrowseId(this: ClientContext, audioPlaylistId: string, options: CallOptions = {}): Promise<string | null> {
    const response = await this.sendGetRequest(`${YTM_DOMAIN}/playlist`, { params: { list: audioPlaylistId }, signal: options.signal });
    return extractAlbumBrowseId(response.text);
  },

  /** Album information and tracks. `browseId` must start with `MPRE`. */
  async getAlbum(this: ClientContext, browseId: string, options: CallOptions = {}): Promise<Album> {
    if (!browseId || !browseId.startsWith("MPRE")) {
      throw new YTMusicUserError("Invalid album browseId provided, must start with MPRE.");
    }
    const response = await this.sendRequest("browse", { browseId }, { signal: options.signal });
    const album = parseAlbumHeader2024(response);

    const results = nav(response, [...TWO_COLUMN_RENDERER, "secondaryContents", ...SECTION_LIST_ITEM, ...MUSIC_SHELF]);
    album.tracks = parsePlaylistItems(results.contents, true);

    const secondaryCarousels: any[] = or(nav(response, [...TWO_COLUMN_RENDERER, "secondaryContents", ...SECTION_LIST], true), []);
    for (const section of secondaryCarousels.slice(1)) {
      const carousel = nav(section, CAROUSEL);
      const key = (
        {
          COLLECTION_STYLE_ITEM_SIZE_SMALL: "related_recommendations",
          COLLECTION_STYLE_ITEM_SIZE_MEDIUM: "other_versions",
        } as Record<string, string>
      )[carousel.itemSize];
      // upstream raises KeyError for an unknown carousel size
      if (key) album[key] = parseContentList(carousel.contents, parseAlbum);
    }

    album.duration_seconds = sumTotalDuration(album);
    for (const track of album.tracks) {
      track.album = album.title;
      track.artists = or(track.artists, album.artists);
    }
    return album as Album;
  },

  /** Credits (performers, writers, producers) of a song. `browseId` starts with `MPTC`. */
  async getSongCredits(this: ClientContext, browseId: string, options: CallOptions = {}): Promise<SongCredits> {
    if (!browseId || !browseId.startsWith("MPTC")) {
      throw new YTMusicUserError("Invalid song credits browseId provided, must start with MPTC.");
    }
    const response = await this.sendRequest("browse", { browseId }, { signal: options.signal });
    const credits: Record<string, any> = { other_sections: [] };
    const sectionMap = getSongCreditSectionMap(this.t);
    for (const section of nav(response, CREDITS_SECTIONS) as any[]) {
      const content = nav(section, ["dismissableDialogContentSectionRenderer"]);
      const localName: string = nav(content, TITLE_TEXT);
      const runs: any[] = nav(content, SUBTITLE_RUNS);
      const sectionData = {
        localized_title: localName,
        data: runs.filter((_, i) => i % 2 === 0).map((item) => item.text),
      };
      const key = sectionMap[localName];
      if (key !== undefined) credits[key] = sectionData;
      else credits.other_sections.push(sectionData);
    }
    return credits as SongCredits;
  },

  /**
   * Metadata and streaming information about a song or video (the `player` response).
   *
   * Stream URLs in `streamingData` may require deciphering (`signatureCipher`), which is out of
   * scope for this library. Pass the current `signatureTimestamp` (see {@link getSignatureTimestamp})
   * for valid streaming URLs.
   */
  async getSong(this: ClientContext, videoId: string, options: GetSongOptions = {}): Promise<SongPlayerResponse> {
    const signatureTimestamp = options.signatureTimestamp || getDatestamp() - 1;
    const response = await this.sendRequest(
      "player",
      { playbackContext: { contentPlaybackContext: { signatureTimestamp } }, video_id: videoId },
      { signal: options.signal },
    );
    const keys = ["videoDetails", "playabilityStatus", "streamingData", "microformat", "playbackTracking"];
    return Object.fromEntries(Object.entries(response).filter(([k]) => keys.includes(k))) as SongPlayerResponse;
  },

  /** Related content for a song, using the `related` browseId from {@link getWatchPlaylist}. */
  async getSongRelated(this: ClientContext, browseId: string, options: CallOptions = {}): Promise<HomeSection[]> {
    if (!browseId) throw new YTMusicUserError("Invalid browseId provided.");
    const response = await this.sendRequest("browse", { browseId }, { signal: options.signal });
    return parseMixedContent(nav(response, ["contents", ...SECTION_LIST])) as HomeSection[];
  },

  /**
   * Song lyrics, using the `lyrics` browseId from {@link getWatchPlaylist}.
   *
   * With `timestamps: true` the request is sent as the mobile app, which returns timed lyrics when
   * available. Returns `null` when there are no lyrics.
   */
  async getLyrics(
    this: ClientContext,
    browseId: string,
    options: LyricsOptions = {},
  ): Promise<Lyrics | TimedLyrics | null> {
    if (!browseId) throw new YTMusicUserError("Invalid browseId provided. This song might not have lyrics.");
    const { timestamps = false, signal } = options;
    const response = await this.sendRequest("browse", { browseId }, timestamps ? { client: MOBILE_CLIENT, signal } : { signal });

    const data = timestamps ? nav(response, TIMESTAMPED_LYRICS, true) : null;
    if (data !== null) {
      // we got lyrics with timestamps
      if (!has(data, "timedLyricsData")) return null;
      const rawLyrics: any[] = data.timedLyricsData;
      const source = data.sourceMessage ?? null;
      if (rawLyrics.every((raw) => has(raw, "cueRange"))) {
        return { lyrics: rawLyrics.map(parseLyricLine), source, hasTimestamps: true };
      }
      return { lyrics: rawLyrics.map((raw) => raw.lyricLine).join("\n"), source, hasTimestamps: false };
    }

    const lyrics = nav(response, ["contents", ...SECTION_LIST_ITEM, ...DESCRIPTION_SHELF, ...DESCRIPTION], true);
    if (lyrics === null) return null;
    return {
      lyrics,
      source: nav(response, ["contents", ...SECTION_LIST_ITEM, ...DESCRIPTION_SHELF, ...RUN_TEXT], true),
      hasTimestamps: false,
    };
  },

  /** URL of the current `base.js` player script. Cached for an hour. */
  getBasejsUrl(this: ClientContext, options: CallOptions = {}): Promise<string> {
    return this.memo("basejs-url", BASEJS_TTL_MS, async () => {
      const response = await this.sendGetRequest(YTM_DOMAIN, { signal: options.signal });
      const match = /jsUrl"\s*:\s*"([^"]+)"/.exec(response.text);
      if (!match) throw new YTMusicError("Could not identify the URL for base.js player.");
      return YTM_DOMAIN + match[1];
    });
  },

  /**
   * The current `signatureTimestamp` from `base.js`, for {@link getSong}. Cached for an hour
   * unless an explicit `url` is passed.
   */
  getSignatureTimestamp(this: ClientContext, options: SignatureTimestampOptions = {}): Promise<number> {
    const fetchTimestamp = async () => {
      const url = options.url ?? (await browsingMethods.getBasejsUrl.call(this, options));
      const response = await this.sendGetRequest(url, { signal: options.signal });
      const match = /signatureTimestamp[:=](\d+)/.exec(response.text);
      if (!match) throw new YTMusicError("Unable to identify the signatureTimestamp.");
      return Number(match[1]);
    };
    return options.url ? fetchTimestamp() : this.memo("signature-timestamp", BASEJS_TTL_MS, fetchTimestamp);
  },

  /** The artists offered by the taste profile (requires authentication). */
  async getTasteProfile(this: ClientContext, options: CallOptions = {}): Promise<TasteProfile> {
    this.checkAuth();
    const response = await this.sendRequest("browse", { browseId: "FEmusic_tastebuilder" }, { signal: options.signal });
    const profiles: Record<string, { selectionValue: string; impressionValue: string }> = {};
    for (const itemList of nav(response, TASTE_PROFILE_ITEMS) as any[]) {
      for (const item of nav(itemList, ["tastebuilderItemListRenderer", "contents"]) as any[]) {
        const renderer = item.tastebuilderItemRenderer;
        const artist = nav(renderer, [...TASTE_PROFILE_ARTIST, 0, "text"]);
        profiles[artist] = {
          selectionValue: renderer.selectionFormValue,
          impressionValue: renderer.impressionFormValue,
        };
      }
    }
    return profiles;
  },

  /**
   * Favorites artists in the taste profile (requires authentication).
   * @param artists artist names as returned by {@link getTasteProfile}
   */
  async setTasteProfile(
    this: ClientContext,
    artists: readonly string[],
    options: SetTasteProfileOptions = {},
  ): Promise<void> {
    this.checkAuth();
    const profile = options.tasteProfile ?? (await browsingMethods.getTasteProfile.call(this, options));
    const formData = {
      impressionValues: Object.values(profile).map((p) => p.impressionValue),
      selectedValues: artists.map((artist) => {
        const entry = profile[artist];
        if (!entry) throw new YTMusicUserError(`The artist ${artist} was not present in taste!`);
        return entry.selectionValue;
      }),
    };
    await this.sendRequest("browse", { browseId: "FEmusic_home", formData } as JsonObject, { signal: options.signal, retry: false });
  },
};

/** Browsing methods of {@link YTMusic}: home, artists, albums, songs, lyrics, users, taste profile. */
export type BrowsingMethods = typeof browsingMethods;

function parseLyricLine(raw: any) {
  const cueRange = nav(raw, ["cueRange"]);
  return {
    text: nav(raw, ["lyricLine"]) as string,
    start_time: pyInt(String(cueRange.startTimeMilliseconds)),
    end_time: pyInt(String(cueRange.endTimeMilliseconds)),
    id: pyInt(String(nav(cueRange, ["metadata", "id"]))),
  };
}

/**
 * Finds the album browseId in a `/playlist` page. The page embeds JSON in JS strings (`\x22`, `\"`
 * escapes); upstream undoes them with `unicode_escape`, which also garbles non-ASCII text.
 */
export function extractAlbumBrowseId(html: string): string | null {
  // one pass, so `\\x22` stays a literal `\x22` and `\"` becomes `"`
  const decoded = html.replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|[^xu])/g, (_, esc: string) =>
    esc.length > 1 ? String.fromCharCode(Number.parseInt(esc.slice(1), 16)) : esc,
  );
  const match = /"(MPRE.+?)"/.exec(decoded);
  return match ? match[1]! : null;
}

/** Port of ytmusicapi/mixins/library.py and mixins/_utils.py. */
import {
  getContinuations,
  getValidatedContinuations,
} from "../continuations.ts";
import type { CallOptions, ClientContext } from "../context.ts";
import { YTMusicGatedError, YTMusicServerError, YTMusicUserError } from "../errors.ts";
import type { HttpResponse } from "../http.ts";
import { GRID, MUSIC_SHELF, SECTION_LIST, SINGLE_COLUMN_TAB, TITLE, TITLE_TEXT, nav } from "../nav.ts";
import { parseContentList, parsePlaylist } from "../parsers/browsing.ts";
import {
  getLibraryContents,
  parseLibraryAlbums,
  parseLibraryArtists,
  parseLibraryPodcasts,
  parseLibrarySongs,
} from "../parsers/library.ts";
import { parsePlaylistItems } from "../parsers/playlists.ts";
import { has, truthy } from "../parsers/py.ts";
import type { LikeStatus } from "../parsers/songs.ts";
import type {
  AccountInfo,
  AlbumSummary,
  HistoryItem,
  LibraryArtist,
  LibraryPlaylist,
  PlaylistItem,
  PodcastSummary,
  SongPlayerResponse,
} from "../types/results.ts";

/** Sort order of library listings. */
export type LibraryOrder = "a_to_z" | "z_to_a" | "recently_added";
const ORDERS: readonly LibraryOrder[] = ["a_to_z", "z_to_a", "recently_added"];
// from `.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[1]
// .itemSectionRenderer.header.itemSectionTabbedHeaderRenderer.endItems[1].dropdownRenderer.entries[]
// .dropdownItemRenderer.onSelectCommand.browseEndpoint.params` of a library browse response
const ORDER_PARAMS = ["ggMGKgQIARAA", "ggMGKgQIARAB", "ggMGKgQIABAB"];

/** Options of the library listings. */
export interface LibraryOptions extends CallOptions {
  /** Number of items to aim for; `null` returns everything. Default: 25. */
  limit?: number | null;
  /** Sort order. Default: the library's own order. */
  order?: LibraryOrder;
}

/** Options of {@link YTMusic.getLibrarySongs}. */
export interface LibrarySongsOptions extends LibraryOptions {
  /** Re-request pages that come back short (slower, more reliable). Default: `false`. */
  validateResponses?: boolean;
}

export function validateOrderParameter(order: string | null | undefined): void {
  if (order && !(ORDERS as readonly string[]).includes(order)) {
    throw new YTMusicUserError(
      `Invalid order provided. Please use one of the following orders or leave out the parameter: ${ORDERS.join(", ")}`,
    );
  }
}

export function prepareOrderParams(order: LibraryOrder): string {
  return ORDER_PARAMS[ORDERS.indexOf(order)]!;
}

export function prepareLikeEndpoint(rating: string): string {
  switch (rating) {
    case "LIKE":
      return "like/like";
    case "DISLIKE":
      return "like/dislike";
    case "INDIFFERENT":
      return "like/removelike";
    default:
      throw new YTMusicUserError("Invalid rating provided. Use one of LIKE, DISLIKE, INDIFFERENT.");
  }
}

/**
 * Checks that YTM performed a write request instead of answering with a dialog. A gated request
 * returns HTTP 200 with only a `showEngagementPanelEndpoint` action carrying the original request.
 */
export function validateWriteResponse(response: any): void {
  const panel = nav(response, ["actions", 0, "showEngagementPanelEndpoint"], true);
  if (panel === null) return;
  const tag = nav(panel, ["identifier", "tag"], true);
  throw new YTMusicGatedError(
    `YouTube Music did not perform this request and asked for interaction with its '${tag}' dialog. ` +
      "The account may be temporarily restricted from this action.",
  );
}

/** Characters of the client playback nonce (`cpn`). */
const CPN_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";

export function generateCpn(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => CPN_ALPHABET[b & 63]).join("");
}

function libraryBody(browseId: string, order?: LibraryOrder): Record<string, string> {
  validateOrderParameter(order);
  return order ? { browseId, params: prepareOrderParams(order) } : { browseId };
}

export const libraryMethods = {
  /** Playlists in the user's library. */
  async getLibraryPlaylists(this: ClientContext, options: Omit<LibraryOptions, "order"> = {}): Promise<LibraryPlaylist[]> {
    this.checkAuth();
    const { limit = 25, signal } = options;
    const body = { browseId: "FEmusic_liked_playlists" };
    const response = await this.sendRequest("browse", body, { signal });
    const results = getLibraryContents(response, GRID);
    if (results === null) return [];
    const parseFn = (contents: any[]) => parseContentList(contents, parsePlaylist);
    // skip the first item ("New playlist")
    const playlists = parseFn(results.items.slice(1));
    if (has(results, "continuations")) {
      const requestFn = (additionalParams: string) => this.sendRequest("browse", body, { additionalParams, signal });
      const remaining = limit == null ? null : limit - playlists.length;
      playlists.push(...(await getContinuations(results, "gridContinuation", remaining, requestFn, parseFn)));
    }
    return playlists as LibraryPlaylist[];
  },

  /**
   * Songs in the user's library.
   */
  async getLibrarySongs(
    this: ClientContext,
    options: LibrarySongsOptions = {},
  ): Promise<PlaylistItem[]> {
    this.checkAuth();
    const { limit = 25, order, validateResponses = false, signal } = options;
    const body = libraryBody("FEmusic_liked_videos", order);
    const perPage = 25;
    if (validateResponses && limit == null) {
      throw new YTMusicUserError("Validation is not supported without a limit parameter.");
    }

    const fetchFirstPage = async () => parseLibrarySongs(await this.sendRequest("browse", body, { signal }));
    let first = await fetchFirstPage();
    if (validateResponses) {
      const expected = Math.min(perPage, limit!);
      for (let retry = 0; (first.parsed?.length ?? 0) < expected && retry < 3; retry++) {
        const attempt = await fetchFirstPage();
        if ((attempt.parsed?.length ?? 0) > (first.parsed?.length ?? 0)) first = attempt;
      }
    }

    const { results, parsed: songs } = first;
    if (songs === null) return [];

    if (has(results, "continuations")) {
      const requestFn = (additionalParams: string) => this.sendRequest("browse", body, { additionalParams, signal });
      const parseFn = (contents: any[]) => parsePlaylistItems(contents);
      if (validateResponses) {
        songs.push(
          ...(await getValidatedContinuations(results, "musicShelfContinuation", limit! - songs.length, perPage, requestFn, parseFn)),
        );
      } else {
        const remaining = limit == null ? null : limit - songs.length;
        songs.push(...(await getContinuations(results, "musicShelfContinuation", remaining, requestFn, parseFn)));
      }
    }
    return songs as PlaylistItem[];
  },

  /** Albums in the user's library. */
  async getLibraryAlbums(this: ClientContext, options: LibraryOptions = {}): Promise<AlbumSummary[]> {
    this.checkAuth();
    const body = libraryBody("FEmusic_liked_albums", options.order);
    const response = await this.sendRequest("browse", body, { signal: options.signal });
    const requestFn = (additionalParams: string) => this.sendRequest("browse", body, { additionalParams, signal: options.signal });
    return (await parseLibraryAlbums(response, requestFn, options.limit === undefined ? 25 : options.limit)) as AlbumSummary[];
  },

  /** Artists of the songs in the user's library. */
  async getLibraryArtists(this: ClientContext, options: LibraryOptions = {}): Promise<LibraryArtist[]> {
    return libraryArtists(this, "FEmusic_library_corpus_track_artists", options);
  },

  /** Artists the user is subscribed to. */
  async getLibrarySubscriptions(this: ClientContext, options: LibraryOptions = {}): Promise<LibraryArtist[]> {
    return libraryArtists(this, "FEmusic_library_corpus_artists", options);
  },

  /** Podcasts in the user's library. */
  async getLibraryPodcasts(this: ClientContext, options: LibraryOptions = {}): Promise<PodcastSummary[]> {
    this.checkAuth();
    const body = libraryBody("FEmusic_library_non_music_audio_list", options.order);
    const response = await this.sendRequest("browse", body, { signal: options.signal });
    const requestFn = (additionalParams: string) => this.sendRequest("browse", body, { additionalParams, signal: options.signal });
    return (await parseLibraryPodcasts(response, requestFn, options.limit === undefined ? 25 : options.limit)) as PodcastSummary[];
  },

  /** Podcast channels the user is subscribed to. */
  async getLibraryChannels(this: ClientContext, options: LibraryOptions = {}): Promise<LibraryArtist[]> {
    return libraryArtists(this, "FEmusic_library_non_music_audio_channels_list", options);
  },

  /** The user's play history, newest first; each item has `played` (e.g. "Today"). */
  async getHistory(this: ClientContext, options: CallOptions = {}): Promise<HistoryItem[]> {
    this.checkAuth();
    const response = await this.sendRequest("browse", { browseId: "FEmusic_history" }, { signal: options.signal });
    const songs: HistoryItem[] = [];
    for (const content of nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST]) as any[]) {
      const data = nav(content, [...MUSIC_SHELF, "contents"], true);
      if (!truthy(data)) {
        // upstream passes the whole run object as the error message
        const error = nav(content, ["musicNotifierShelfRenderer", ...TITLE, "text"], true);
        throw new YTMusicServerError(error ?? "Unexpected history response", { body: content });
      }
      const played = nav(content.musicShelfRenderer, TITLE_TEXT);
      for (const song of parsePlaylistItems(data)) songs.push({ ...song, played } as HistoryItem);
    }
    return songs;
  },

  /**
   * Adds a song to the play history, using the `playbackTracking` URL from {@link getSong}.
   * Use the same client instance as for `getSong`. Status 204 means success.
   */
  async addHistoryItem(this: ClientContext, song: Pick<SongPlayerResponse, "playbackTracking">, options: CallOptions = {}): Promise<HttpResponse> {
    this.checkAuth();
    const url = nav(song, ["playbackTracking", "videostatsPlaybackUrl", "baseUrl"]);
    // a write: a retried ping could record the play twice
    return this.sendGetRequest(url, { params: { ver: 2, c: "WEB_REMIX", cpn: generateCpn() }, signal: options.signal, retry: false });
  },

  /**
   * Removes items from the play history, using `feedbackToken`s from {@link getHistory}.
   * Does not work with brand accounts.
   */
  async removeHistoryItems(this: ClientContext, feedbackTokens: readonly string[], options: CallOptions = {}): Promise<any> {
    this.checkAuth();
    return this.sendRequest("feedback", { feedbackTokens: [...feedbackTokens] }, { signal: options.signal, retry: false });
  },

  /** Rates a song: `"LIKE"`, `"DISLIKE"` or `"INDIFFERENT"` (removes the rating). */
  async rateSong(this: ClientContext, videoId: string, rating: LikeStatus = "INDIFFERENT", options: CallOptions = {}): Promise<any> {
    this.checkAuth();
    const response = await this.sendRequest(prepareLikeEndpoint(rating), { target: { videoId } }, { signal: options.signal, retry: false });
    validateWriteResponse(response);
    return response;
  },

  /**
   * Adds or removes songs from the library, using `feedbackTokens.add`/`.remove` from results
   * such as {@link getAlbum} tracks or {@link getLibrarySongs}.
   */
  async editSongLibraryStatus(this: ClientContext, feedbackTokens: readonly string[], options: CallOptions = {}): Promise<any> {
    this.checkAuth();
    const response = await this.sendRequest("feedback", { feedbackTokens: [...feedbackTokens] }, { signal: options.signal, retry: false });
    validateWriteResponse(response);
    return response;
  },

  /** Rates a playlist or album: `"LIKE"` saves it to the library, `"INDIFFERENT"` removes it. */
  async ratePlaylist(this: ClientContext, playlistId: string, rating: LikeStatus = "INDIFFERENT", options: CallOptions = {}): Promise<any> {
    this.checkAuth();
    const response = await this.sendRequest(prepareLikeEndpoint(rating), { target: { playlistId } }, { signal: options.signal, retry: false });
    validateWriteResponse(response);
    return response;
  },

  /** Subscribes to an artist (adds them to the library). */
  async subscribeArtist(this: ClientContext, channelId: string, options: CallOptions = {}): Promise<any> {
    this.checkAuth();
    return this.sendRequest("subscription/subscribe", { channelIds: [channelId] }, { signal: options.signal, retry: false });
  },

  /** Unsubscribes from artists. */
  async unsubscribeArtists(this: ClientContext, channelIds: readonly string[], options: CallOptions = {}): Promise<any> {
    this.checkAuth();
    return this.sendRequest("subscription/unsubscribe", { channelIds: [...channelIds] }, { signal: options.signal, retry: false });
  },

  /** Name, channel handle and photo of the authenticated account. */
  async getAccountInfo(this: ClientContext, options: CallOptions = {}): Promise<AccountInfo> {
    this.checkAuth();
    const response = await this.sendRequest("account/account_menu", {}, { signal: options.signal });
    const info = ["actions", 0, "openPopupAction", "popup", "multiPageMenuRenderer", "header", "activeAccountHeaderRenderer"];
    return {
      accountName: nav(response, [...info, "accountName", "runs", 0, "text"]),
      channelHandle: nav(response, [...info, "channelHandle", "runs", 0, "text"], true),
      accountPhotoUrl: nav(response, [...info, "accountPhoto", "thumbnails", 0, "url"]),
    };
  },
};

async function libraryArtists(ctx: ClientContext, browseId: string, options: LibraryOptions): Promise<LibraryArtist[]> {
  ctx.checkAuth();
  const body = libraryBody(browseId, options.order);
  const response = await ctx.sendRequest("browse", body, { signal: options.signal });
  const requestFn = (additionalParams: string) => ctx.sendRequest("browse", body, { additionalParams, signal: options.signal });
  return (await parseLibraryArtists(response, requestFn, options.limit === undefined ? 25 : options.limit)) as LibraryArtist[];
}

/** Library, rating, subscription, history and account methods of {@link YTMusic}. */
export type LibraryMethods = typeof libraryMethods;

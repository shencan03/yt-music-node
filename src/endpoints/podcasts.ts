/** Port of ytmusicapi/mixins/podcasts.py. */
import { getContinuations } from "../continuations.ts";
import type { CallOptions, ClientContext, LimitOptions } from "../context.ts";
import {
  DESCRIPTION_SHELF,
  GRID_ITEMS,
  HEADER_MUSIC_VISUAL,
  MMRIR,
  MUSIC_SHELF,
  RESPONSIVE_HEADER,
  SECTION_LIST,
  SECTION_LIST_ITEM,
  SINGLE_COLUMN_TAB,
  TAB_CONTENT,
  THUMBNAILS,
  TITLE_TEXT,
  TWO_COLUMN_RENDERER,
  nav,
} from "../nav.ts";
import { YTMusicServerError } from "../errors.ts";
import { parseContentList } from "../parsers/browsing.ts";
import { parseChannelContents } from "../parsers/i18n.ts";
import { parsePlaylistHeader } from "../parsers/playlists.ts";
import { parseDescription, parseEpisode, parseEpisodeHeader, parsePodcastHeader } from "../parsers/podcasts.ts";
import { has, truthy } from "../parsers/py.ts";
import type { Channel, Episode, EpisodeSummary, EpisodesPlaylist, Podcast } from "../types/results.ts";

const parseEpisodes = (contents: any[]) => parseContentList(contents, parseEpisode, MMRIR);

export const podcastMethods = {
  /** A podcast channel page: its podcasts and episodes. */
  async getChannel(this: ClientContext, channelId: string, options: CallOptions = {}): Promise<Channel> {
    const response = await this.sendRequest("browse", { browseId: channelId }, { signal: options.signal });
    const channel: Record<string, any> = {
      title: nav(response, [...HEADER_MUSIC_VISUAL, ...TITLE_TEXT]),
      thumbnails: nav(response, [...HEADER_MUSIC_VISUAL, ...THUMBNAILS], true),
    };
    Object.assign(channel, parseChannelContents(nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST]), this.t));
    return channel as Channel;
  },

  /** All episodes of a channel, using `params` from the channel's `episodes` section. */
  async getChannelEpisodes(this: ClientContext, channelId: string, params: string, options: CallOptions = {}): Promise<EpisodeSummary[]> {
    const response = await this.sendRequest("browse", { browseId: channelId, params }, { signal: options.signal });
    return parseEpisodes(nav(response, [...SINGLE_COLUMN_TAB, ...SECTION_LIST_ITEM, ...GRID_ITEMS])) as EpisodeSummary[];
  },

  /**
   * A podcast and its episodes.
   * @param playlistId podcast playlist id (`MPSP` prefix optional)
   */
  async getPodcast(this: ClientContext, playlistId: string, options: LimitOptions = {}): Promise<Podcast> {
    const { limit = 100, signal } = options;
    const body = { browseId: playlistId.startsWith("MPSP") ? playlistId : `MPSP${playlistId}` };
    const response = await this.sendRequest("browse", body, { signal });
    const twoColumns = nav(response, TWO_COLUMN_RENDERER);
    const podcast = parsePodcastHeader(nav(twoColumns, [...TAB_CONTENT, ...SECTION_LIST_ITEM, ...RESPONSIVE_HEADER]));

    const results = nav(twoColumns, ["secondaryContents", ...SECTION_LIST_ITEM, ...MUSIC_SHELF]);
    const episodes = parseEpisodes(results.contents);
    if (has(results, "continuations")) {
      const requestFn = (additionalParams: string) => this.sendRequest("browse", body, { additionalParams, signal });
      const remaining = limit == null ? null : limit - episodes.length;
      episodes.push(...(await getContinuations(results, "musicShelfContinuation", remaining, requestFn, parseEpisodes)));
    }
    podcast.episodes = episodes;
    return podcast as Podcast;
  },

  /**
   * A podcast episode.
   * @param videoId episode video id (`MPED` prefix optional)
   */
  async getEpisode(this: ClientContext, videoId: string, options: CallOptions = {}): Promise<Episode> {
    const browseId = videoId.startsWith("MPED") ? videoId : `MPED${videoId}`;
    const response = await this.sendRequest("browse", { browseId }, { signal: options.signal });
    const twoColumns = nav(response, TWO_COLUMN_RENDERER);
    const episode = parseEpisodeHeader(nav(twoColumns, [...TAB_CONTENT, ...SECTION_LIST_ITEM, ...RESPONSIVE_HEADER]));
    const descriptionRuns = nav(twoColumns, ["secondaryContents", ...SECTION_LIST_ITEM, ...DESCRIPTION_SHELF, "description", "runs"], true);
    episode.description = truthy(descriptionRuns) ? parseDescription(descriptionRuns) : null;
    return episode as Episode;
  },

  /**
   * An episodes playlist of the signed-in account: "New episodes" (`RDPN`, default) or
   * "Episodes for later" (`SE`). Requires authentication.
   */
  async getEpisodesPlaylist(this: ClientContext, playlistId = "RDPN", options: CallOptions = {}): Promise<EpisodesPlaylist> {
    // both playlists belong to the signed-in account
    this.checkAuth();
    const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
    const response = await this.sendRequest("browse", { browseId }, { signal: options.signal });
    // upstream raises KeyError: e.g. "New episodes" is empty (no contents) unless the account follows podcasts
    if (!has(response, "contents")) {
      throw new YTMusicServerError(
        `No content returned by the server for ${playlistId}. "New episodes" (RDPN) requires authentication ` +
          "and an account that follows at least one podcast.",
      );
    }
    const playlist = parsePlaylistHeader(response, this.language);
    const section = nav(response, [...TWO_COLUMN_RENDERER, "secondaryContents", ...SECTION_LIST_ITEM]);
    // "Episodes for later" (SE) now uses a playlist shelf, which omits `contents` when it is empty
    const results = nav(section, MUSIC_SHELF, true) ?? nav(section, ["musicPlaylistShelfRenderer"]);
    playlist.episodes = parseEpisodes(results.contents ?? []);
    return playlist as EpisodesPlaylist;
  },
};

/** Podcast methods of {@link YTMusic}. */
export type PodcastMethods = typeof podcastMethods;

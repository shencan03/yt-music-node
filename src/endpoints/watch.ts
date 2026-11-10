/** Port of ytmusicapi/mixins/watch.py. */
import { getContinuations } from "../continuations.ts";
import type { CallOptions, ClientContext } from "../context.ts";
import { YTMusicServerError, YTMusicUserError } from "../errors.ts";
import { NAVIGATION_PLAYLIST_ID, TAB_CONTENT, nav } from "../nav.ts";
import { validatePlaylistId } from "../parsers/playlists.ts";
import { has } from "../parsers/py.ts";
import { getTabBrowseIds, parseWatchPlaylist } from "../parsers/watch.ts";
import type { JsonObject } from "../types/json.ts";
import type { WatchPlaylist, WatchTrack } from "../types/results.ts";

/** Options of {@link YTMusic.getWatchPlaylist}. Pass `videoId`, `playlistId` or both. */
export interface WatchPlaylistOptions extends CallOptions {
  /** Video to start with. */
  videoId?: string;
  /** Playlist to play, e.g. an album's `audioPlaylistId` or a radio id (`RDAMVM…`). */
  playlistId?: string;
  /** Minimum number of tracks to return. Default: 25. */
  limit?: number;
  /** Get a radio playlist (changes each time). */
  radio?: boolean;
  /** Shuffle the playlist (requires `playlistId`). */
  shuffle?: boolean;
}

export const watchMethods = {
  /**
   * The "up next" queue for a video, playlist or both, plus the browseIds for the song's lyrics
   * and related content.
   */
  async getWatchPlaylist(this: ClientContext, options: WatchPlaylistOptions): Promise<WatchPlaylist> {
    const { videoId, limit = 25, radio = false, shuffle = false, signal } = options;
    let { playlistId } = options;
    const body: JsonObject = {
      enablePersistentPlaylistPanel: true,
      isAudioOnly: true,
      tunerSettingValue: "AUTOMIX_SETTING_NORMAL",
    };
    if (!videoId && !playlistId) {
      throw new YTMusicUserError("You must provide either a video id, a playlist id, or both");
    }
    if (videoId) {
      body.videoId = videoId;
      playlistId ||= `RDAMVM${videoId}`;
      if (!(radio || shuffle)) {
        body.watchEndpointMusicSupportedConfigs = {
          watchEndpointMusicConfig: { hasPersistentPlaylistPanel: true, musicVideoType: "MUSIC_VIDEO_TYPE_ATV" },
        };
      }
    }
    let isPlaylist = false;
    if (playlistId) {
      const id = validatePlaylistId(playlistId);
      isPlaylist = id.startsWith("PL") || id.startsWith("OLA");
      body.playlistId = id;
    }
    if (shuffle && playlistId) body.params = "wAEB8gECKAE%3D";
    if (radio) body.params = "wAEB";

    const response = await this.sendRequest("next", body, { signal });
    const watchNextRenderer = nav(response, [
      "contents",
      "singleColumnMusicWatchNextResultsRenderer",
      "tabbedRenderer",
      "watchNextTabbedResultsRenderer",
    ]);
    const browseIds = getTabBrowseIds(watchNextRenderer);

    const results = nav(watchNextRenderer, [...TAB_CONTENT, "musicQueueRenderer", "content", "playlistPanelRenderer"], true);
    if (!results) {
      let message = "No content returned by the server.";
      if (playlistId) message += `\nEnsure you have access to ${playlistId} - a private playlist may cause this.`;
      throw new YTMusicServerError(message);
    }

    const playlist =
      (results.contents as any[]).map((x) => nav(x, ["playlistPanelVideoRenderer", ...NAVIGATION_PLAYLIST_ID], true)).find(Boolean) ??
      null;
    const tracks = parseWatchPlaylist(results.contents) as WatchTrack[];

    if (has(results, "continuations")) {
      const requestFn = (additionalParams: string) => this.sendRequest("next", body, { additionalParams, signal });
      tracks.push(
        ...((await getContinuations(results, "playlistPanelContinuation", limit - tracks.length, requestFn, parseWatchPlaylist, {
          ctokenPath: isPlaylist ? "" : "Radio",
        })) as WatchTrack[]),
      );
    }

    return {
      tracks,
      playlistId: playlist,
      lyrics: browseIds.MUSIC_PAGE_TYPE_TRACK_LYRICS ?? null,
      related: browseIds.MUSIC_PAGE_TYPE_TRACK_RELATED ?? null,
    };
  },
};

/** Watch playlist methods of {@link YTMusic}. */
export type WatchMethods = typeof watchMethods;

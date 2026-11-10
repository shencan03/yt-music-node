/** Port of ytmusicapi/mixins/playlists.py. */
import {
  getContinuationContents,
  getContinuationParams,
  getContinuations2025,
  getReloadableContinuations,
} from "../continuations.ts";
import type { CallOptions, ClientContext, LimitOptions } from "../context.ts";
import { YTMusicUserError } from "../errors.ts";
import {
  CAROUSEL,
  CONTENT,
  DESCRIPTION_SHELF,
  EDITABLE_PLAYLIST_DETAIL_HEADER,
  HEADER,
  MUSIC_SHELF,
  PLAYLIST_ID,
  RESPONSIVE_HEADER,
  SECTION,
  SECTION_LIST_CONTINUATION,
  SECTION_LIST_ITEM,
  SUBTITLE_RUNS,
  TAB_CONTENT,
  TWO_COLUMN_RENDERER,
  WATCH_PLAYLIST_ID,
  findObjectByKey,
  nav,
} from "../nav.ts";
import { parseContentList, parsePlaylist } from "../parsers/browsing.ts";
import {
  parseAudioPlaylist,
  parsePlaylistHeaderMeta,
  parsePlaylistItems,
  validatePlaylistId,
} from "../parsers/playlists.ts";
import { has, or } from "../parsers/py.ts";
import { parseSongRuns } from "../parsers/songs.ts";
import { sumTotalDuration } from "../parsers/utils.ts";
import type { JsonObject } from "../types/json.ts";
import type { Playlist, PrivacyStatus } from "../types/results.ts";
import { validateWriteResponse } from "./library.ts";

/** Sort order of a playlist, for {@link YTMusic.editPlaylist}. */
export type PlaylistSortOrder = "MANUAL" | "NEWEST_FIRST" | "NEWEST_LAST" | "TOP_VOTED";
const SORT_ORDER_VALUES: Record<PlaylistSortOrder, number> = { MANUAL: 0, NEWEST_FIRST: 1, NEWEST_LAST: 2, TOP_VOTED: 6 };

/** Who may vote on items of a playlist. `COLLABORATORS_ONLY` requires collaboration to be on. */
export type PlaylistVoteOption = "EVERYONE_CAN_VOTE" | "COLLABORATORS_ONLY" | "OFF";
const VOTE_OPTION_VALUES: Record<PlaylistVoteOption, number> = { EVERYONE_CAN_VOTE: 1, COLLABORATORS_ONLY: 2, OFF: 3 };

/** `"STATUS_SUCCEEDED"` on success, otherwise the full response. */
export type WriteStatus = "STATUS_SUCCEEDED" | (string & {}) | JsonObject;

/** Options of {@link YTMusic.getPlaylist}. */
export interface GetPlaylistOptions extends CallOptions {
  /** How many tracks to return; `null` returns all. Default: 100. */
  limit?: number | null;
  /** Fetch related playlists (owned playlists also fetch suggestions for this). */
  related?: boolean;
  /** How many suggestions to return (owned playlists only, 7 per request). Default: 0. */
  suggestionsLimit?: number;
}

/** Options of {@link YTMusic.editPlaylist}. Only the options you pass are changed. */
export interface EditPlaylistOptions extends CallOptions {
  /** New title. */
  title?: string;
  /** New description. */
  description?: string;
  /** New privacy status. */
  privacyStatus?: PrivacyStatus;
  /** `true` creates an invite link (returned as `joinCollaborationToken`), `false` closes it. */
  collaboration?: boolean;
  /** Move an item (by `setVideoId`) before another one: `setVideoId` or `[setVideoId, successorSetVideoId]`. */
  moveItem?: string | readonly [string, string];
  /** Append all items of another playlist. */
  addPlaylistId?: string;
  /** New sort order. */
  sortOrder?: PlaylistSortOrder;
  /** Whether new items are added to the top of the playlist. */
  addToTop?: boolean;
  /** Who can vote on items of a collaborative playlist. */
  voteOption?: PlaylistVoteOption;
}

/** Options of {@link YTMusic.createPlaylist}. */
export interface CreatePlaylistOptions extends CallOptions {
  /** Default: `"PRIVATE"`. */
  privacyStatus?: PrivacyStatus;
  /** Video ids to add. */
  videoIds?: readonly string[];
  /** Id of a playlist to copy the items of. */
  sourcePlaylist?: string;
}

/** Options of {@link YTMusic.addPlaylistItems}. Pass `videoIds`, `sourcePlaylist` or both. */
export interface AddPlaylistItemsOptions extends CallOptions {
  /** Video ids to add. */
  videoIds?: readonly string[];
  /** Id of a playlist whose items are all added. */
  sourcePlaylist?: string;
  /** Allow adding songs that are already in the playlist. Default: `false`. */
  duplicates?: boolean;
}

/** Result of {@link YTMusic.addPlaylistItems}. */
export interface AddPlaylistItemsResult {
  status: string;
  playlistEditResults: ({ videoId: string; setVideoId: string; multiSelectData?: any } | null)[];
}

/** Removes HTML tags (YouTube does not allow them in playlist descriptions). */
export function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function statusOrResponse(response: any): WriteStatus {
  validateWriteResponse(response);
  return has(response, "status") ? response.status : response;
}

export const playlistMethods = {
  /** A playlist and its tracks. Owned playlists also include `setVideoId`s for editing. */
  async getPlaylist(this: ClientContext, playlistId: string, options: GetPlaylistOptions = {}): Promise<Playlist> {
    const { limit = 100, related = false, suggestionsLimit = 0, signal } = options;
    const body = { browseId: playlistId.startsWith("VL") ? playlistId : `VL${playlistId}` };
    const requestFn = (additionalParams: string) => this.sendRequest("browse", body, { additionalParams, signal });
    const requestBodyFn = (continuationBody: JsonObject) => this.sendRequest("browse", continuationBody, { signal });
    const response = await requestFn("");

    const isOla = playlistId.startsWith("OLA") || playlistId.startsWith("VLOLA");
    const hasPlaylistHeader = nav(response, [...TWO_COLUMN_RENDERER, ...TAB_CONTENT, ...SECTION_LIST_ITEM], true);
    if (isOla && !hasPlaylistHeader) return (await parseAudioPlaylist(response, limit, requestBodyFn)) as Playlist;

    const headerData = nav(response, [...TWO_COLUMN_RENDERER, ...TAB_CONTENT, ...SECTION_LIST_ITEM]);
    const sectionList = nav(response, [...TWO_COLUMN_RENDERER, "secondaryContents", ...SECTION]);
    const playlist: Record<string, any> = {};
    playlist.owned = has(headerData, EDITABLE_PLAYLIST_DETAIL_HEADER[0]);
    let header: any;
    if (!playlist.owned) {
      header = nav(headerData, RESPONSIVE_HEADER);
      const playButton = findObjectByKey(nav(header, ["buttons"], true) ?? [], "musicPlayButtonRenderer");
      playlist.id = nav(playButton, ["musicPlayButtonRenderer", "playNavigationEndpoint", ...WATCH_PLAYLIST_ID], true);
      playlist.privacy = "PUBLIC";
    } else {
      playlist.id = nav(headerData, [...EDITABLE_PLAYLIST_DETAIL_HEADER, ...PLAYLIST_ID]);
      header = nav(headerData, [...EDITABLE_PLAYLIST_DETAIL_HEADER, ...HEADER, ...RESPONSIVE_HEADER]);
      playlist.privacy = nav(headerData, [EDITABLE_PLAYLIST_DETAIL_HEADER[0], "editHeader", "musicPlaylistEditHeaderRenderer", "privacy"]);
    }

    // the play button has no endpoint on e.g. Liked Music (LM), and SE has no buttons; upstream returns None
    playlist.id ??= playlistId.startsWith("VL") ? playlistId.slice(2) : playlistId;

    const descriptionShelf = nav(header, ["description", ...DESCRIPTION_SHELF], true);
    playlist.description = descriptionShelf
      ? (descriptionShelf.description.runs as any[]).map((run) => run.text).join("")
      : null;

    Object.assign(playlist, parsePlaylistHeaderMeta(header, this.language));
    const isCollaborative = has(playlist, "collaborators");
    Object.assign(playlist, parseSongRuns((nav(header, SUBTITLE_RUNS) as any[]).slice(2 + (playlist.owned ? 2 : 0))));

    // suggestions and related are missing e.g. on liked songs
    playlist.related = [];
    if (has(sectionList, "continuations")) {
      let additionalParams = getContinuationParams(sectionList);
      if (playlist.owned && (suggestionsLimit > 0 || related)) {
        const suggested = await requestFn(additionalParams);
        const continuation = nav(suggested, SECTION_LIST_CONTINUATION);
        additionalParams = getContinuationParams(continuation);
        const suggestionsShelf = nav(continuation, [...CONTENT, ...MUSIC_SHELF]);
        const parseFn = (results: any[]) => parsePlaylistItems(results);
        playlist.suggestions = getContinuationContents(suggestionsShelf, parseFn);
        playlist.suggestions.push(
          ...(await getReloadableContinuations(
            suggestionsShelf,
            "musicShelfContinuation",
            suggestionsLimit - playlist.suggestions.length,
            requestFn,
            parseFn,
          )),
        );
      }

      if (related) {
        const relatedResponse = await requestFn(additionalParams);
        const continuation = nav(relatedResponse, SECTION_LIST_CONTINUATION, true);
        if (continuation) {
          playlist.related = getContinuationContents(nav(continuation, [...CONTENT, ...CAROUSEL]), (results) =>
            parseContentList(results, parsePlaylist),
          );
        }
      }
    }

    playlist.tracks = [];
    const contentData = nav(sectionList, [...CONTENT, "musicPlaylistShelfRenderer"]);
    if (has(contentData, "contents")) {
      const parseFn = (contents: any[]) => parsePlaylistItems(contents, false, isCollaborative);
      playlist.tracks = parseFn(contentData.contents);
      // upstream passes `limit` unchanged, so it fetches another page even when the first one already has
      // enough tracks (getLikedSongs({ limit: 50 }) returned 200 tracks)
      const remaining = limit == null ? null : limit - playlist.tracks.length;
      playlist.tracks.push(...(await getContinuations2025(contentData, remaining, requestBodyFn, parseFn)));
    }

    playlist.duration_seconds = sumTotalDuration(playlist);
    return playlist as Playlist;
  },

  /** The "Liked music" playlist (requires authentication). */
  async getLikedSongs(this: ClientContext, options: LimitOptions = {}): Promise<Playlist> {
    this.checkAuth();
    return playlistMethods.getPlaylist.call(this, "LM", { limit: 100, ...options });
  },

  /** The "Episodes for later" playlist (requires authentication). */
  async getSavedEpisodes(this: ClientContext, options: LimitOptions = {}): Promise<Playlist> {
    this.checkAuth();
    return playlistMethods.getPlaylist.call(this, "SE", { limit: 100, ...options });
  },

  /**
   * Creates a playlist.
   * @returns the new playlist id, or the full response if it has none
   */
  async createPlaylist(
    this: ClientContext,
    title: string,
    description: string,
    options: CreatePlaylistOptions = {},
  ): Promise<string | JsonObject> {
    this.checkAuth();
    // ytmusic will crash if these are part of the title
    const invalid = ["<", ">"].filter((c) => title.includes(c));
    if (invalid.length > 0) throw new YTMusicUserError(`${title} contains invalid characters: ${invalid.join(", ")}`);

    const body: JsonObject = {
      title,
      description: htmlToText(description),
      privacyStatus: options.privacyStatus ?? "PRIVATE",
    };
    if (options.videoIds) body.videoIds = [...options.videoIds];
    if (options.sourcePlaylist) body.sourcePlaylistId = options.sourcePlaylist;

    const response = await this.sendRequest("playlist/create", body, { signal: options.signal, retry: false });
    if (has(response, "playlistId")) return response.playlistId as string;
    validateWriteResponse(response);
    return response;
  },

  /** Joins a collaborative playlist with the token from its invite link (`jct` parameter). */
  async joinCollaborativePlaylist(
    this: ClientContext,
    playlistId: string,
    joinCollaborationToken: string,
    options: CallOptions = {},
  ): Promise<WriteStatus> {
    this.checkAuth();
    const body = {
      playlistId: validatePlaylistId(playlistId),
      actions: [{ action: "ACTION_JOIN_COLLABORATION", joinCollaborationToken }],
    };
    return statusOrResponse(await this.sendRequest("browse/edit_playlist", body, { signal: options.signal, retry: false }));
  },

  /** Edits title, description, privacy, collaboration, order or voting of an owned playlist. */
  async editPlaylist(
    this: ClientContext,
    playlistId: string,
    options: EditPlaylistOptions,
  ): Promise<WriteStatus | { status: string; joinCollaborationToken: string | null }> {
    this.checkAuth();
    const { title, description, privacyStatus, collaboration, moveItem, addPlaylistId, sortOrder, addToTop, voteOption } = options;
    const actions: JsonObject[] = [];
    if (title) actions.push({ action: "ACTION_SET_PLAYLIST_NAME", playlistName: title });
    if (description) actions.push({ action: "ACTION_SET_PLAYLIST_DESCRIPTION", playlistDescription: description });
    if (privacyStatus) actions.push({ action: "ACTION_SET_PLAYLIST_PRIVACY", playlistPrivacy: privacyStatus });
    if (collaboration) actions.push({ action: "ACTION_CREATE_COLLABORATION_INVITE_LINK" });
    else if (collaboration === false) actions.push({ action: "ACTION_SET_CLOSED_TO_CONTRIBUTIONS", closedToContributions: true });
    if (moveItem) {
      const action: JsonObject = {
        action: "ACTION_MOVE_VIDEO_BEFORE",
        setVideoId: typeof moveItem === "string" ? moveItem : moveItem[0],
      };
      if (typeof moveItem !== "string" && moveItem.length > 1) action.movedSetVideoIdSuccessor = moveItem[1];
      actions.push(action);
    }
    if (addPlaylistId) actions.push({ action: "ACTION_ADD_PLAYLIST", addedFullListId: addPlaylistId });
    if (sortOrder != null) {
      const value = SORT_ORDER_VALUES[sortOrder];
      if (value === undefined) throw new YTMusicUserError(`Invalid sortOrder ${sortOrder}`);
      actions.push({ action: "ACTION_SET_PLAYLIST_VIDEO_ORDER", playlistVideoOrder: value });
    }
    if (addToTop != null) actions.push({ action: "ACTION_SET_ADD_TO_TOP", addToTop: String(addToTop) });
    if (voteOption != null) {
      const value = VOTE_OPTION_VALUES[voteOption];
      if (value === undefined) throw new YTMusicUserError(`Invalid voteOption ${voteOption}`);
      actions.push({ action: "ACTION_SET_ALLOW_ITEM_VOTE", itemVotePermission: value });
    }

    const body = { playlistId: validatePlaylistId(playlistId), actions };
    const response = await this.sendRequest("browse/edit_playlist", body, { signal: options.signal, retry: false });
    validateWriteResponse(response);
    if (collaboration && response.status === "STATUS_SUCCEEDED") {
      const inviteLink: string = nav(response, ["collaborationInviteLink"]);
      return { status: response.status, joinCollaborationToken: new URL(inviteLink).searchParams.get("jct") };
    }
    return statusOrResponse(response);
  },

  /** Deletes an owned playlist. */
  async deletePlaylist(this: ClientContext, playlistId: string, options: CallOptions = {}): Promise<WriteStatus> {
    this.checkAuth();
    const body = { playlistId: validatePlaylistId(playlistId) };
    const response = await this.sendRequest("playlist/delete", body, { signal: options.signal, retry: false });
    // YTM now confirms with a deletion command instead of `status` (seen live 2026-11-09)
    const commands: any[] = nav(response, ["command", "commandExecutorCommand", "commands"], true) ?? [];
    if (!has(response, "status") && commands.some((c) => has(c, "handlePlaylistDeletionCommand"))) return "STATUS_SUCCEEDED";
    return statusOrResponse(response);
  },

  /**
   * Adds songs and/or all items of another playlist to an owned playlist.
   * @returns status and the `setVideoId` of each added item
   */
  async addPlaylistItems(
    this: ClientContext,
    playlistId: string,
    options: AddPlaylistItemsOptions,
  ): Promise<AddPlaylistItemsResult | JsonObject> {
    this.checkAuth();
    const { videoIds, sourcePlaylist, duplicates = false } = options;
    if (!videoIds?.length && !sourcePlaylist) {
      throw new YTMusicUserError("You must provide either videoIds or a sourcePlaylist to add to the playlist");
    }
    const actions: JsonObject[] = [];
    if (videoIds?.length) {
      const counts = new Map<string, number>();
      for (const videoId of videoIds) {
        counts.set(videoId, (counts.get(videoId) ?? 0) + 1);
        const action: JsonObject = { action: "ACTION_ADD_VIDEO", addedVideoId: videoId };
        if (duplicates) action.dedupeOption = "DEDUPE_OPTION_SKIP";
        actions.push(action);
      }
      if (!duplicates) {
        const repeated = [...counts].filter(([, count]) => count > 1).map(([id]) => id);
        if (repeated.length > 0) {
          throw new YTMusicUserError(
            `Duplicate videoIds provided to addPlaylistItems while duplicates=false: ${repeated.join(", ")}`,
          );
        }
      }
    }
    if (sourcePlaylist) {
      actions.push({ action: "ACTION_ADD_PLAYLIST", addedFullListId: sourcePlaylist });
      // an empty ACTION_ADD_VIDEO makes YTM return the videoId → setVideoId mapping
      if (!videoIds?.length) actions.push({ action: "ACTION_ADD_VIDEO", addedVideoId: null });
    }

    const body = { playlistId: validatePlaylistId(playlistId), actions };
    const response = await this.sendRequest("browse/edit_playlist", body, { signal: options.signal, retry: false });
    validateWriteResponse(response);
    if (typeof response.status === "string" && response.status.includes("SUCCEEDED")) {
      return {
        status: response.status,
        playlistEditResults: ((response.playlistEditResults ?? []) as any[]).map(
          (result) => result.playlistEditVideoAddedResultData ?? null,
        ),
      };
    }
    return response;
  },

  /**
   * Removes items from an owned playlist. Items need `videoId` and `setVideoId`, as returned by
   * {@link getPlaylist} for owned playlists.
   */
  async removePlaylistItems(
    this: ClientContext,
    playlistId: string,
    videos: readonly { videoId?: string | null; setVideoId?: string | null }[],
    options: CallOptions = {},
  ): Promise<WriteStatus> {
    this.checkAuth();
    const removable = videos.filter((v) => or(v.videoId, null) && or(v.setVideoId, null));
    if (removable.length === 0) {
      throw new YTMusicUserError("Cannot remove songs, because setVideoId is missing. Do you own this playlist?");
    }
    const body = {
      playlistId: validatePlaylistId(playlistId),
      actions: removable.map((v) => ({ setVideoId: v.setVideoId!, removedVideoId: v.videoId!, action: "ACTION_REMOVE_VIDEO" })),
    };
    return statusOrResponse(await this.sendRequest("browse/edit_playlist", body, { signal: options.signal, retry: false }));
  },
};

/** Playlist methods of {@link YTMusic}. */
export type PlaylistMethods = typeof playlistMethods;

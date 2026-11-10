/**
 * Tier B: authenticated writes. Every test records the state it changes, verifies the change, and
 * restores the original state in `finally`, so the account ends up as it was.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { YTMusicServerError, YTMusicUserError, type YTMusic } from "../../../src/index.ts";
import { SAMPLE, TEST_PREFIX, authed, eventually, getClient, sleep, stamp } from "./helpers.ts";

/** YTM rejects some edits for a few seconds after a playlist is created (409/400). */
async function retryEdit<T>(edit: () => Promise<T>, attempts = 6): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await edit();
    } catch (error) {
      if (!(error instanceof YTMusicServerError) || attempt >= attempts) throw error;
      await sleep(4000);
    }
  }
}

async function deleteTestPlaylists(ytm: YTMusic): Promise<number> {
  const playlists = await ytm.getLibraryPlaylists({ limit: null });
  const leftovers = playlists.filter((p) => p.title?.startsWith(TEST_PREFIX));
  for (const playlist of leftovers) await ytm.deletePlaylist(playlist.playlistId);
  return leftovers.length;
}

authed("live auth: playlist lifecycle", { timeout: 300_000 }, () => {
  let ytm: YTMusic;
  let playlistId: string | undefined;
  let videoIds: string[];

  beforeAll(async () => {
    ytm = await getClient();
    await deleteTestPlaylists(ytm);
    const album = await ytm.getAlbum(SAMPLE.album);
    videoIds = album.tracks.filter((t) => t.isAvailable && t.videoId).map((t) => t.videoId!);
    expect(videoIds.length).toBeGreaterThanOrEqual(5);
  });

  afterAll(async () => {
    if (playlistId) await ytm.deletePlaylist(playlistId).catch(() => undefined);
    await deleteTestPlaylists(ytm);
  });

  it("rejects invalid input before sending anything", async () => {
    await expect(ytm.createPlaylist(`${TEST_PREFIX} <bad>`, "x")).rejects.toThrow(YTMusicUserError);
    await expect(ytm.addPlaylistItems("PLabc", { videoIds: ["a", "a"] })).rejects.toThrow(/Duplicate videoIds/);
  });

  it("creates a private playlist with songs", async () => {
    const title = `${TEST_PREFIX} ${stamp()}`;
    const result = await ytm.createPlaylist(title, "Created by the <b>yt-music-node</b> live tests", {
      privacyStatus: "PRIVATE",
      videoIds: videoIds.slice(0, 2),
    });
    expect(typeof result).toBe("string");
    playlistId = result as string;
    expect(playlistId).toMatch(/^PL/);

    const playlist = await eventually(
      () => ytm.getPlaylist(playlistId!),
      (p) => p.tracks.length === 2,
    );
    expect(playlist.id).toBe(playlistId);
    expect(playlist.owned).toBe(true);
    expect(playlist.privacy).toBe("PRIVATE");
    expect(playlist.title).toBe(title);
    expect(playlist.description).toBe("Created by the yt-music-node live tests");
    expect(playlist.tracks.map((t) => t.videoId)).toEqual(videoIds.slice(0, 2));
    for (const track of playlist.tracks) expect(track.setVideoId).toBeTruthy();
    expect(playlist.duration_seconds).toBeGreaterThan(0);

    const library = await eventually(
      () => ytm.getLibraryPlaylists({ limit: null }),
      (list) => list.some((p) => p.playlistId === playlistId),
    );
    expect(library.some((p) => p.playlistId === playlistId)).toBe(true);
  });

  it("edits title, description and privacy", async () => {
    const title = `${TEST_PREFIX} ${stamp()} edited`;
    const status = await retryEdit(() =>
      ytm.editPlaylist(playlistId!, { title, description: "edited description", privacyStatus: "UNLISTED" }),
    );
    expect(status).toBe("STATUS_SUCCEEDED");
    const playlist = await eventually(
      () => ytm.getPlaylist(playlistId!),
      (p) => p.title === title && p.privacy === "UNLISTED",
    );
    expect(playlist.title).toBe(title);
    expect(playlist.description).toBe("edited description");
    expect(playlist.privacy).toBe("UNLISTED");
  });

  it("adds songs and returns their setVideoIds", async () => {
    const result: any = await retryEdit(() => ytm.addPlaylistItems(playlistId!, { videoIds: [videoIds[2]!] }));
    expect(result.status).toMatch(/SUCCEEDED/);
    expect(result.playlistEditResults).toHaveLength(1);
    expect(result.playlistEditResults[0].videoId).toBe(videoIds[2]);
    expect(result.playlistEditResults[0].setVideoId).toBeTruthy();
    const playlist = await eventually(
      () => ytm.getPlaylist(playlistId!),
      (p) => p.tracks.length === 3,
    );
    expect(playlist.tracks.map((t) => t.videoId)).toEqual(videoIds.slice(0, 3));
  });

  it("handles songs already in the playlist according to `duplicates`", async () => {
    // duplicates=false: YTM refuses the whole request when a song is already in the playlist
    const refused: any = await ytm.addPlaylistItems(playlistId!, { videoIds: [videoIds[0]!] }).catch((e: unknown) => e);
    const before = await ytm.getPlaylist(playlistId!);
    expect(before.tracks).toHaveLength(3);
    if (refused instanceof Error) expect(refused).toBeInstanceOf(YTMusicServerError);
    else expect(String(refused.status ?? refused.actions ?? "")).not.toMatch(/^STATUS_SUCCEEDED$/);

    // duplicates=true adds it a second time
    const added: any = await retryEdit(() => ytm.addPlaylistItems(playlistId!, { videoIds: [videoIds[0]!], duplicates: true }));
    expect(added.status).toMatch(/SUCCEEDED/);
    const after = await eventually(
      () => ytm.getPlaylist(playlistId!),
      (p) => p.tracks.length === 4,
    );
    expect(after.tracks.filter((t) => t.videoId === videoIds[0])).toHaveLength(2);
  });

  it("moves an item", async () => {
    const before = await ytm.getPlaylist(playlistId!);
    const last = before.tracks.at(-1)!;
    const first = before.tracks[0]!;
    const status = await retryEdit(() => ytm.editPlaylist(playlistId!, { moveItem: [last.setVideoId!, first.setVideoId!] }));
    expect(status).toBe("STATUS_SUCCEEDED");
    const after = await eventually(
      () => ytm.getPlaylist(playlistId!),
      (p) => p.tracks[0]?.setVideoId === last.setVideoId,
    );
    expect(after.tracks[0]!.setVideoId).toBe(last.setVideoId);
    expect(after.tracks).toHaveLength(before.tracks.length);
  });

  it("removes items", async () => {
    const before = await ytm.getPlaylist(playlistId!);
    const target = before.tracks.filter((t) => t.videoId === videoIds[0]);
    expect(target.length).toBe(2);
    const status = await retryEdit(() => ytm.removePlaylistItems(playlistId!, target));
    expect(status).toBe("STATUS_SUCCEEDED");
    const after = await eventually(
      () => ytm.getPlaylist(playlistId!),
      (p) => p.tracks.length === before.tracks.length - 2,
    );
    expect(after.tracks.some((t) => t.videoId === videoIds[0])).toBe(false);
    await expect(ytm.removePlaylistItems(playlistId!, [{ videoId: "x" }])).rejects.toThrow(YTMusicUserError);
  });

  it("adds a whole playlist (sourcePlaylist) and appends to the top with addToTop", async () => {
    const before = await ytm.getPlaylist(playlistId!);
    // a source that overlaps with the playlist is refused as a whole (STATUS_FAILED) without duplicates
    const overlapping: any = await ytm.addPlaylistItems(playlistId!, { sourcePlaylist: SAMPLE.albumPlaylist });
    expect(overlapping.status).toBe("STATUS_FAILED");

    const source = await ytm.getPlaylist(SAMPLE.publicPlaylist);
    const result: any = await retryEdit(() => ytm.addPlaylistItems(playlistId!, { sourcePlaylist: SAMPLE.publicPlaylist }));
    expect(result.status).toMatch(/SUCCEEDED/);
    const withSource = await eventually(
      () => ytm.getPlaylist(playlistId!, { limit: null }),
      (p) => p.tracks.length === before.tracks.length + source.tracks.length,
    );
    expect(withSource.tracks.length).toBe(before.tracks.length + source.tracks.length);
    expect(withSource.tracks.slice(-source.tracks.length).map((t) => t.videoId)).toEqual(source.tracks.map((t) => t.videoId));

    expect(await retryEdit(() => ytm.editPlaylist(playlistId!, { addToTop: true }))).toBe("STATUS_SUCCEEDED");
    await retryEdit(() => ytm.addPlaylistItems(playlistId!, { videoIds: [SAMPLE.video] }));
    const top = await eventually(
      () => ytm.getPlaylist(playlistId!, { limit: null }),
      (p) => p.tracks[0]?.videoId === SAMPLE.video,
    );
    expect(top.tracks[0]!.videoId).toBe(SAMPLE.video);
    expect(await retryEdit(() => ytm.editPlaylist(playlistId!, { addToTop: false }))).toBe("STATUS_SUCCEEDED");
  });

  it("returns suggestions and related playlists for owned playlists", async () => {
    const playlist = await ytm.getPlaylist(playlistId!, { related: true, suggestionsLimit: 10 });
    expect(Array.isArray(playlist.suggestions)).toBe(true);
    for (const suggestion of playlist.suggestions ?? []) expect(suggestion.videoId).toBeTruthy();
    expect(Array.isArray(playlist.related)).toBe(true);
  });

  it("sets the sort order", async () => {
    expect(await retryEdit(() => ytm.editPlaylist(playlistId!, { sortOrder: "NEWEST_FIRST" }))).toBe("STATUS_SUCCEEDED");
    expect(await retryEdit(() => ytm.editPlaylist(playlistId!, { sortOrder: "MANUAL" }))).toBe("STATUS_SUCCEEDED");
    await expect(ytm.editPlaylist(playlistId!, { sortOrder: "RANDOM" as never })).rejects.toThrow(YTMusicUserError);
  });

  it("opens and closes collaboration, and sets the vote option", async () => {
    const opened: any = await retryEdit(() => ytm.editPlaylist(playlistId!, { collaboration: true }));
    expect(opened.status).toBe("STATUS_SUCCEEDED");
    expect(opened.joinCollaborationToken).toBeTruthy();
    const collaborative = await eventually(
      () => ytm.getPlaylist(playlistId!),
      (p) => Boolean(p.collaborators),
    );
    expect(collaborative.collaborators?.avatars.length).toBeGreaterThanOrEqual(1);

    expect(await retryEdit(() => ytm.editPlaylist(playlistId!, { voteOption: "EVERYONE_CAN_VOTE" }))).toBe("STATUS_SUCCEEDED");
    expect(await retryEdit(() => ytm.editPlaylist(playlistId!, { voteOption: "OFF" }))).toBe("STATUS_SUCCEEDED");

    expect(await retryEdit(() => ytm.editPlaylist(playlistId!, { collaboration: false }))).toBe("STATUS_SUCCEEDED");
  });

  it("deletes the playlist", async () => {
    expect(await ytm.deletePlaylist(playlistId!)).toBe("STATUS_SUCCEEDED");
    const library = await eventually(
      () => ytm.getLibraryPlaylists({ limit: null }),
      (list) => !list.some((p) => p.playlistId === playlistId),
    );
    expect(library.some((p) => p.playlistId === playlistId)).toBe(false);
    playlistId = undefined;
  });
});

authed("live auth: ratings, library and subscriptions", { timeout: 180_000 }, () => {
  let ytm: YTMusic;
  beforeAll(async () => {
    ytm = await getClient();
  });

  const songStatus = async (videoId: string) =>
    (await ytm.getWatchPlaylist({ videoId, limit: 1 })).tracks[0]!.likeStatus;

  /** `likeStatusEntity.likeStatus` of the player bar's like/dislike button in a raw `next` response. */
  const playerLikeStatus = async (videoId: string): Promise<string | null> => {
    const response = await ytm.request("next", { videoId, isAudioOnly: true });
    const find = (node: any): string | null => {
      if (!node || typeof node !== "object") return null;
      if (typeof node.likeStatusEntity?.likeStatus === "string") return node.likeStatusEntity.likeStatus;
      for (const value of Object.values(node)) {
        const found = find(value);
        if (found) return found;
      }
      return null;
    };
    return find(response);
  };

  it("rateSong: LIKE, DISLIKE, then restore", async () => {
    const original = await songStatus(SAMPLE.video);
    try {
      expect(await ytm.rateSong(SAMPLE.video, "LIKE")).toHaveProperty("actions");
      expect(await eventually(() => songStatus(SAMPLE.video), (s) => s === "LIKE")).toBe("LIKE");
      const liked = await eventually(
        () => ytm.getLikedSongs({ limit: 25 }),
        (p) => p.tracks.some((t) => t.videoId === SAMPLE.video),
      );
      expect(liked.tracks.some((t) => t.videoId === SAMPLE.video)).toBe(true);

      expect(await ytm.rateSong(SAMPLE.video, "DISLIKE")).toHaveProperty("actions");
      // the watch-playlist menu only toggles like/unlike, so read the player bar's like button state
      expect(await eventually(() => playerLikeStatus(SAMPLE.video), (s) => s === "DISLIKE")).toBe("DISLIKE");
      const afterDislike = await eventually(
        () => ytm.getLikedSongs({ limit: 25 }),
        (p) => !p.tracks.some((t) => t.videoId === SAMPLE.video),
      );
      expect(afterDislike.tracks.some((t) => t.videoId === SAMPLE.video)).toBe(false);
      await expect(ytm.rateSong(SAMPLE.video, "LOVE" as never)).rejects.toThrow(YTMusicUserError);
    } finally {
      await ytm.rateSong(SAMPLE.video, original ?? "INDIFFERENT");
    }
    expect(await eventually(() => songStatus(SAMPLE.video), (s) => s === (original ?? "INDIFFERENT"))).toBe(
      original ?? "INDIFFERENT",
    );
  });

  it("ratePlaylist: like an album playlist, then restore", async () => {
    const original = (await ytm.getAlbum(SAMPLE.album)).likeStatus ?? "INDIFFERENT";
    try {
      expect(await ytm.ratePlaylist(SAMPLE.albumPlaylist, "LIKE")).toHaveProperty("actions");
      const album = await eventually(
        () => ytm.getAlbum(SAMPLE.album),
        (a) => a.likeStatus === "LIKE",
      );
      expect(album.likeStatus).toBe("LIKE");
      const library = await eventually(
        () => ytm.getLibraryAlbums({ limit: 100, order: "recently_added" }),
        (albums) => albums.some((a) => a.browseId === SAMPLE.album),
      );
      expect(library.some((a) => a.browseId === SAMPLE.album)).toBe(true);
    } finally {
      await ytm.ratePlaylist(SAMPLE.albumPlaylist, original);
    }
    expect((await eventually(() => ytm.getAlbum(SAMPLE.album), (a) => a.likeStatus === original)).likeStatus).toBe(original);
  });

  it("editSongLibraryStatus: add a song to the library, then remove it", async () => {
    const album = await ytm.getAlbum(SAMPLE.album);
    const index = album.tracks.findIndex((t) => t.inLibrary === false && t.feedbackTokens?.add);
    expect(index).toBeGreaterThanOrEqual(0);
    const track = album.tracks[index]!;
    try {
      const added = await ytm.editSongLibraryStatus([track.feedbackTokens!.add!]);
      expect(added.feedbackResponses[0].isProcessed).toBe(true);
      const after = await eventually(
        () => ytm.getAlbum(SAMPLE.album),
        (a) => a.tracks[index]!.inLibrary === true,
      );
      expect(after.tracks[index]!.inLibrary).toBe(true);
      const songs = await eventually(
        () => ytm.getLibrarySongs({ limit: 100, order: "recently_added" }),
        (list) => list.some((s) => s.videoId === track.videoId),
      );
      expect(songs.some((s) => s.videoId === track.videoId)).toBe(true);
    } finally {
      const current = await ytm.getAlbum(SAMPLE.album);
      const removeToken = current.tracks[index]!.feedbackTokens?.remove;
      if (current.tracks[index]!.inLibrary && removeToken) {
        const removed = await ytm.editSongLibraryStatus([removeToken]);
        expect(removed.feedbackResponses[0].isProcessed).toBe(true);
      }
    }
    const restored = await eventually(
      () => ytm.getAlbum(SAMPLE.album),
      (a) => a.tracks[index]!.inLibrary === false,
    );
    expect(restored.tracks[index]!.inLibrary).toBe(false);
  });

  it("subscribeArtist / unsubscribeArtists", async () => {
    const channelId = "UCmMUZbaYdNH0bEd1PAlAqsA"; // Oasis
    const original = (await ytm.getArtist(channelId)).subscribed;
    try {
      await ytm.subscribeArtist(channelId);
      const artist = await eventually(() => ytm.getArtist(channelId), (a) => a.subscribed === true);
      expect(artist.subscribed).toBe(true);
      const subscriptions = await eventually(
        () => ytm.getLibrarySubscriptions({ limit: 100 }),
        (list) => list.some((s) => s.browseId === channelId),
      );
      expect(subscriptions.some((s) => s.browseId === channelId)).toBe(true);
    } finally {
      if (!original) await ytm.unsubscribeArtists([channelId]);
    }
    if (!original) {
      const artist = await eventually(() => ytm.getArtist(channelId), (a) => a.subscribed === false);
      expect(artist.subscribed).toBe(false);
    }
  });
});

authed("live auth: history and search suggestions", { timeout: 180_000 }, () => {
  let ytm: YTMusic;
  beforeAll(async () => {
    ytm = await getClient();
  });

  it("addHistoryItem appears in history, removeHistoryItems removes it", async () => {
    const song = await ytm.getSong(SAMPLE.video);
    const response = await ytm.addHistoryItem(song);
    expect(response.status).toBe(204);
    const history = await eventually(
      () => ytm.getHistory(),
      (items) => items[0]?.videoId === SAMPLE.video,
      { tries: 10, delayMs: 3000 },
    );
    const entry = history[0]!;
    expect(entry.videoId).toBe(SAMPLE.video);
    const removed = await ytm.removeHistoryItems([entry.feedbackToken!]);
    expect(removed.feedbackResponses[0].isProcessed).toBe(true);
    const after = await eventually(
      () => ytm.getHistory(),
      (items) => !items.some((i) => i.feedbackToken === entry.feedbackToken),
    );
    expect(after.some((i) => i.feedbackToken === entry.feedbackToken)).toBe(false);
  });

  it("search adds a history suggestion, removeSearchSuggestions removes it", async () => {
    const query = "ytmusicnode livetest wonderwall";
    await ytm.search(query);
    const find = () => ytm.getSearchSuggestions("ytmusicnode livetest", { detailedRuns: true });
    const suggestions = await eventually(find, (list) => list.some((s) => s.fromHistory && s.text === query), {
      tries: 8,
      delayMs: 3000,
    });
    const index = suggestions.findIndex((s) => s.fromHistory && s.text === query);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(await ytm.removeSearchSuggestions(suggestions, { indices: [index] })).toBe(true);
    const after = await eventually(find, (list) => !list.some((s) => s.fromHistory && s.text === query));
    expect(after.some((s) => s.fromHistory && s.text === query)).toBe(false);
    // removing from a list without history suggestions is a user error
    await expect(ytm.removeSearchSuggestions(after.filter((s) => !s.fromHistory))).rejects.toThrow(YTMusicUserError);
  });
});

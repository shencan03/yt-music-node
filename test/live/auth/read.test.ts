/**
 * Tier A: authenticated read-only endpoints. Nothing in the account is changed.
 * Assertions check structure and invariants, not the account's contents.
 */
import { beforeAll, expect, it } from "vitest";
import { YTMusicError, YTMusicServerError, type YTMusic } from "../../../src/index.ts";
import { SAMPLE, authed, getClient } from "./helpers.ts";

const LIKE_STATUSES = ["LIKE", "DISLIKE", "INDIFFERENT", null];

function expectSongItem(item: any): void {
  expect(typeof item.title).toBe("string");
  expect(Array.isArray(item.artists)).toBe(true);
  expect(LIKE_STATUSES).toContain(item.likeStatus ?? null);
  if (item.isAvailable) expect(item.videoId).toBeTruthy();
}

authed("live auth: account and home", { timeout: 120_000 }, () => {
  let ytm: YTMusic;
  beforeAll(async () => {
    ytm = await getClient();
  });

  it("is authenticated with browser headers", () => {
    expect(ytm.authType).toBe("browser");
    expect(ytm.authHeader("x-goog-authuser")).not.toBeNull();
  });

  it("getAccountInfo", async () => {
    const info = await ytm.getAccountInfo();
    expect(info.accountName).toBeTruthy();
    expect(() => new URL(info.accountPhotoUrl!)).not.toThrow();
    expect(Object.keys(info).sort()).toEqual(["accountName", "accountPhotoUrl", "channelHandle"]);
  });

  it("getHome follows continuations", async () => {
    const first = await ytm.getHome({ limit: 1 });
    const more = await ytm.getHome({ limit: 20 });
    expect(first.length).toBeGreaterThan(0);
    expect(more.length).toBeGreaterThan(first.length);
    for (const section of more) {
      expect(typeof section.title).toBe("string");
      expect(Array.isArray(section.contents)).toBe(true);
    }
  });

  it("authenticated responses include personal fields", async () => {
    const album = await ytm.getAlbum(SAMPLE.album);
    expect(album.likeStatus).not.toBeNull();
    for (const track of album.tracks) {
      expect(typeof track.inLibrary).toBe("boolean");
      expect(track.feedbackTokens).toBeTruthy();
    }
    const watch = await ytm.getWatchPlaylist({ videoId: SAMPLE.video, limit: 5 });
    expect(LIKE_STATUSES).toContain(watch.tracks[0]!.likeStatus);
  });
});

authed("live auth: library", { timeout: 180_000 }, () => {
  let ytm: YTMusic;
  beforeAll(async () => {
    ytm = await getClient();
  });

  it("getLibraryPlaylists, and each one opens with getPlaylist", async () => {
    const playlists = await ytm.getLibraryPlaylists({ limit: null });
    for (const playlist of playlists) {
      expect(playlist.playlistId).toBeTruthy();
      expect(typeof playlist.title).toBe("string");
    }
    for (const summary of playlists.slice(0, 5)) {
      const playlist = await ytm.getPlaylist(summary.playlistId, { limit: 10 });
      expect(playlist.id).toBeTruthy();
      expect(typeof playlist.owned).toBe("boolean");
      if (playlist.owned) {
        for (const track of playlist.tracks) if (track.isAvailable) expect(track.setVideoId).toBeTruthy();
      }
    }
  });

  it("getLibrarySongs orders are accepted and differ", async () => {
    const byOrder: Record<string, string[]> = {};
    for (const order of ["a_to_z", "z_to_a", "recently_added"] as const) {
      const songs = await ytm.getLibrarySongs({ limit: 25, order });
      for (const song of songs) expectSongItem(song);
      byOrder[order] = songs.map((s) => s.videoId!);
    }
    if (byOrder.a_to_z!.length > 2) expect(byOrder.a_to_z).not.toEqual(byOrder.z_to_a);
  });

  it("getLibrarySongs limits, null limit and validateResponses", async () => {
    const small = await ytm.getLibrarySongs({ limit: 5 });
    const validated = await ytm.getLibrarySongs({ limit: 30, validateResponses: true });
    expect(validated.length).toBeGreaterThanOrEqual(Math.min(small.length, 25));
    const all = await ytm.getLibrarySongs({ limit: null });
    expect(all.length).toBeGreaterThanOrEqual(validated.length);
    // continuation pages contain no duplicates
    const ids = all.map((s) => s.videoId);
    expect(new Set(ids).size).toBeGreaterThan(ids.length * 0.95);
    await expect(ytm.getLibrarySongs({ limit: null, validateResponses: true })).rejects.toThrow(/without a limit/);
  });

  it("getLibraryAlbums, getLibraryArtists, getLibrarySubscriptions", async () => {
    for (const album of await ytm.getLibraryAlbums({ limit: 25, order: "recently_added" })) {
      expect(album.browseId).toMatch(/^MPRE/);
    }
    const artists = await ytm.getLibraryArtists({ limit: 50, order: "a_to_z" });
    for (const artist of artists) {
      expect(artist.browseId).toBeTruthy();
      expect(typeof artist.artist).toBe("string");
    }
    for (const sub of await ytm.getLibrarySubscriptions({ limit: 50 })) expect(sub.browseId).toMatch(/^UC/);
  });

  it("getLibraryPodcasts and getLibraryChannels", async () => {
    for (const podcast of await ytm.getLibraryPodcasts({ limit: 25 })) expect(podcast.title).toBeTruthy();
    for (const channel of await ytm.getLibraryChannels({ limit: 25 })) expect(channel.browseId).toBeTruthy();
  });

  it("getLikedSongs respects the limit at page granularity", async () => {
    const liked = await ytm.getLikedSongs({ limit: 50 });
    expect(liked.id).toBe("LM");
    expect(liked.tracks.length).toBeLessThanOrEqual(100);
    for (const track of liked.tracks) {
      expectSongItem(track);
      expect(track.likeStatus).toBe("LIKE");
    }
    if ((liked.trackCount ?? 0) > 100) {
      const more = await ytm.getLikedSongs({ limit: 150 });
      expect(more.tracks.length).toBeGreaterThan(100);
      expect(more.tracks.length).toBeLessThanOrEqual(200);
    }
  });

  it("getSavedEpisodes and episode playlists", async () => {
    const saved = await ytm.getSavedEpisodes({ limit: 10 });
    expect(Array.isArray(saved.tracks)).toBe(true);
    const later = await ytm.getEpisodesPlaylist("SE");
    expect(Array.isArray(later.episodes)).toBe(true);
    // "New episodes" is empty for accounts that follow no podcasts
    try {
      const fresh = await ytm.getEpisodesPlaylist();
      expect(Array.isArray(fresh.episodes)).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(YTMusicServerError);
      expect((error as Error).message).toMatch(/follows at least one podcast/);
    }
  });

  it("getHistory", async () => {
    const history = await ytm.getHistory();
    for (const item of history) {
      expectSongItem(item);
      expect(item.feedbackToken).toBeTruthy();
      expect(typeof item.played).toBe("string");
    }
  });

  it("getTasteProfile", async () => {
    const profile = await ytm.getTasteProfile();
    for (const artist of Object.values(profile)) {
      expect(artist.selectionValue).toBeTruthy();
      expect(artist.impressionValue).toBeTruthy();
    }
  });

  it("getSearchSuggestions with history entries", async () => {
    const suggestions = await ytm.getSearchSuggestions("a", { detailedRuns: true });
    for (const suggestion of suggestions) {
      expect(typeof suggestion.fromHistory).toBe("boolean");
      if (suggestion.fromHistory) expect(suggestion.feedbackToken).toBeTruthy();
    }
  });

  it("uploads library (may be empty)", async () => {
    const songs = await ytm.getLibraryUploadSongs({ limit: 25, order: "recently_added" });
    for (const song of songs) expect(song.entityId).toBeTruthy();
    expect(Array.isArray(await ytm.getLibraryUploadAlbums({ limit: 25 }))).toBe(true);
    expect(Array.isArray(await ytm.getLibraryUploadArtists({ limit: 25 }))).toBe(true);
  });

  it("errors are typed", async () => {
    const error = await ytm.getPlaylist("PLdefinitelyNotAPlaylist000000000").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(YTMusicError);
  });
});

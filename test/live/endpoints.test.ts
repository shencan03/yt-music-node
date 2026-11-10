/**
 * Live tests of the unauthenticated endpoints, modeled on upstream's tests/mixins.
 * Run with `npm run test:live`. Assertions are loose where results vary by region and over time.
 */
import { describe, expect, it } from "vitest";
import { YTMusic, YTMusicUserError } from "../../src/index.ts";

const live = describe.skipIf(!process.env.YTM_LIVE);

const SAMPLE_ALBUM = "MPREb_4pL8gzRtw1p"; // Eminem - Revival
const SAMPLE_VIDEO = "hpSrLjc5SMs"; // Oasis - Wonderwall
const PODCAST_CHANNEL = "UCGwuxdEeCf0TIA2RbPOj-8g";
const EPISODE_ID = "KNkyHCLOr1o";

live("live: browsing", { timeout: 60_000 }, () => {
  const ytm = new YTMusic({ retry: 2 });

  it("getHome", async () => {
    const home = await ytm.getHome();
    expect(home.length).toBeGreaterThanOrEqual(2);
    expect(home[0]!.title).toBeTruthy();
  });

  it("getArtist", async () => {
    const artist = await ytm.getArtist("MPLAUCmMUZbaYdNH0bEd1PAlAqsA");
    expect(artist.name).toBeTruthy();
    expect(artist.shuffleId).not.toBeNull();
    expect(artist.radioId).not.toBeNull();
    expect((await ytm.getArtist(artist.channelId!)).radioId).toBe(artist.radioId);
    for (const album of artist.albums?.results ?? []) expect(String(album.year)).toMatch(/^\d+$/);
  });

  it("getArtistAlbums", async () => {
    const artist = await ytm.getArtist("UCAeLFBCQS7FvI8PvBrWvSBg");
    const albums = await ytm.getArtistAlbums(artist.albums!.browseId!, artist.albums!.params!);
    expect(albums.length).toBeGreaterThan(20);
    expect(albums.every((album) => !("artists" in album))).toBe(true);
    await expect(ytm.getArtistAlbums(artist.albums!.browseId!, artist.albums!.params!, { order: "order" as never })).rejects.toThrow(
      YTMusicUserError,
    );
  });

  it("getUser", async () => {
    const user = await ytm.getUser("UC44hbeRoCZVVMVg5z0FfIww");
    expect(user.name).toBeTruthy();
  });

  it("getUserPlaylists and getUserVideos", async () => {
    const user = await ytm.getUser("UC44hbeRoCZVVMVg5z0FfIww");
    if (user.playlists?.params) {
      const playlists = await ytm.getUserPlaylists(user.playlists.browseId!, user.playlists.params);
      expect(playlists.length).toBeGreaterThan(0);
      expect(playlists[0]!.playlistId).toBeTruthy();
    }
    if (user.videos?.params) {
      const videos = await ytm.getUserVideos(user.videos.browseId!, user.videos.params);
      expect(videos.length).toBeGreaterThan(0);
      expect(videos[0]!.videoId).toBeTruthy();
    }
    expect(user.playlists?.params ?? user.videos?.params).toBeTruthy();
  });

  it("getSongCredits", async () => {
    const album = await ytm.getAlbum(SAMPLE_ALBUM);
    const creditsId = album.tracks.find((t) => t.creditsBrowseId)?.creditsBrowseId;
    expect(creditsId).toMatch(/^MPTC/);
    const credits = await ytm.getSongCredits(creditsId!);
    expect(Object.keys(credits).length).toBeGreaterThan(1);
    await expect(ytm.getSongCredits("nope")).rejects.toThrow(/must start with MPTC/);
  });

  it("getBasejsUrl", async () => {
    expect(await ytm.getBasejsUrl()).toMatch(/^https:\/\/music\.youtube\.com\/.+base\.js$/);
  });

  it("getAlbumBrowseId", async () => {
    expect(await ytm.getAlbumBrowseId("OLAK5uy_nMr9h2VlS-2PULNz3M3XVXQj_P3C2bqaY")).toBe(SAMPLE_ALBUM);
    expect((await ytm.getAlbumBrowseId("OLAK5uy_nbMYyrfeg5ZgknoOsOGBL268hGxtcbnDM"))!.length).toBe(17);
  });

  it("getAlbum", async () => {
    const album = await ytm.getAlbum(SAMPLE_ALBUM);
    expect(album.audioPlaylistId).not.toBeNull();
    expect(album.tracks[0]!.trackNumber).toBe(1);
    expect(album.tracks.every((t) => t.album !== null)).toBe(true);
    // greyed-out tracks have no track number (which tracks are greyed out varies by region)
    const other = await ytm.getAlbum("MPREb_G21w42zx0qJ");
    for (const track of other.tracks) if (!track.isAvailable) expect(track.trackNumber).toBeNull();
    await expect(ytm.getAlbum("asdf")).rejects.toThrow(/Invalid album browseId/);
  });

  it("getAlbum without artist", async () => {
    const album = await ytm.getAlbum("MPREb_n1AxZ9F8rF7");
    expect(album.artists).toBeNull();
    expect(album.tracks.length).toBe(11);
  });

  it("getSong", async () => {
    const song = await ytm.getSong(SAMPLE_VIDEO);
    expect(song.videoDetails?.videoId).toBe(SAMPLE_VIDEO);
  });

  it("getWatchPlaylist, getLyrics and getSongRelated", async () => {
    const playlist = await ytm.getWatchPlaylist({ videoId: SAMPLE_VIDEO });
    expect(playlist.tracks.length).toBeGreaterThan(10);
    expect(playlist.lyrics).toBeTruthy();

    const lyrics = await ytm.getLyrics(playlist.lyrics!);
    expect(typeof lyrics?.lyrics).toBe("string");
    expect(lyrics?.hasTimestamps).toBe(false);

    const timed = await ytm.getLyrics(playlist.lyrics!, { timestamps: true });
    expect(timed?.hasTimestamps).toBe(true);
    const line = (timed!.lyrics as { start_time: number; end_time: number; text: string }[])[0]!;
    expect(line.start_time).toBeLessThanOrEqual(line.end_time);

    const related = await ytm.getSongRelated(playlist.related!);
    expect(related.length).toBeGreaterThanOrEqual(3);
  });

  it("getWatchPlaylist with playlist and radio", async () => {
    const radio = await ytm.getWatchPlaylist({ videoId: "9mWr4c_ig54", limit: 50, radio: true });
    expect(radio.tracks.length).toBeGreaterThanOrEqual(49);
    const albumRadio = await ytm.getWatchPlaylist({
      playlistId: "RDAMPLOLAK5uy_l_fKDQGOUsk8kbWsm9s86n4-nZNd2JR8Q",
      radio: true,
      limit: 90,
    });
    expect(albumRadio.tracks.length).toBeGreaterThanOrEqual(90);
    const album = await ytm.getAlbum(SAMPLE_ALBUM);
    const shuffle = await ytm.getWatchPlaylist({ playlistId: album.audioPlaylistId!, shuffle: true });
    expect(shuffle.tracks.length).toBe(album.tracks.length);
    await expect(ytm.getWatchPlaylist({ playlistId: "PL_NOT_EXIST" })).rejects.toThrow(/No content returned by the server/);
  });

  it("getSignatureTimestamp", async () => {
    expect(await ytm.getSignatureTimestamp()).toBeGreaterThan(19000);
  });
});

live("live: search", { timeout: 60_000 }, () => {
  const ytm = new YTMusic({ retry: 2 });

  it("search all", async () => {
    const results = await ytm.search("oasis wonderwall");
    expect(results.length).toBeGreaterThan(5);
    expect(results.some((r) => r.category === "Top result")).toBe(true);
  });

  it.each(["songs", "videos", "albums", "artists", "playlists", "community_playlists", "podcasts", "episodes"] as const)(
    "search filter %s",
    async (filter) => {
      const results = await ytm.search("beatles", { filter, limit: 40 });
      expect(results.length).toBeGreaterThan(5);
    },
  );

  it("search with continuations", async () => {
    const results = await ytm.search("Martin Stig Andersen", { filter: "songs", limit: 50 });
    expect(results.length).toBeGreaterThan(20);
  });

  it("search with ignoreSpelling", async () => {
    const results = await ytm.search("Martin Stig Andersen - Deteriation", { ignoreSpelling: true });
    expect(results.length).toBeGreaterThan(0);
  });

  it("search in another language", async () => {
    const ytmDe = new YTMusic({ language: "de" });
    const results = await ytmDe.search("taylor swift");
    expect(results.length).toBeGreaterThan(5);
  });

  it("getSearchSuggestions", async () => {
    expect(Array.isArray(await ytm.getSearchSuggestions("fade"))).toBe(true);
    const detailed = await ytm.getSearchSuggestions("fade", { detailedRuns: true });
    expect(Array.isArray(detailed)).toBe(true);
  });
});

live("live: explore and playlists", { timeout: 60_000 }, () => {
  const ytm = new YTMusic({ retry: 2 });

  it("getMoodCategories and getMoodPlaylists", async () => {
    const categories = await ytm.getMoodCategories();
    const sections = Object.values(categories);
    expect(sections.length).toBeGreaterThan(0);
    const playlists = await ytm.getMoodPlaylists(sections[0]![0]!.params);
    expect(playlists.length).toBeGreaterThan(0);
  });

  it("getExplore", async () => {
    const explore = await ytm.getExplore();
    expect(explore.new_releases?.length ?? 0).toBeGreaterThan(0);
  });

  it("getCharts", async () => {
    const charts = await ytm.getCharts();
    expect(charts.countries).toBeDefined();
    const us = await ytm.getCharts({ country: "US" });
    expect(Object.keys(us).length).toBeGreaterThan(1);
  });

  it("getPlaylist", async () => {
    const playlist = await ytm.getPlaylist("PLQwVIlKxHM6qv-o99iX9R85og7IzF9YS_", { limit: 300 });
    expect(playlist.tracks.length).toBeGreaterThan(200);
    expect(playlist.title).toBeTruthy();
    const withRelated = await ytm.getPlaylist("PL6bPxvf5dW5clc3y9wAoslzqUrmkZ5c-u", { limit: 1, related: true });
    expect(withRelated.related?.length ?? 0).toBeGreaterThan(0);
  });
});

live("live: podcasts", { timeout: 60_000 }, () => {
  const ytm = new YTMusic({ retry: 2 });

  it("getChannel", async () => {
    const channel = await ytm.getChannel(PODCAST_CHANNEL);
    expect(channel.episodes?.results.length).toBeGreaterThan(0);
    expect(channel.podcasts?.results.length ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("getChannelEpisodes", async () => {
    const channel = await ytm.getChannel(PODCAST_CHANNEL);
    const section = channel.episodes!;
    expect(section.params).toBeTruthy();
    const episodes = await ytm.getChannelEpisodes(PODCAST_CHANNEL, section.params!);
    expect(episodes.length).toBeGreaterThanOrEqual(section.results.length);
    expect(episodes[0]!.videoId).toBeTruthy();
  });

  it("getPodcast", async () => {
    // upstream's sample podcast id no longer exists, so take one from the channel
    const channel = await ytm.getChannel(PODCAST_CHANNEL);
    const podcast = await ytm.getPodcast(channel.podcasts!.results[0]!.podcastId!);
    expect(podcast.title).toBeTruthy();
    expect(podcast.episodes.length).toBeGreaterThan(0);
    expect(podcast.saved).toBe(false);
    expect(podcast.thumbnails?.length).toBeGreaterThan(0);
  });

  it("getPodcast for search results", async () => {
    const results = await ytm.search("europe", { filter: "podcasts" });
    for (const result of results.slice(0, 3)) {
      if (!result.browseId) continue;
      expect((await ytm.getPodcast(result.browseId, { limit: 5 })).episodes.length).toBeGreaterThan(0);
    }
  });

  it("getEpisode", async () => {
    const episode = await ytm.getEpisode(EPISODE_ID);
    expect(episode.description?.text.length ?? 0).toBeGreaterThanOrEqual(20);
    expect(episode.playlistId).not.toBeNull();
  });
});

live("live: auth guards", () => {
  const ytm = new YTMusic();
  it("rejects library calls without auth", async () => {
    await expect(ytm.getLibraryPlaylists()).rejects.toThrow(YTMusicUserError);
    await expect(ytm.uploadSong("x.mp3")).rejects.toThrow(YTMusicUserError);
  });
});

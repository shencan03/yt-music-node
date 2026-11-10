/**
 * Golden tests: upstream's recorded responses (test/fixtures, from ytmusicapi tests/data) run through
 * the full client, compared with upstream's expected outputs.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { YTMusic } from "../../src/index.ts";
import { fakeFetch, json } from "../helpers.ts";

const FIXTURES = new URL("../fixtures/", import.meta.url);
const load = (name: string): any => JSON.parse(readFileSync(new URL(name, FIXTURES), "utf8"));
const expected = (name: string): any => load(`expected_output/${name}`);

/** A client whose every InnerTube request returns `response`. */
function clientReturning(response: unknown, html = ""): YTMusic {
  return new YTMusic({
    visitorData: "VISITOR",
    fetch: fakeFetch((request) =>
      request.method === "GET" ? new Response(html, { headers: { "content-type": "text/html" } }) : json(response),
    ),
  });
}

/** Python's `playlist == playlist | expected` (shallow subset check). */
function expectSubset(actual: Record<string, unknown>, subset: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(subset)) expect(actual[key], key).toEqual(value);
}

describe("getPlaylist fixtures", () => {
  it.each([
    ["2024_03_get_playlist.json", "PLaZPMsuQNCsWn0iVMtGbaUXO6z-EdZaZm"],
    ["2024_03_get_playlist_public.json", "RDCLAK5uy_lWy02cQBnTVTlwuRauaGKeUDH3L6PXNxI"],
    ["2025_10_get_playlist_collaborative.json", "PLxyTaDz8f5PBc-8kE36gvB-eflhODG2dw"],
    ["2025_12_get_playlist_audio.json", "OLAK5uy_n0x1TMX8DL2eli2g_LysCSg-6Nq5YQa1g"],
    ["2025_01_get_playlist_chart.json", "OLAK5uy_mzYnlaHgFOvLaxqIPnnouEr-idiUn4NIM"],
  ])("%s", async (file, playlistId) => {
    const playlist: any = await clientReturning(load(file)).getPlaylist(playlistId);
    expect(playlist.id).toBe(playlistId);
    expectSubset(playlist, expected(file));

    for (const thumbnail of playlist.thumbnails ?? []) {
      expect(thumbnail.url && thumbnail.width && thumbnail.height).toBeTruthy();
    }
    expect(playlist.tracks.length).toBeGreaterThan(0);
    for (const track of playlist.tracks) {
      expect(typeof track.title === "string" && track.title).toBeTruthy();
      expect(track.artists.length).toBeGreaterThan(0);
      for (const artist of track.artists) expect(typeof artist.name === "string" && artist.name).toBeTruthy();
      if (track.videoType === "MUSIC_VIDEO_TYPE_ATV") expect(track.album.name).toBeTruthy();
      if (track.communityVoteStatus != null) {
        expect(Number.isInteger(track.communityVoteStatus.netVoteValue)).toBe(true);
        expect(["VOTED_UP", "VOTED_DOWN", "NOT_VOTED"]).toContain(track.communityVoteStatus.status);
      }
    }
  });

  it("parses views as a count (upstream parses '2M views' as 2)", async () => {
    const playlist: any = await clientReturning(load("2024_03_get_playlist_public.json")).getPlaylist(
      "RDCLAK5uy_lWy02cQBnTVTlwuRauaGKeUDH3L6PXNxI",
    );
    expect(playlist.views === null || playlist.views >= 1000).toBe(true);
  });

  it("does not depend on the play button position", async () => {
    const response = load("2024_03_get_playlist_public.json");
    const header =
      response.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0]
        .musicResponsiveHeaderRenderer;
    header.buttons.push(header.buttons.splice(1, 1)[0]);
    const playlist = await clientReturning(response).getPlaylist("RDCLAK5uy_lWy02cQBnTVTlwuRauaGKeUDH3L6PXNxI");
    expect(playlist.id).toBe("RDCLAK5uy_lWy02cQBnTVTlwuRauaGKeUDH3L6PXNxI");
  });
});

describe("getArtist fixtures", () => {
  it.each([
    ["2026_05_get_artist1.json", "UCJwGWV914kBlV4dKRn7AEFA"],
    ["2026_05_get_artist2.json", "UC5CwaMl1eIgY8h02uZw7u8A"],
    ["2026_07_get_artist_hashtag.json", "UCRHts_o65erNP48E0j2qYkw"],
  ])("%s description", async (file, channelId) => {
    const artist: any = await clientReturning(load(file)).getArtist(channelId);
    const want = expected(file);
    expect(artist.description).toEqual(want.description);
    expect(artist.descriptionRuns).toEqual(want.descriptionRuns);
  });

  // the full expected outputs predate the current fixtures (feedback tokens, radioId differ), so
  // like upstream only the description is compared above; check the rest structurally
  it.each(["2026_05_get_artist1.json", "2026_05_get_artist2.json"])("%s structure", async (file) => {
    const artist: any = await clientReturning(load(file)).getArtist("UC");
    const want = expected(file);
    expect(artist.name).toBe(want.name);
    expect(Object.keys(artist).sort()).toEqual(expect.arrayContaining(Object.keys(want).filter((k) => k !== "views").sort()));
    for (const section of ["songs", "albums", "singles", "videos"]) {
      if (want[section]) expect(artist[section]?.results?.length, section).toBe(want[section].results.length);
    }
  });

  it("two-column layout", async () => {
    const artist: any = await clientReturning(load("2026_07_get_artist_two_column.json")).getArtist("UCTestChannelId");
    expect(artist.name).toBe("Test Artist");
    expect(artist.songs.results).toEqual([]);
    expect(artist.albums.results).toHaveLength(1);
    expect(artist.albums.results[0].title).toBe("Test Album");
    expect(artist.albums.results[0].browseId).toBe("MPREb_test123");
  });
});

describe("getAlbum fixtures", () => {
  it("2024_03_get_album.json", async () => {
    const album: any = await clientReturning(load("2024_03_get_album.json")).getAlbum("MPREabc");
    expect(album.tracks).toHaveLength(19);
    expect(album.artists).toHaveLength(1);
    expect(Object.keys(album)).toHaveLength(15);
    for (const track of album.tracks) {
      expect(typeof track.title === "string" && track.title).toBeTruthy();
      expect(track.artists.length).toBeGreaterThan(0);
      for (const artist of track.artists) expect(typeof artist.name === "string" && artist.name).toBeTruthy();
    }
  });

  it("reads likeStatus from the save toggle's state", async () => {
    const response = load("2026_05_get_album.json");
    const header =
      response.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0]
        .musicResponsiveHeaderRenderer;
    const toggle = header.buttons.find((b: any) => b.toggleButtonRenderer).toggleButtonRenderer;
    toggle.isToggled = false;
    expect((await clientReturning(response).getAlbum("MPREb_x")).likeStatus).toBe("INDIFFERENT");
    toggle.isToggled = true;
    expect((await clientReturning(response).getAlbum("MPREb_x")).likeStatus).toBe("LIKE");
  });

  it("2026_05_get_album.json (description with a link)", async () => {
    const html = `<script>initialData.push({path: '\\/browse', params: JSON.parse('\\x7b\\x22browseId\\x22:\\x22MPREb_abcdefghijk\\x22\\x7d')});</script>`;
    const ytm = clientReturning(load("2026_05_get_album.json"), html);
    const browseId = await ytm.getAlbumBrowseId("OLAK5uy_kW9hN-oBmekJ06jhhfStpwRd5pcRKIztY");
    expect(browseId).toBe("MPREb_abcdefghijk");
    const album: any = await ytm.getAlbum(browseId!);
    const want = expected("2026_05_get_album.json");
    expect(album.description).toEqual(want.description);
    expect(album.descriptionRuns).toEqual(want.descriptionRuns);
    for (const key of ["title", "type", "year", "artists", "trackCount", "duration", "audioPlaylistId", "duration_seconds"]) {
      expect(album[key], key).toEqual(want[key]);
    }
    expect(album.tracks.map((t: any) => [t.videoId, t.title])).toEqual(want.tracks.map((t: any) => [t.videoId, t.title]));
  });
});

describe("getExplore fixture", () => {
  it("2025_11_get_explore.json", async () => {
    const explore = await clientReturning(load("2025_11_get_explore.json")).getExplore();
    expect(JSON.parse(JSON.stringify(explore))).toEqual(expected("2025_11_get_explore.json"));
  });
});

describe("getCharts fixture", () => {
  it("US response without genres and with an album carousel", async () => {
    const charts: any = await clientReturning(load("2026_07_get_charts_us_albums_no_genres.json")).getCharts({ country: "US" });
    expect(new Set(Object.keys(charts))).toEqual(new Set(["countries", "videos", "artists"]));
    expect(charts.videos.length).toBeGreaterThan(0);
    expect(charts.artists.length).toBeGreaterThan(0);
  });
});

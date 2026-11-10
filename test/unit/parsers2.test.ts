/** Ports of upstream tests/parsers/test_thumbnails.py, test_playlists.py and test_search.py. */
import { describe, expect, it } from "vitest";
import { parseAlbum, parseRelatedArtist, parseSingle, parseSong, parseWatchPlaylist } from "../../src/parsers/browsing.ts";
import { parseChartPlaylist } from "../../src/parsers/explore.ts";
import { parseAlbums } from "../../src/parsers/library.ts";
import { parsePlaylistHeaderMeta } from "../../src/parsers/playlists.ts";
import { parseBaseHeader, parsePodcast } from "../../src/parsers/podcasts.ts";
import { parseSearchResult } from "../../src/parsers/search.ts";
import { parseWatchTrack } from "../../src/parsers/watch.ts";

function title(text = "Title", { browseId, videoId }: { browseId?: string; videoId?: string } = {}): any {
  const run: any = { text };
  if (browseId) run.navigationEndpoint = { browseEndpoint: { browseId } };
  if (videoId) run.navigationEndpoint = { watchEndpoint: { videoId } };
  return { title: { runs: [run] } };
}
const subtitle = (...texts: string[]) => ({ subtitle: { runs: texts.map((text) => ({ text })) } });

describe("missing thumbnails (#977)", () => {
  it.each<[string, (item: any) => any, any]>([
    ["parseAlbum", parseAlbum, { ...title("Title", { browseId: "MPREb_1" }), ...subtitle("Album", " • ", "2024") }],
    ["parseSingle", parseSingle, { ...title("Title", { browseId: "MPREb_1" }), ...subtitle("2024") }],
    ["parseSong", parseSong, { ...title(), ...subtitle("Artist"), navigationEndpoint: { watchEndpoint: { videoId: "videoId1" } } }],
    ["parseRelatedArtist", parseRelatedArtist, { ...title("Title", { browseId: "UC_1" }), ...subtitle("1M subscribers") }],
    ["parseWatchPlaylist", parseWatchPlaylist, { ...title(), navigationEndpoint: { watchPlaylistEndpoint: { playlistId: "RD1" } } }],
    ["parseChartPlaylist", parseChartPlaylist, title("Title", { browseId: "VLPL1" })],
    ["parsePodcast", parsePodcast, { ...title("Title", { browseId: "MPSP1" }), ...subtitle("Channel") }],
    ["parseBaseHeader", parseBaseHeader, { ...title(), straplineTextOne: {} }],
    ["parsePlaylistHeaderMeta", (item) => parsePlaylistHeaderMeta(item, "en"), { ...title(), secondSubtitle: {} }],
  ])("%s", (_name, parse, item) => {
    expect(parse(item).thumbnails).toBeNull();
  });

  it("parseAlbums (library)", () => {
    const item = { musicTwoRowItemRenderer: { ...title("Title", { browseId: "MPREb_1" }), subtitle: {} } };
    expect(parseAlbums([item])[0].thumbnails).toBeNull();
  });

  it("parseWatchTrack", () => {
    const track = {
      videoId: "videoId1",
      ...title(),
      menu: { menuRenderer: { items: [] } },
      longBylineText: { runs: [{ text: "Artist" }] },
    };
    expect(parseWatchTrack(track).thumbnail).toBeNull();
  });
});

describe("parsePlaylistHeaderMeta", () => {
  const header = (extra: object = {}) => ({
    title: { runs: [{ text: "My Playlist" }] },
    thumbnail: {
      musicThumbnailRenderer: { thumbnail: { thumbnails: [{ url: "https://example.com/t.jpg", width: 60, height: 60 }] } },
    },
    ...extra,
  });

  it("tolerates a missing secondSubtitle", () => {
    const parsed = parsePlaylistHeaderMeta(header(), "en");
    expect(parsed.title).toBe("My Playlist");
    expect(parsed.views).toBeNull();
    expect(parsed.duration).toBeNull();
    expect(parsed.trackCount).toBeNull();
  });

  it("reads the track count and duration", () => {
    const parsed = parsePlaylistHeaderMeta(
      header({ secondSubtitle: { runs: [{ text: "101 songs" }, { text: " • " }, { text: "6+ hours" }] } }),
      "en",
    );
    expect(parsed.trackCount).toBe(101);
    expect(parsed.duration).toBe("6+ hours");
  });

  it("parses abbreviated view counts (upstream returns 2 for '2.5M views')", () => {
    const parsed = parsePlaylistHeaderMeta(
      header({
        secondSubtitle: {
          runs: [{ text: "2.5M views" }, { text: " • " }, { text: "1,234 songs" }, { text: " • " }, { text: "6+ hours" }],
        },
      }),
      "en",
    );
    expect(parsed.views).toBe(2_500_000);
    expect(parsed.trackCount).toBe(1234);
  });
});

describe("parseSearchResult isAvailable", () => {
  const flexResult = (extra: object = {}) => ({
    flexColumns: [
      { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: "Song Title" }] } } },
      { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: "Artist" }] } } },
    ],
    ...extra,
  });
  const GREY_OUT = { musicItemRendererDisplayPolicy: "MUSIC_ITEM_RENDERER_DISPLAY_POLICY_GREY_OUT" };

  it("defaults to available", () => {
    expect(parseSearchResult(flexResult(), "song", "Songs").isAvailable).toBe(true);
  });

  it("marks the grey-out policy unavailable", () => {
    expect(parseSearchResult(flexResult(GREY_OUT), "video", "Videos").isAvailable).toBe(false);
  });

  it("keeps other policies available", () => {
    const result = flexResult({ musicItemRendererDisplayPolicy: "MUSIC_ITEM_RENDERER_DISPLAY_POLICY_DEFAULT" });
    expect(parseSearchResult(result, "song", "Songs").isAvailable).toBe(true);
  });

  it("does not add isAvailable to other result types", () => {
    expect(parseSearchResult(flexResult(), "album", "Albums")).not.toHaveProperty("isAvailable");
  });

  it("marks greyed-out episodes unavailable", () => {
    const parsed = parseSearchResult(flexResult(GREY_OUT), "episode", "Episodes");
    expect(parsed.isAvailable).toBe(false);
    expect(parsed.videoId).toBeNull();
  });

  it("does not mutate the response", () => {
    const result = flexResult();
    const before = JSON.stringify(result);
    parseSearchResult(result, null, "Top result");
    expect(JSON.stringify(result)).toBe(before);
  });
});

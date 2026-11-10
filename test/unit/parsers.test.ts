import { describe, expect, it } from "vitest";
import { MRLIR, MTRIR } from "../../src/nav.ts";
import { parseContentList, parseMixedContent, parsePlaylist } from "../../src/parsers/browsing.ts";
import { isDigits, jsonEqual, pyInt, toAsciiDigits, truthy } from "../../src/parsers/py.ts";
import { getSearchParams } from "../../src/parsers/search.ts";
import { parseArtistsRuns, parseLikeStatus, parseSongRun, parseSongRuns } from "../../src/parsers/songs.ts";
import { DOT_SEPARATOR_RUN, parseCount, parseDuration, toInt } from "../../src/parsers/utils.ts";

const DOT = DOT_SEPARATOR_RUN;
const linked = (name: string, browseId: string) => ({ text: name, navigationEndpoint: { browseEndpoint: { browseId } } });

describe("python helpers", () => {
  it("truthy follows Python rules", () => {
    for (const v of [null, undefined, false, 0, "", [], {}, Number.NaN]) expect(truthy(v)).toBe(false);
    for (const v of [1, "a", [0], { a: 1 }, true]) expect(truthy(v)).toBe(true);
  });

  it("handles Unicode digits like Python", () => {
    expect(toAsciiDigits("٣:٤٥")).toBe("3:45");
    expect(toAsciiDigits("१२३")).toBe("123");
    expect(toAsciiDigits("１２")).toBe("12");
    expect(toAsciiDigits("\u{1D7D8}\u{1D7DB}")).toBe("03"); // mathematical double-struck digits
    expect(isDigits("٣٤")).toBe(true);
    expect(pyInt("١٢")).toBe(12);
    expect(() => pyInt("12a")).toThrow();
  });

  it("compares dicts structurally", () => {
    expect(jsonEqual({ text: " • " }, DOT)).toBe(true);
    expect(jsonEqual({ text: " • ", extra: 1 }, DOT)).toBe(false);
    expect(jsonEqual([1, { a: [2] }], [1, { a: [2] }])).toBe(true);
  });
});

describe("parseSongRuns (upstream tests/parsers/test_songs.py)", () => {
  it("skips the type spec before an artist", () => {
    const runs = [{ text: "Song" }, DOT, linked("Eminem", "UCedvOgsKFzcK3hA5taf3KoQ"), DOT, { text: "2:16" }];
    expect(parseSongRuns(runs, true).artists).toEqual([{ name: "Eminem", id: "UCedvOgsKFzcK3hA5taf3KoQ" }]);
  });

  it("skips the type spec when the song has no artist", () => {
    const runs = [{ text: "Song" }, DOT, { text: "2:16" }, { text: "" }, { text: "5.4K plays" }];
    const parsed = parseSongRuns(runs, true);
    expect(parsed.artists).toBeUndefined();
    expect(parsed.duration).toBe("2:16");
    expect(parsed.duration_seconds).toBe(136);
    expect(parsed.views).toBe("5.4K");
  });

  it("does not strip a linked leading artist", () => {
    const runs = [linked("Eminem", "UCedvOgsKFzcK3hA5taf3KoQ"), DOT, { text: "2:16" }];
    expect(parseSongRuns(runs, true).artists).toEqual([{ name: "Eminem", id: "UCedvOgsKFzcK3hA5taf3KoQ" }]);
  });

  it("recognizes albums by browse id", () => {
    expect(parseSongRuns([linked("Revival", "MPREb_x")]).album).toEqual({ name: "Revival", id: "MPREb_x" });
  });
});

describe("parseSongRun", () => {
  it.each([
    ["1.7B views", "1.7B"],
    ["1,234,567 views", "1,234,567"],
    ["340 views", "340"],
    ["1,7 Mrd. Aufrufe", "1,7 Mrd."],
    ["125.459 Aufrufe", "125.459"],
    ["109 тыс. просмотров", "109 тыс."],
    ["1,7 Md de vues", "1,7 Md"],
    ["88 k vues", "88 k"],
    ["2 M de visualizaciones", "2 M"],
    ["6,1 Mln di visualizzazioni", "6,1 Mln"],
    ["3406万回視聴", "3406万回視聴"],
    ["747万次观看", "747万次观看"],
    ["1.7 مليار", "1.7 مليار"],
    ["74 लाख", "74 लाख"],
  ])("views %j", (text, expected) => {
    expect(parseSongRun({ text })).toEqual({ type: "views", data: expected });
  });

  it.each([
    ["조회수 17억회", "17억회"],
    ["조회수 340회", "340회"],
    ["觀看次數：17億次", "17億次"],
    ["播放次數：4505", "4505"],
    ["播放次数：3908万", "3908万"],
    ["再生回数 4.3億 回", "4.3億"],
    ["‫3.5 ارب بار چلائے گئے", "3.5 ارب"],
  ])("views with leading word %j", (text, expected) => {
    expect(parseSongRun({ text })).toEqual({ type: "views", data: expected });
  });

  it.each(["2Pac", "21", "6ix9ine", "AKB48", "乃木坂46", "22/7", "The Wolfpack & Reel Wolf"])("unlinked artist %j", (text) => {
    expect(parseSongRun({ text })).toEqual({ type: "artist", data: { name: text, id: null } });
  });

  it.each([
    ["3:48", "duration"],
    ["1:23:45", "duration"],
    ["2020", "year"],
  ])("%j is a %s", (text, type) => {
    expect(parseSongRun({ text })).toEqual({ type, data: text });
  });
});

describe("small parsers", () => {
  it("parses durations", () => {
    expect(parseDuration("3:48")).toBe(228);
    expect(parseDuration("1:23:45")).toBe(5025);
    expect(parseDuration(" ")).toBeNull();
    expect(parseDuration("2,343")).toBeNull();
    expect(parseDuration(null)).toBeNull();
  });

  it("parses artist runs and tolerates an even run count", () => {
    expect(parseArtistsRuns([{ text: "A" }, DOT, linked("B", "UCb")])).toEqual([
      { name: "A", id: null },
      { name: "B", id: "UCb" },
    ]);
    expect(parseArtistsRuns([{ text: "A" }, DOT])).toEqual([{ name: "A", id: null }]);
  });

  it("parses like status (inverted endpoint status)", () => {
    expect(parseLikeStatus({ likeEndpoint: { status: "LIKE" } })).toBe("INDIFFERENT");
    expect(parseLikeStatus({ likeEndpoint: { status: "INDIFFERENT" } })).toBe("LIKE");
  });

  it("toInt keeps digits and returns null instead of raising", () => {
    expect(toInt("1,234 songs")).toBe(1234);
    expect(toInt("12 Titel")).toBe(12);
    expect(toInt("no tracks")).toBeNull();
  });

  it.each([
    ["2M views", 2_000_000],
    ["1.3M views", 1_300_000],
    ["12K views", 12_000],
    ["1,234 views", 1234],
    ["125.459 Aufrufe", 125_459],
    ["1,7 Mrd. Aufrufe", 1_700_000_000],
    ["109 тыс. просмотров", 109_000],
    ["3406万回視聴", 34_060_000],
    ["17억회", 1_700_000_000],
    ["74 लाख", 7_400_000],
    ["1.7 مليار", 1_700_000_000],
    ["٣ مليون", 3_000_000],
  ])("parseCount %j", (text, expected) => {
    expect(parseCount(text)).toBe(expected);
  });

  it("parseCount handles language-specific abbreviations and unknowns", () => {
    expect(parseCount("1,2 B görüntüleme", "tr")).toBe(1200);
    expect(parseCount("1,2 B views", "en")).toBe(1_200_000_000);
    expect(parseCount("1,5 xyz")).toBeNull();
    expect(parseCount("views")).toBeNull();
    expect(parseCount(null)).toBeNull();
  });
});

describe("browsing parsers (upstream tests/parsers/test_browsing.py)", () => {
  const OWNED_PLAYLIST = {
    thumbnailRenderer: { musicThumbnailRenderer: { thumbnail: { thumbnails: [] } } },
    title: { runs: [{ text: "Family playlist", navigationEndpoint: { browseEndpoint: { browseId: "VLPL_family" } } }] },
    subtitle: {
      runs: [{ text: "Owner", navigationEndpoint: { browseEndpoint: { browseId: "UC_owner" } } }, { text: " • " }, { text: "1 track" }],
    },
    menu: {
      menuRenderer: {
        items: [
          {
            menuNavigationItemRenderer: {
              text: { runs: [{ text: "Edit playlist" }] },
              navigationEndpoint: { playlistEditorEndpoint: { playlistId: "PL_family" } },
            },
          },
        ],
      },
    },
  };

  it("marks playlists with an editor endpoint as owned", () => {
    const playlist = parsePlaylist(OWNED_PLAYLIST);
    expect(playlist.owned).toBe(true);
    expect(playlist.count).toBe("1");
    expect(playlist.author).toEqual([{ name: "Owner", id: "UC_owner" }]);
  });

  it("marks playlists without an editor endpoint as not owned", () => {
    const saved = structuredClone(OWNED_PLAYLIST) as any;
    saved.menu.menuRenderer.items[0].menuNavigationItemRenderer.navigationEndpoint = {
      watchPlaylistEndpoint: { playlistId: "PL_family" },
    };
    expect(parsePlaylist(saved).owned).toBe(false);
  });

  const playlistItem = (thumbnailRenderer: object) => ({
    title: { runs: [{ text: "My playlist", navigationEndpoint: { browseEndpoint: { browseId: "VLPLabc123" } } }] },
    subtitle: { runs: [{ text: "Playlist" }] },
    ...thumbnailRenderer,
  });

  it("parses thumbnails", () => {
    const thumbnails = [{ url: "https://example.com/t.jpg", width: 1, height: 1 }];
    const parsed = parsePlaylist(playlistItem({ thumbnailRenderer: { musicThumbnailRenderer: { thumbnail: { thumbnails } } } }));
    expect(parsed.playlistId).toBe("PLabc123");
    expect(parsed.thumbnails).toEqual(thumbnails);
  });

  it.each([
    {},
    { thumbnailRenderer: {} },
    { thumbnailRenderer: { musicThumbnailRenderer: {} } },
    { thumbnailRenderer: { musicThumbnailRenderer: { thumbnail: {} } } },
  ])("missing thumbnails are null (%j)", (renderer) => {
    expect(parsePlaylist(playlistItem(renderer)).thumbnails).toBeNull();
  });

  it("skips mixed renderers in content lists", () => {
    const results = [{ [MTRIR]: { id: 1 } }, { [MRLIR]: { id: 2 } }, { [MTRIR]: { id: 3 } }];
    expect(parseContentList(results, (item) => item.id, MTRIR)).toEqual([1, 3]);
    expect(parseContentList(results, (item) => item.id, MRLIR)).toEqual([2]);
  });

  it.each([false, true])("an unavailable upload does not hide other recommendations (%s)", (includeUnavailable) => {
    const artistEndpoint = {
      browseEndpoint: {
        browseId: "UCartist",
        browseEndpointContextSupportedConfigs: { browseEndpointContextMusicConfig: { pageType: "MUSIC_PAGE_TYPE_ARTIST" } },
      },
    };
    const artist = { title: { runs: [{ text: "Artist", navigationEndpoint: artistEndpoint }] }, subtitle: {}, navigationEndpoint: artistEndpoint };
    const song = {
      title: { runs: [{ text: "Song" }] },
      subtitle: { runs: [{ text: "Artist" }] },
      navigationEndpoint: { watchEndpoint: { videoId: "video-id" } },
    };
    const watchPlaylist = {
      title: { runs: [{ text: "Radio" }] },
      navigationEndpoint: { watchPlaylistEndpoint: { playlistId: "RDplaylist" } },
    };
    const contents: any[] = [{ [MTRIR]: artist }, { [MTRIR]: song }, { [MTRIR]: watchPlaylist }];
    if (includeUnavailable) {
      const unavailable = structuredClone(artist) as any;
      unavailable.title = { runs: [{ text: "Anthony M" }] };
      delete unavailable.navigationEndpoint.browseEndpoint.browseId;
      contents.splice(1, 0, { [MTRIR]: unavailable });
    }

    expect(parseMixedContent([{ musicCarouselShelfRenderer: { contents } }])).toEqual([
      {
        title: null,
        contents: [
          { title: "Artist", browseId: "UCartist", subscribers: null, thumbnails: null },
          { title: "Song", videoId: "video-id", playlistId: null, thumbnails: null, artists: [{ name: "Artist", id: null }] },
          { title: "Radio", playlistId: "RDplaylist", thumbnails: null },
        ],
      },
    ]);
  });
});

describe("getSearchParams", () => {
  it("builds params for filters, scopes and spelling", () => {
    expect(getSearchParams(null, null, false)).toBeNull();
    expect(getSearchParams("songs", null, false)).toBe("EgWKAQIIAWoMEA4QChADEAQQCRAF");
    expect(getSearchParams("songs", null, true)).toBe("EgWKAQIIAUICCAFqDBAOEAoQAxAEEAkQBQ%3D%3D");
    expect(getSearchParams("playlists", null, false)).toBe("Eg-KAQwIABAAGAAgACgBMABqChAEEAMQCRAFEAo%3D");
    expect(getSearchParams("featured_playlists", null, false)).toBe("EgeKAQQoADgBagwQDhAKEAMQBBAJEAU%3D");
    expect(getSearchParams(null, "uploads", false)).toBe("agIYAw%3D%3D");
    expect(getSearchParams(null, "library", false)).toBe("agIYBA%3D%3D");
    expect(getSearchParams("albums", "library", false)).toBe("EgWKAQIYAWoKEAUQCRADEAoYBA%3D%3D");
    expect(getSearchParams(null, null, true)).toBe("EhGKAQ4IARABGAEgASgAOAFAAUICCAE%3D");
  });
});

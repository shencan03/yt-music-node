import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { YTMusic, YTMusicGatedError, YTMusicServerError, YTMusicUserError } from "../../src/index.ts";
import { fakeFetch, json, type RecordedRequest } from "../helpers.ts";

const BROWSER_AUTH = {
  cookie: "__Secure-3PAPISID=sap; SAPISID=sap",
  "x-goog-authuser": "1",
  "x-goog-visitor-id": "V",
  origin: "https://music.youtube.com",
};

/** Client whose InnerTube responses come from `respond` (by endpoint path). */
function client(
  respond: (endpoint: string, body: any, request: RecordedRequest) => Response,
  auth: Record<string, string> | undefined = BROWSER_AUTH,
) {
  const fetch = fakeFetch((request) => {
    const url = new URL(request.url);
    const endpoint = url.pathname.replace("/youtubei/v1/", "");
    const body = request.body && request.body.startsWith("{") ? JSON.parse(request.body) : request.body;
    return respond(endpoint, body, request);
  });
  return { ytm: new YTMusic({ auth, visitorData: "V", fetch }), fetch };
}

const GATED = {
  actions: [{ showEngagementPanelEndpoint: { identifier: { tag: "PAfeature_enablement" } } }],
};

describe("write endpoints", () => {
  it("createPlaylist validates the title and detects gated responses", async () => {
    const { ytm, fetch } = client(() => json(GATED));
    await expect(ytm.createPlaylist("test >", "test")).rejects.toThrow(/invalid characters/);
    expect(fetch.requests).toHaveLength(0);
    await expect(ytm.createPlaylist("test", "test")).rejects.toThrow(YTMusicGatedError);
    await expect(ytm.createPlaylist("test", "test")).rejects.toThrow(/PAfeature_enablement/);
  });

  it("createPlaylist returns the id and strips html from the description", async () => {
    const { ytm, fetch } = client(() => json({ playlistId: "PLnew" }));
    expect(await ytm.createPlaylist("t", "<b>bold</b> & more", { videoIds: ["a"] })).toBe("PLnew");
    const body = JSON.parse(fetch.requests[0]!.body!);
    expect(body).toMatchObject({ title: "t", description: "bold & more", privacyStatus: "PRIVATE", videoIds: ["a"] });
  });

  it("addPlaylistItems rejects duplicate videoIds", async () => {
    const { ytm } = client(() => json({}));
    await expect(ytm.addPlaylistItems("PLABC", { videoIds: ["songA", "songB", "songA"] })).rejects.toThrow(/Duplicate videoIds/);
    await expect(ytm.addPlaylistItems("PLABC", {})).rejects.toThrow(YTMusicUserError);
  });

  it("write requests are not retried", async () => {
    const fetch = fakeFetch(() => json({ error: { message: "boom" } }, { status: 503 }));
    const ytm = new YTMusic({ auth: BROWSER_AUTH, visitorData: "V", retry: 3, fetch });
    await expect(ytm.deletePlaylist("PLx")).rejects.toThrow(YTMusicServerError);
    expect(fetch.requests).toHaveLength(1);
  });

  it("joinCollaborativePlaylist sends the join action once", async () => {
    const { ytm, fetch } = client(() => json({ status: "STATUS_SUCCEEDED" }));
    expect(await ytm.joinCollaborativePlaylist("VLPLabc", "token-1")).toBe("STATUS_SUCCEEDED");
    expect(fetch.requests).toHaveLength(1);
    const body = JSON.parse(fetch.requests[0]!.body!);
    expect(body.playlistId).toBe("PLabc");
    expect(body.actions).toEqual([{ action: "ACTION_JOIN_COLLABORATION", joinCollaborationToken: "token-1" }]);
  });

  it("setTasteProfile sends the selected and shown artists", async () => {
    const profile = {
      Oasis: { selectionValue: "sel-oasis", impressionValue: "imp-oasis" },
      Blur: { selectionValue: "sel-blur", impressionValue: "imp-blur" },
    };
    const { ytm, fetch } = client(() => json({}));
    await ytm.setTasteProfile(["Blur"], { tasteProfile: profile });
    const body = JSON.parse(fetch.requests[0]!.body!);
    expect(body.browseId).toBe("FEmusic_home");
    expect(body.formData).toEqual({ impressionValues: ["imp-oasis", "imp-blur"], selectedValues: ["sel-blur"] });
    await expect(ytm.setTasteProfile(["Nobody"], { tasteProfile: profile })).rejects.toThrow(/not present in taste/);
  });

  it("requires auth", async () => {
    const ytm = new YTMusic({ visitorData: "V", fetch: fakeFetch(() => json({})) });
    await expect(ytm.rateSong("v", "LIKE")).rejects.toThrow(/Please provide authentication/);
    await expect(ytm.getLibrarySongs()).rejects.toThrow(/Please provide authentication/);
    // checked up front, before any request (upstream fails later or not at all)
    const auth = /Please provide authentication/;
    await expect(ytm.getSavedEpisodes()).rejects.toThrow(auth);
    await expect(ytm.getEpisodesPlaylist()).rejects.toThrow(auth);
    await expect(ytm.setTasteProfile(["A"], { tasteProfile: { A: { selectionValue: "s", impressionValue: "i" } } })).rejects.toThrow(auth);
    await expect(ytm.search("x", { scope: "library" })).rejects.toThrow(auth);
    await expect(
      ytm.removeSearchSuggestions([{ text: "x", runs: [], fromHistory: true, feedbackToken: "t" }]),
    ).rejects.toThrow(auth);
  });

  it("validates library order", async () => {
    const { ytm } = client(() => json({}));
    await expect(ytm.getLibraryAlbums({ order: "wrong" as never })).rejects.toThrow(/Invalid order/);
    await expect(ytm.rateSong("v", "LOVE" as never)).rejects.toThrow(/Invalid rating/);
  });

  it("deleteUploadEntity strips the browse prefix", async () => {
    const { ytm, fetch } = client(() => json({}));
    expect(await ytm.deleteUploadEntity("FEmusic_library_privately_owned_release_detailb_po_abc")).toBe("STATUS_SUCCEEDED");
    expect(JSON.parse(fetch.requests[0]!.body!).entityId).toBe("b_po_abc");
  });
});

describe("uploadSong", () => {
  function uploadClient(options: { startStatus?: number; uploadStatus?: number; noUrl?: boolean } = {}) {
    return client((_endpoint, _body, request) => {
      if (request.url.startsWith("https://upload.youtube.com/upload/usermusic/http?")) {
        return new Response("", {
          status: options.startStatus ?? 200,
          headers: options.noUrl ? {} : { "x-goog-upload-url": "https://upload.youtube.com/session/123" },
        });
      }
      if (request.url === "https://upload.youtube.com/session/123") {
        return new Response("ok", { status: options.uploadStatus ?? 200 });
      }
      throw new Error(`unexpected ${request.url}`);
    });
  }

  it("uploads data in two requests with browser auth", async () => {
    const { ytm, fetch } = uploadClient();
    const data = new Uint8Array([1, 2, 3, 4]);
    expect(await ytm.uploadSong({ data, filename: "Song Name.MP3" })).toBe("STATUS_SUCCEEDED");

    const [start, upload] = fetch.requests;
    expect(start!.url).toBe("https://upload.youtube.com/upload/usermusic/http?authuser=1");
    expect(start!.body).toBe("filename=Song Name.MP3");
    expect(start!.headers.get("x-goog-upload-command")).toBe("start");
    expect(start!.headers.get("x-goog-upload-header-content-length")).toBe("4");
    expect(start!.headers.get("x-goog-upload-protocol")).toBe("resumable");
    expect(start!.headers.get("content-type")).toBe("application/x-www-form-urlencoded;charset=utf-8");
    expect(start!.headers.get("authorization")).toMatch(/^SAPISIDHASH /);
    expect(upload!.headers.get("x-goog-upload-command")).toBe("upload, finalize");
    expect(upload!.headers.get("x-goog-upload-offset")).toBe("0");
  });

  it("uploads from a path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ytm-upload-"));
    const path = join(dir, "track.flac");
    await writeFile(path, new Uint8Array(10));
    const { ytm, fetch } = uploadClient();
    expect(await ytm.uploadSong(path)).toBe("STATUS_SUCCEEDED");
    expect(fetch.requests[0]!.body).toBe("filename=track.flac");
    expect(fetch.requests[0]!.headers.get("x-goog-upload-header-content-length")).toBe("10");
    await expect(ytm.uploadSong(join(dir, "missing.mp3"))).rejects.toThrow(/does not exist/);
  });

  it("validates type, size and auth", async () => {
    const { ytm, fetch } = uploadClient();
    await expect(ytm.uploadSong({ data: new Uint8Array(1), filename: "a.wav" })).rejects.toThrow(/not supported/);
    const big = { size: 314_572_800 } as Blob;
    Object.setPrototypeOf(big, Blob.prototype);
    await expect(ytm.uploadSong({ data: big, filename: "a.mp3" })).rejects.toThrow(/larger than the limit/);
    expect(fetch.requests).toHaveLength(0);

    const anonymous = new YTMusic({ visitorData: "V", fetch });
    await expect(anonymous.uploadSong({ data: new Uint8Array(1), filename: "a.mp3" })).rejects.toThrow(/Please provide authentication/);
  });

  it("uses its own timeout for the upload request", async () => {
    const fetch = fakeFetch(async (request) => {
      if (request.url.includes("/session/")) {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return new Response("ok");
      }
      return new Response("", { headers: { "x-goog-upload-url": "https://upload.youtube.com/session/1" } });
    });
    const ytm = new YTMusic({ auth: BROWSER_AUTH, timeoutMs: 20, fetch });
    const data = { data: new Uint8Array(1), filename: "a.mp3" };
    expect(await ytm.uploadSong(data)).toBe("STATUS_SUCCEEDED");
    await expect(ytm.uploadSong(data, { timeoutMs: 10 })).rejects.toThrow(/timed out after 10ms/);
  });

  it("throws on failed requests (upstream returns the response or raises KeyError)", async () => {
    const data = { data: new Uint8Array(1), filename: "a.mp3" };
    await expect(uploadClient({ startStatus: 401 }).ytm.uploadSong(data)).rejects.toThrow(/Starting the upload failed with HTTP 401/);
    await expect(uploadClient({ noUrl: true }).ytm.uploadSong(data)).rejects.toThrow(YTMusicServerError);
    const error = await uploadClient({ uploadStatus: 500 }).ytm.uploadSong(data).catch((e) => e);
    expect(error).toBeInstanceOf(YTMusicServerError);
    expect(error.status).toBe(500);
  });
});

describe("getLyrics timestamp shapes (upstream test_get_lyrics_timestamp_shapes)", () => {
  const response = (timedLyricsData: unknown) => ({
    contents: {
      elementRenderer: {
        newElement: {
          type: {
            componentType: {
              model: { timedLyricsModel: { lyricsData: { timedLyricsData, sourceMessage: "Source: Test" } } },
            },
          },
        },
      },
    },
  });
  const cue = (start: string, end: string, id: string) => ({
    startTimeMilliseconds: start,
    endTimeMilliseconds: end,
    metadata: { id },
  });

  it.each([
    [
      [
        { lyricLine: "First line", cueRange: cue("1000", "2000", "1") },
        { lyricLine: "Second line", cueRange: cue("2000", "3000", "2") },
      ],
      [
        { text: "First line", start_time: 1000, end_time: 2000, id: 1 },
        { text: "Second line", start_time: 2000, end_time: 3000, id: 2 },
      ],
      true,
    ],
    [[{ lyricLine: "First line" }, { lyricLine: "Second line" }], "First line\nSecond line", false],
    [[{ lyricLine: "First line", cueRange: cue("1000", "2000", "1") }, { lyricLine: "Second line" }], "First line\nSecond line", false],
  ])("shape %#", async (data, lyrics, hasTimestamps) => {
    const { ytm, fetch } = client(() => json(response(data)), undefined);
    const result = await ytm.getLyrics("MPLYtest", { timestamps: true });
    expect(result?.lyrics).toEqual(lyrics);
    expect(result?.source).toBe("Source: Test");
    expect(result?.hasTimestamps).toBe(hasTimestamps);
    // timestamped lyrics are requested as the mobile app
    expect(JSON.parse(fetch.requests[0]!.body!).context.client.clientName).toBe("ANDROID_MUSIC");
  });

  it("rejects an empty browseId", async () => {
    const { ytm } = client(() => json({}), undefined);
    await expect(ytm.getLyrics("")).rejects.toThrow(/might not have lyrics/);
  });
});

describe("prototype wiring", () => {
  it("exposes endpoint methods on the class, non-enumerably", () => {
    const ytm = new YTMusic();
    for (const name of ["getHome", "search", "getWatchPlaylist", "getCharts", "getLibrarySongs", "getPlaylist", "getPodcast", "uploadSong"]) {
      expect(typeof (ytm as any)[name]).toBe("function");
    }
    expect(Object.keys(YTMusic.prototype)).toEqual([]);
  });
});

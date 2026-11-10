import { describe, expect, it, vi } from "vitest";
import { YTMusic, extractVisitorData, MOBILE_CLIENT, YTMusicServerError, YTMusicUserError } from "../../src/index.ts";
import { fakeFetch, HOMEPAGE, json, never } from "../helpers.ts";

/** Homepage on GET, echo of the parsed body on POST. */
function echoFetch() {
  return fakeFetch((request) =>
    request.method === "GET"
      ? new Response(HOMEPAGE, { headers: { "content-type": "text/html" } })
      : json({ received: JSON.parse(request.body ?? "{}") }),
  );
}

const silent = { warn: vi.fn() };

describe("YTMusic constructor", () => {
  it("validates language and location", () => {
    expect(() => new YTMusic({ language: "xx" as never })).toThrow(YTMusicUserError);
    expect(() => new YTMusic({ language: "xx" as never })).toThrow(/Supported languages are ar, cs/);
    expect(() => new YTMusic({ location: "XX" as never })).toThrow("Location not supported");
    expect(() => new YTMusic({ timeoutMs: 0 })).toThrow("timeoutMs");
    expect(new YTMusic({ language: "zh_CN", location: "TW" }).language).toBe("zh_CN");
  });

  it("is unauthenticated by default", () => {
    const ytm = new YTMusic();
    expect(ytm.authType).toBe("unauthorized");
    expect(() => ytm.checkAuth()).toThrow("Please provide authentication");
  });
});

describe("YTMusic requests", () => {
  it("posts to youtubei with context, headers and visitor id", async () => {
    const fetch = echoFetch();
    const ytm = new YTMusic({ fetch, language: "de", location: "DE", user: "brand1" });
    const result = await ytm.request("browse", { browseId: "FEmusic_home" });

    expect(fetch.requests.map((r) => `${r.method} ${r.url}`)).toEqual([
      "GET https://music.youtube.com",
      "POST https://music.youtube.com/youtubei/v1/browse?alt=json",
    ]);
    expect(result.received).toMatchObject({
      browseId: "FEmusic_home",
      context: { client: { clientName: "WEB_REMIX", hl: "de", gl: "DE" }, user: { onBehalfOfUser: "brand1" } },
    });

    const headers = fetch.requests[1]!.headers;
    expect(headers.get("x-goog-visitor-id")).toBe("VISITOR123");
    expect(headers.get("cookie")).toBe("SOCS=CAI");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("origin")).toBe("https://music.youtube.com");
    // upstream sends this on uncompressed bodies; YouTube ignores it, so it is dropped
    expect(headers.has("content-encoding")).toBe(false);
  });

  it("does not mutate the caller's body", async () => {
    const ytm = new YTMusic({ fetch: echoFetch() });
    const body = { browseId: "x" };
    await ytm.request("browse", body);
    expect(body).toEqual({ browseId: "x" });
  });

  it("appends additional params and switches client per request", async () => {
    const fetch = echoFetch();
    const ytm = new YTMusic({ fetch });
    const [mobile, web] = await Promise.all([
      ytm.request("browse", {}, { client: MOBILE_CLIENT, additionalParams: "&ctoken=a&continuation=a" }),
      ytm.request("browse", {}),
    ]);
    expect(mobile.received.context.client.clientName).toBe("ANDROID_MUSIC");
    expect(web.received.context.client.clientName).toBe("WEB_REMIX");
    expect(fetch.requests.some((r) => r.url.endsWith("?alt=json&ctoken=a&continuation=a"))).toBe(true);
  });

  it("fetches the visitor id once for concurrent first requests", async () => {
    const fetch = echoFetch();
    const ytm = new YTMusic({ fetch });
    await Promise.all([ytm.request("a"), ytm.request("b"), ytm.request("c")]);
    expect(fetch.requests.filter((r) => r.method === "GET")).toHaveLength(1);
  });

  it("skips the homepage when visitorData is given", async () => {
    const fetch = echoFetch();
    const ytm = new YTMusic({ fetch, visitorData: "MINE" });
    await ytm.request("browse");
    expect(fetch.requests).toHaveLength(1);
    expect(fetch.requests[0]!.headers.get("x-goog-visitor-id")).toBe("MINE");
  });

  it("warns and continues without a visitor id when the homepage has none", async () => {
    const logger = { warn: vi.fn() };
    const fetch = fakeFetch((r) => (r.method === "GET" ? new Response("<html></html>") : json({})));
    const ytm = new YTMusic({ fetch, logger });
    await ytm.request("browse");
    await ytm.request("browse");
    expect(logger.warn).toHaveBeenCalledOnce();
    expect(fetch.requests[1]!.headers.has("x-goog-visitor-id")).toBe(false);
  });

  it("retries the visitor id lookup after a network failure", async () => {
    let fail = true;
    const fetch = fakeFetch((r) => {
      if (r.method === "GET") {
        if (fail) throw new TypeError("offline");
        return new Response(HOMEPAGE);
      }
      return json({});
    });
    const ytm = new YTMusic({ fetch, logger: silent });
    await expect(ytm.request("browse")).rejects.toThrow("Network error: offline");
    fail = false;
    await ytm.request("browse");
    expect(fetch.requests.at(-1)!.headers.get("x-goog-visitor-id")).toBe("VISITOR123");
  });

  it("throws server errors with details", async () => {
    const fetch = fakeFetch((r) =>
      r.method === "GET"
        ? new Response(HOMEPAGE)
        : json({ error: { message: "Not found", status: "NOT_FOUND" } }, { status: 404, statusText: "Not Found" }),
    );
    const error = await new YTMusic({ fetch }).request("browse").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(YTMusicServerError);
    expect(error).toMatchObject({ status: 404, reason: "NOT_FOUND", message: "Server returned HTTP 404: Not Found. Not found" });
  });

  it("does not retry requests marked as non-retryable", async () => {
    const fetch = fakeFetch((r) => (r.method === "GET" ? new Response(HOMEPAGE) : new Response("", { status: 503 })));
    const ytm = new YTMusic({ fetch, retry: { retries: 3, minDelayMs: 1 } });
    await expect(ytm.request("playlist/create", {}, { retry: false })).rejects.toThrow("HTTP 503");
    expect(fetch.requests.filter((r) => r.method === "POST")).toHaveLength(1);
  });

  it("lets a caller abort while the shared visitor lookup is pending", async () => {
    const fetch = fakeFetch((r) => (r.method === "GET" ? never() : json({})));
    const ytm = new YTMusic({ fetch, timeoutMs: 5000 });
    const controller = new AbortController();
    const pending = ytm.request("browse", {}, { signal: controller.signal });
    controller.abort(new Error("cancelled"));
    await expect(pending).rejects.toThrow("cancelled");
  });

  it("sends GET requests with query params", async () => {
    const fetch = echoFetch();
    const ytm = new YTMusic({ fetch, visitorData: "V" });
    await ytm.sendGetRequest("https://music.youtube.com/playlist", { params: { list: "OLAK5uy_x", n: 2 } });
    expect(fetch.requests[0]!.url).toBe("https://music.youtube.com/playlist?list=OLAK5uy_x&n=2");
  });
});

describe("extractVisitorData", () => {
  it("reads VISITOR_DATA from the first ytcfg.set call", () => {
    expect(extractVisitorData(HOMEPAGE)).toBe("VISITOR123");
    expect(extractVisitorData("ytcfg.set({});")).toBeUndefined();
    expect(extractVisitorData("ytcfg.set({broken);")).toBeUndefined();
    expect(extractVisitorData("")).toBeUndefined();
  });
});

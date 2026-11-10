import { describe, expect, it } from "vitest";
import { YTMusicServerError } from "../../src/errors.ts";
import { parseJsonResponse, resolveRetry, retryAfterMs, send, stripQuery, type HttpConfig, type HttpResponse } from "../../src/http.ts";
import { fakeFetch, json, never } from "../helpers.ts";

function response(text: string, status = 200, statusText = "OK"): HttpResponse {
  return {
    status,
    statusText,
    ok: status >= 200 && status < 300,
    headers: new Headers(),
    url: "https://music.youtube.com/youtubei/v1/browse?alt=json&key=secret",
    text,
  };
}

function config(fetch: HttpConfig["fetch"], overrides: Partial<HttpConfig> = {}): HttpConfig {
  return {
    fetch,
    timeoutMs: 1000,
    retry: { retries: 2, minDelayMs: 1, maxDelayMs: 5 },
    hooks: {},
    ...overrides,
  };
}

const post = { method: "POST" as const, headers: new Headers(), body: "{}", retryable: true };

describe("parseJsonResponse", () => {
  it("parses successful JSON responses", () => {
    expect(parseJsonResponse(response('{"a":1}'))).toEqual({ a: 1 });
    expect(parseJsonResponse(response(""))).toEqual({});
  });

  it("reports HTML error pages as server errors (upstream raises JSONDecodeError)", () => {
    try {
      parseJsonResponse(response("<html>Too many requests</html>", 429, "Too Many Requests"));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(YTMusicServerError);
      const e = error as YTMusicServerError;
      expect(e.message).toBe("Server returned HTTP 429: Too Many Requests.");
      expect(e.status).toBe(429);
      expect(e.body).toBe("<html>Too many requests</html>");
      expect(e.url).toBe("https://music.youtube.com/youtubei/v1/browse");
    }
  });

  it("includes the InnerTube error message and status", () => {
    const body = JSON.stringify({ error: { code: 400, message: "Request contains an invalid argument.", status: "INVALID_ARGUMENT" } });
    expect(() => parseJsonResponse(response(body, 400, "Bad Request"))).toThrow(
      "Server returned HTTP 400: Bad Request. Request contains an invalid argument.",
    );
    try {
      parseJsonResponse(response(body, 400, "Bad Request"));
    } catch (error) {
      expect((error as YTMusicServerError).reason).toBe("INVALID_ARGUMENT");
    }
  });

  it("handles an error payload without message (upstream raises TypeError)", () => {
    expect(() => parseJsonResponse(response('{"error":{}}', 500, ""))).toThrow("Server returned HTTP 500.");
  });

  it("rejects invalid JSON on success", () => {
    expect(() => parseJsonResponse(response("not json"))).toThrow("not valid JSON");
  });
});

describe("retry helpers", () => {
  it("parses Retry-After as seconds or HTTP date", () => {
    expect(retryAfterMs("3")).toBe(3000);
    expect(retryAfterMs(new Date(10_000).toUTCString(), 4_000)).toBe(6000);
    expect(retryAfterMs("garbage")).toBeUndefined();
    expect(retryAfterMs(null)).toBeUndefined();
  });

  it("resolves retry options", () => {
    expect(resolveRetry(undefined).retries).toBe(0);
    expect(resolveRetry(false).retries).toBe(0);
    expect(resolveRetry(5).retries).toBe(5);
    expect(resolveRetry({}).retries).toBe(2);
    expect(resolveRetry({ maxDelayMs: 1 })).toEqual({ retries: 2, minDelayMs: 500, maxDelayMs: 1 });
  });

  it("strips query strings", () => {
    expect(stripQuery("https://x/y?key=1")).toBe("https://x/y");
    expect(stripQuery("https://x/y")).toBe("https://x/y");
  });
});

describe("send", () => {
  it("retries retryable statuses and returns the final response", async () => {
    const fetch = fakeFetch((_, i) => (i < 2 ? new Response("busy", { status: 503 }) : json({ ok: true })));
    const result = await send(config(fetch), "https://x", post);
    expect(result.status).toBe(200);
    expect(fetch.requests).toHaveLength(3);
  });

  it("returns the last failing response once retries are exhausted", async () => {
    const fetch = fakeFetch(() => new Response("busy", { status: 503 }));
    const result = await send(config(fetch), "https://x", post);
    expect(result.status).toBe(503);
    expect(fetch.requests).toHaveLength(3);
  });

  it("does not retry non-retryable requests or statuses", async () => {
    const fetch = fakeFetch(() => new Response("busy", { status: 503 }));
    await send(config(fetch), "https://x", { ...post, retryable: false });
    expect(fetch.requests).toHaveLength(1);

    const notFound = fakeFetch(() => new Response("nope", { status: 404 }));
    await send(config(notFound), "https://x", post);
    expect(notFound.requests).toHaveLength(1);
  });

  it("wraps network errors and retries them", async () => {
    const fetch = fakeFetch(() => {
      throw new TypeError("fetch failed");
    });
    await expect(send(config(fetch), "https://x?secret=1", post)).rejects.toMatchObject({
      name: "YTMusicServerError",
      message: "Network error: fetch failed",
      url: "https://x",
    });
    expect(fetch.requests).toHaveLength(3);
  });

  it("times out each attempt", async () => {
    const fetch = fakeFetch(never);
    const promise = send(config(fetch, { timeoutMs: 20, retry: resolveRetry(0) }), "https://x", post);
    await expect(promise).rejects.toThrow("Request timed out after 20ms");
  });

  it("rethrows the caller's abort reason without retrying", async () => {
    const fetch = fakeFetch(never);
    const controller = new AbortController();
    const promise = send(config(fetch), "https://x", { ...post, signal: controller.signal });
    controller.abort(new Error("stop"));
    await expect(promise).rejects.toThrow("stop");
    expect(fetch.requests).toHaveLength(1);
  });

  it("calls hooks for every attempt", async () => {
    const events: string[] = [];
    const fetch = fakeFetch((_, i) => (i === 0 ? new Response("", { status: 500 }) : json({})));
    await send(
      config(fetch, {
        hooks: {
          onRequest: (e) => events.push(`req ${e.attempt}`),
          onResponse: (e) => events.push(`res ${e.attempt} ${e.status}`),
        },
      }),
      "https://x",
      post,
    );
    expect(events).toEqual(["req 0", "res 0 500", "req 1", "res 1 200"]);
  });
});

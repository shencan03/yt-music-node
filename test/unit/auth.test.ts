import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  YTMusic,
  YTMusicUserError,
  determineAuthType,
  getAuthorization,
  parseAuth,
  parseBrowserHeaders,
  parseCookie,
  sapisidFromCookie,
} from "../../src/index.ts";
import { encodeHeaderValue } from "../../src/auth/index.ts";
import { fakeFetch, HOMEPAGE, json } from "../helpers.ts";

const fixture = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");

const COOKIE = "PREF=x; SAPISID=sap1; __Secure-3PAPISID=sap3; other=1";
const BROWSER_HEADERS = {
  Cookie: COOKIE,
  "X-Goog-AuthUser": "2",
  "x-origin": "https://music.youtube.com",
  "User-Agent": "Browser UA",
  "Content-Length": "123",
  "Content-Encoding": "gzip",
};

function ytmFetch() {
  return fakeFetch((request) =>
    request.method === "GET" ? new Response(HOMEPAGE) : json({ ok: true, url: request.url }),
  );
}

describe("browser auth helpers", () => {
  it("parses cookies", () => {
    expect(parseCookie(`a=1; b="2"; c=x=y; a=3; junk`)).toEqual({ a: "1", b: "2", c: "x=y" });
  });

  it("finds the SAPISID with fallbacks", () => {
    expect(sapisidFromCookie(COOKIE)).toBe("sap3");
    expect(sapisidFromCookie("SAPISID=only")).toBe("only");
    expect(sapisidFromCookie("__Secure-1PAPISID=one")).toBe("one");
    expect(() => sapisidFromCookie("a=1")).toThrow(/__Secure-3PAPISID/);
  });

  it("computes the SAPISIDHASH like upstream", async () => {
    // sha1("1700000000 sap3 https://music.youtube.com")
    const value = await getAuthorization("sap3 https://music.youtube.com", 1_700_000_000_000);
    expect(value).toMatch(/^SAPISIDHASH 1700000000_[0-9a-f]{40}$/);
    const { createHash } = await import("node:crypto");
    const expected = createHash("sha1").update("1700000000 sap3 https://music.youtube.com").digest("hex");
    expect(value).toBe(`SAPISIDHASH 1700000000_${expected}`);
  });

  it.each(["raw_chrome_headers.txt", "raw_firefox_headers.txt"])("parses %s", (file) => {
    const headers = parseBrowserHeaders(fixture(file));
    expect(Object.keys(headers).length).toBeGreaterThan(2);
    expect(headers.cookie).toBeTruthy();
    expect(headers["x-goog-authuser"]).toBeTruthy();
    expect(Object.keys(headers).some((k) => k.startsWith("sec"))).toBe(false);
    expect(headers.host).toBeUndefined();
    expect(headers["content-length"]).toBeUndefined();
    expect(headers.origin).toBe("https://music.youtube.com");
    // the fixtures' cookies are redacted, so there is no SAPISID
    expect(() => new YTMusic({ auth: headers })).toThrow(/__Secure-3PAPISID/);
    const ytm = new YTMusic({ auth: { ...headers, cookie: COOKIE } });
    expect(ytm.authType).toBe("browser");
  });

  it("rejects headers without cookie or authuser", () => {
    expect(() => parseBrowserHeaders("accept: */*\nfoo: bar")).toThrow(/cookie, x-goog-authuser/);
  });
});

describe("parseAuth", () => {
  it("detects the auth type", () => {
    expect(parseAuth(BROWSER_HEADERS).type).toBe("browser");
    expect(parseAuth({ authorization: "SAPISIDHASH 1_abc", cookie: COOKIE }).type).toBe("browser");
    expect(parseAuth(JSON.stringify(BROWSER_HEADERS)).type).toBe("browser");
  });

  it("lower-cases names and drops hop-by-hop headers", () => {
    const { headers } = parseAuth(BROWSER_HEADERS);
    expect(headers).toEqual({
      cookie: COOKIE,
      "x-goog-authuser": "2",
      "x-origin": "https://music.youtube.com",
      "user-agent": "Browser UA",
    });
  });

  it("percent-encodes non-ASCII header values", () => {
    expect(encodeHeaderValue("abc é ü")).toBe("abc %C3%A9 %C3%BC");
    expect(parseAuth({ cookie: "name=Jürgen" }).headers.cookie).toBe("name=J%C3%BCrgen");
  });

  it("rejects invalid input with helpful errors", () => {
    expect(() => parseAuth("def")).toThrow(/Invalid auth/);
    expect(() => parseAuth("browser.json")).toThrow(/fromAuthFile/);
    expect(() => parseAuth("{not json")).toThrow(YTMusicUserError);
    expect(() => parseAuth({ accept: "*/*" })).toThrow(/Could not determine the auth type/);
    // headers without a session cookie (e.g. only an authorization header) are not accepted
    expect(() => parseAuth({ authorization: "Bearer xyz" })).toThrow(/cookie/);
    expect(() => determineAuthType({})).toThrow(YTMusicUserError);
  });
});

describe("authenticated clients", () => {
  it("sends browser auth headers", async () => {
    const fetch = ytmFetch();
    const ytm = new YTMusic({ auth: BROWSER_HEADERS, fetch });
    expect(ytm.authType).toBe("browser");
    expect(ytm.authHeader("X-Goog-AuthUser")).toBe("2");
    await ytm.request("browse", { browseId: "FEmusic_home" });

    const post = fetch.requests.find((r) => r.method === "POST")!;
    expect(post.url).toContain("?alt=json&key=");
    expect(post.headers.get("cookie")).toBe(COOKIE);
    expect(post.headers.get("user-agent")).toBe("Browser UA");
    expect(post.headers.get("x-goog-authuser")).toBe("2");
    expect(post.headers.get("authorization")).toMatch(/^SAPISIDHASH \d+_[0-9a-f]{40}$/);
    expect(post.headers.get("x-goog-visitor-id")).toBe("VISITOR123");
    // the homepage lookup is unauthenticated
    const get = fetch.requests.find((r) => r.method === "GET")!;
    expect(get.headers.get("cookie")).toBe("SOCS=CAI");
    expect(get.headers.get("authorization")).toBeNull();
  });

  it("skips the visitor lookup when the browser headers carry one", async () => {
    const fetch = ytmFetch();
    const ytm = new YTMusic({ auth: { ...BROWSER_HEADERS, "X-Goog-Visitor-Id": "MINE" }, fetch });
    await ytm.request("browse", {});
    expect(fetch.requests.map((r) => r.method)).toEqual(["POST"]);
    expect(fetch.requests[0]!.headers.get("x-goog-visitor-id")).toBe("MINE");
  });

  it("fromAuthFile loads browser.json files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ytm-auth-"));
    const browserPath = join(dir, "browser.json");
    await writeFile(browserPath, JSON.stringify(BROWSER_HEADERS));
    const ytm = await YTMusic.fromAuthFile(browserPath, { visitorData: "V", fetch: ytmFetch() });
    expect(ytm.authType).toBe("browser");
    await ytm.request("browse", {});
    await expect(YTMusic.fromAuthFile(join(dir, "missing.json"))).rejects.toThrow(/ENOENT/);
  });
});

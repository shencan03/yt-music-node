import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough, Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { anchorFor, main } from "../../src/cli.ts";
import { YTMusicNavigationError, YTMusicServerError, parseAuth, type FetchLike } from "../../src/index.ts";
import { fakeFetch, json } from "../helpers.ts";

function run(argv: string[], stdin: string, fetch?: FetchLike) {
  const output = new PassThrough();
  let text = "";
  output.on("data", (chunk) => (text += chunk));
  return main(argv, { input: Readable.from([stdin]), output, fetch }).then((code) => ({ code, text }));
}

const AUTH = {
  cookie: "__Secure-3PAPISID=secret-sapisid; SID=secret-sid",
  "x-goog-authuser": "0",
  "x-goog-visitor-id": "V",
};

const ACCOUNT_MENU = {
  actions: [
    {
      openPopupAction: {
        popup: {
          multiPageMenuRenderer: {
            header: {
              activeAccountHeaderRenderer: {
                accountName: { runs: [{ text: "Test User" }] },
                channelHandle: { runs: [{ text: "@testuser" }] },
                accountPhoto: { thumbnails: [{ url: "https://example.com/p.jpg" }] },
              },
            },
          },
        },
      },
    },
  ],
};

async function authFile(content: unknown = AUTH): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ytm-cli-"));
  const file = join(dir, "browser.json");
  await writeFile(file, typeof content === "string" ? content : JSON.stringify(content));
  return file;
}

describe("cli", () => {
  it.each(["raw_chrome_headers.txt", "raw_firefox_headers.txt"])("browser setup from %s", async (fixture) => {
    const dir = await mkdtemp(join(tmpdir(), "ytm-cli-"));
    const file = join(dir, "browser.json");
    const raw = readFileSync(new URL(`../fixtures/${fixture}`, import.meta.url), "utf8");
    const { code, text } = await run(["browser", "--file", file], raw);
    expect(code).toBe(0);
    expect(text).toContain("Please paste the request headers");
    const saved = JSON.parse(await readFile(file, "utf8"));
    expect(saved.cookie).toBeTruthy();
    expect(parseAuth(saved).type).toBe("browser");
    if (process.platform !== "win32") expect((await stat(file)).mode & 0o777).toBe(0o600);
  });

  it("reports parse errors", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ytm-cli-"));
    const { code, text } = await run(["browser", "--file", join(dir, "b.json")], "accept: */*\n");
    expect(code).toBe(1);
    expect(text).toContain("missing in your headers");
  });

  it("prints usage", async () => {
    expect((await run([], "")).code).toBe(2);
    expect((await run(["--help"], "")).code).toBe(0);
    expect((await run(["--bogus"], "")).text).toContain("Usage");
    expect((await run(["--version"], "")).text).toMatch(/^yt-music-node \d+\.\d+\.\d+/);
  });

  it("verify prints the account and never the credentials", async () => {
    const fetch = fakeFetch(() => json(ACCOUNT_MENU));
    const { code, text } = await run(["verify", "--file", await authFile()], "", fetch);
    expect(code).toBe(0);
    expect(text).toContain("browser auth works: signed in as Test User (@testuser)");
    expect(text).not.toMatch(/secret/);
    expect(new URL(fetch.requests[0]!.url).pathname).toBe("/youtubei/v1/account/account_menu");
  });

  it("verify --quiet prints only ok", async () => {
    const fetch = fakeFetch(() => json(ACCOUNT_MENU));
    const { code, text } = await run(["verify", "-q", "--file", await authFile()], "", fetch);
    expect(code).toBe(0);
    expect(text).toBe("ok\n");
  });

  it("verify explains a signed-out session", async () => {
    const fetch = fakeFetch(() => json({ actions: [] }));
    const { code, text } = await run(["verify", "--file", await authFile()], "", fetch);
    expect(code).toBe(1);
    expect(text).toContain("did not return a signed-in account");
    expect(text).toContain("troubleshooting#signed-out-or-expired-session");
    expect(text).not.toMatch(/secret/);
  });

  it("verify explains rejected credentials", async () => {
    const fetch = fakeFetch(() => json({ error: { code: 401, message: "unauthenticated" } }, { status: 401 }));
    const { code, text } = await run(["verify", "--file", await authFile()], "", fetch);
    expect(code).toBe(1);
    expect(text).toContain("rejected the credentials (HTTP 401)");
  });

  it("verify reports missing and invalid files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ytm-cli-"));
    const missing = await run(["verify", "--file", join(dir, "nope.json")], "");
    expect(missing.code).toBe(1);
    expect(missing.text).toContain("does not exist. Create it with: npx yt-music-node browser");

    const invalid = await run(["verify", "--file", await authFile({ accept: "*/*" })], "");
    expect(invalid.code).toBe(1);
    expect(invalid.text).toContain("troubleshooting#could-not-determine-the-auth-type");
  });

  it("links only to troubleshooting sections that exist", () => {
    const page = readFileSync(new URL("../../docs/authentication/troubleshooting.md", import.meta.url), "utf8");
    // VitePress' slugify: lower-case, punctuation and spaces become single dashes
    const slugs = new Set(
      [...page.matchAll(/^## (.+)$/gm)].map((m) =>
        m[1]!
          .replace(/[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'<>,.?/]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase(),
      ),
    );
    const anchors = [
      new Error("The following entries are missing in your headers: cookie"),
      new Error("Your cookie is missing the required value __Secure-3PAPISID"),
      new Error("Could not determine the auth type"),
      new Error("Invalid auth JSON string provided"),
      new YTMusicNavigationError([], "x", null),
      new YTMusicServerError("x", { status: 500 }),
    ].map(anchorFor);
    for (const anchor of anchors) expect(slugs, anchor).toContain(anchor);
  });

  it("maps errors to troubleshooting anchors", () => {
    expect(anchorFor(new Error("The following entries are missing in your headers: cookie"))).toBe(
      "missing-entries-in-your-headers",
    );
    expect(anchorFor(new Error("Your cookie is missing the required value __Secure-3PAPISID"))).toBe(
      "cookie-is-missing-secure-3papisid",
    );
    expect(anchorFor(new Error("Invalid auth JSON string provided"))).toBe("invalid-auth-json");
    expect(anchorFor(new YTMusicNavigationError([], "x", null))).toBe("signed-out-or-expired-session");
    expect(anchorFor(new YTMusicServerError("x", { status: 403 }))).toBe("signed-out-or-expired-session");
    expect(anchorFor(new YTMusicServerError("x", { status: 500 }))).toBe("other-errors");
  });

  describe.skipIf(process.platform === "win32")("browser from a terminal", () => {
    function tty(chunks: string[]) {
      const input = Object.assign(new PassThrough(), { isTTY: true, rawModes: [] as boolean[] }) as PassThrough & {
        isTTY: true;
        rawModes: boolean[];
        setRawMode(mode: boolean): void;
      };
      input.setRawMode = (mode: boolean) => void input.rawModes.push(mode);
      setImmediate(() => chunks.forEach((chunk) => input.write(chunk)));
      return input;
    }

    async function runTty(argv: string[], chunks: string[]) {
      const input = tty(chunks);
      const output = new PassThrough();
      let text = "";
      output.on("data", (chunk) => (text += chunk));
      const code = await main(argv, { input, output });
      return { code, text, rawModes: input.rawModes };
    }

    it("reads lines longer than the 1024-byte terminal limit in raw mode", async () => {
      const file = join(await mkdtemp(join(tmpdir(), "ytm-cli-")), "browser.json");
      const cookie = `__Secure-3PAPISID=abc; PAD=${"x".repeat(5000)}`;
      const pasted = `\x1b[200~x-goog-authuser: 0\rcookie: ${cookie}\r\x1b[201~`;
      const { code, text, rawModes } = await runTty(["browser", "--file", file], [pasted.slice(0, 700), pasted.slice(700), "\u0004"]);
      expect(code).toBe(0);
      expect(rawModes).toEqual([true, false]);
      expect(text).toContain("2 lines received");
      expect(text).not.toContain("PAD=");
      const saved = JSON.parse(await readFile(file, "utf8"));
      expect(saved.cookie).toBe(cookie);
      expect(saved["x-goog-authuser"]).toBe("0");
    });

    it("cancels on Ctrl-C without writing a file", async () => {
      const file = join(await mkdtemp(join(tmpdir(), "ytm-cli-")), "browser.json");
      const { code, text, rawModes } = await runTty(["browser", "--file", file], ["cookie: a", "\u0003"]);
      expect(code).toBe(130);
      expect(text).toContain("Cancelled.");
      expect(rawModes).toEqual([true, false]);
      await expect(stat(file)).rejects.toThrow();
    });
  });
});

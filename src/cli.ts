/**
 * The `yt-music-node` command line tool.
 *
 * - `browser`: creates an auth file from browser request headers (port of ytmusicapi's `setup.py`).
 *   The file is compatible with ytmusicapi's `browser.json`.
 * - `verify`: checks that an auth file signs in, without printing any credentials.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { parseBrowserHeaders } from "./auth/browser.ts";
import { YTMusic } from "./client.ts";
import { YTMusicNavigationError, YTMusicServerError } from "./errors.ts";
import type { FetchLike } from "./http.ts";

export interface CliIO {
  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream;
  /** Fetch used by `verify`. Default: `globalThis.fetch`. */
  fetch?: FetchLike;
}

/** Base URL of the documentation site. */
export const DOCS_URL = "https://shencan03.github.io/yt-music-node";
const TROUBLESHOOTING = `${DOCS_URL}/authentication/troubleshooting`;

const USAGE = `Usage: yt-music-node <command> [options]

Commands:
  browser   save request headers copied from a logged-in browser session
  verify    check that an auth file signs in (prints no credentials)

Options:
  --file <path>   auth file (default: browser.json)
  -q, --quiet     verify: print only "ok" or the error, not the account name
  -h, --help      show this help
  -v, --version   show the version

Setting up authentication: ${DOCS_URL}/authentication/
`;

export async function main(argv: string[], io: CliIO = { input: process.stdin, output: process.stdout }): Promise<number> {
  const print = (text: string) => io.output.write(`${text}\n`);
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        file: { type: "string" },
        quiet: { type: "boolean", short: "q" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (error) {
    print(`${(error as Error).message}\n\n${USAGE}`);
    return 2;
  }
  const { values, positionals } = parsed;
  if (values.version) {
    print(`yt-music-node ${await version()}`);
    return 0;
  }
  const command = positionals[0];
  if (values.help || (command !== "browser" && command !== "verify")) {
    print(USAGE);
    return values.help ? 0 : 2;
  }
  const file = resolve(values.file ?? "browser.json");
  return command === "browser" ? browser(file, io, print) : verify(file, io, print, values.quiet ?? false);
}

async function browser(file: string, io: CliIO, print: (text: string) => void): Promise<number> {
  print(`Creating ${pathToFileURL(file).href} with your authentication credentials...`);
  const rl = createInterface({ input: io.input, output: io.output, terminal: false });
  try {
    const eof = process.platform === "win32" ? "Ctrl-Z, Enter" : "Ctrl-D";
    print(`Please paste the request headers from Firefox or Chrome/Edge and press ${eof} to continue:`);
    const lines: string[] = [];
    for await (const line of rl) lines.push(line);
    const content = parseBrowserHeaders(lines.join("\n"));
    // owner-only: the file holds account credentials
    await writeFile(file, `${JSON.stringify(content, null, 4)}\n`, { encoding: "utf8", mode: 0o600 });
    print(`Saved ${file}.`);
    print(`Check it with: npx yt-music-node verify --file ${JSON.stringify(file)}`);
    print(`Use it with:   await YTMusic.fromAuthFile(${JSON.stringify(file)})`);
    return 0;
  } catch (error) {
    print(`Error: ${(error as Error).message}`);
    print(`See ${TROUBLESHOOTING}#${anchorFor(error)}`);
    return 1;
  } finally {
    rl.close();
  }
}

async function verify(file: string, io: CliIO, print: (text: string) => void, quiet: boolean): Promise<number> {
  let content: string;
  try {
    content = await readFile(file, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    print(
      code === "ENOENT"
        ? `Error: ${file} does not exist. Create it with: npx yt-music-node browser --file ${JSON.stringify(file)}`
        : `Error: cannot read ${file}: ${(error as Error).message}`,
    );
    return 1;
  }
  try {
    const ytm = new YTMusic({ auth: content, ...(io.fetch ? { fetch: io.fetch } : {}) });
    const account = await ytm.getAccountInfo();
    if (!account.accountName) throw new YTMusicNavigationError(["accountName"], "accountName", null);
    if (quiet) {
      print("ok");
    } else {
      const handle = account.channelHandle ? ` (${account.channelHandle})` : "";
      print(`✓ ${ytm.authType} auth works: signed in as ${account.accountName}${handle}`);
    }
    return 0;
  } catch (error) {
    print(`Error: ${describeVerifyError(error)}`);
    print(`See ${TROUBLESHOOTING}#${anchorFor(error)}`);
    return 1;
  }
}

function describeVerifyError(error: unknown): string {
  if (error instanceof YTMusicNavigationError) {
    // a signed-out session gets a menu without an account header
    return "YouTube Music did not return a signed-in account. The session has probably expired or was signed out.";
  }
  if (error instanceof YTMusicServerError && (error.status === 401 || error.status === 403)) {
    return `YouTube Music rejected the credentials (HTTP ${error.status}). The session has probably expired or was signed out.`;
  }
  return (error as Error).message;
}

/** The troubleshooting section for an error. Anchors match the headings in docs/authentication/troubleshooting.md. */
export function anchorFor(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/missing in your headers/.test(message)) return "missing-entries-in-your-headers";
  if (/__Secure-3PAPISID/.test(message)) return "cookie-is-missing-secure-3papisid";
  if (/Could not determine the auth type/.test(message)) return "could-not-determine-the-auth-type";
  if (/Invalid auth/.test(message)) return "invalid-auth-json";
  if (error instanceof YTMusicNavigationError) return "signed-out-or-expired-session";
  if (error instanceof YTMusicServerError && (error.status === 401 || error.status === 403)) {
    return "signed-out-or-expired-session";
  }
  return "other-errors";
}

async function version(): Promise<string> {
  try {
    const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
    return String(pkg.version);
  } catch {
    return "unknown";
  }
}

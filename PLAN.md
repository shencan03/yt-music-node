# yt-music-node — porting plan

Port of [sigma67/ytmusicapi](https://github.com/sigma67/ytmusicapi) (analyzed at upstream commit `488dbf3`, 2026-11-04, ~7.3k LOC Python) to Node.js.

## 1. How upstream works

| Layer | Python files | What it does |
|---|---|---|
| Client | `ytmusic.py` | `YTMusicBase` holds session, auth headers, InnerTube `context` (`WEB_REMIX` client, version `1.YYYYMMDD.01.00`), language/location. `YTMusic` combines 9 mixins. |
| Transport | `ytmusic.py::_send_request`, `_send_get_request` | `POST https://music.youtube.com/youtubei/v1/<endpoint>?alt=json[&key=…]` with JSON body `{...params, context}`. GET is used for the homepage (visitor id, base.js), history ping and `/playlist`. |
| Auth | `auth/` | **Browser**: pasted request headers; `SAPISIDHASH <ts>_<sha1(ts + " " + SAPISID + " " + origin)>` is recomputed on every request. |
| Navigation | `navigation.py` | `nav(obj, path, noneIfAbsent)` plus about 90 path constants into the renderer tree. |
| Pagination | `continuations.py` | Three continuation styles: legacy `continuations[0].nextContinuationData` (ctoken in the query string), 2025-style `continuationItemRenderer` (token in the body), and "reloadable" (playlist suggestions). A validated variant retries until each page is full. |
| Parsers | `parsers/*.py` (~1.9k LOC) | Pure functions that turn renderers into plain dicts. **This is where most of the port's value and upkeep sits.** |
| Endpoints | `mixins/*.py` (~3.7k LOC) | About 70 public methods: browsing, search, watch, explore, charts, library, playlists, podcasts, uploads. |
| i18n | `locales/*/base.mo`, `parsers/i18n.py` | 17 languages. Used to match **localized section titles** (e.g. artist page carousels like "albums" or "singles & eps") and search result types. |
| Setup CLI | `setup.py` | `ytmusicapi browser`. |
| Tests | `tests/` | Mostly live, authenticated integration tests, plus **offline fixtures** in `tests/data/*.json` with `expected_output/`. We can reuse these directly. |

Runtime dependency: `requests` only. Nothing in it needs a native module, so a zero-dependency Node port is realistic.

## 2. Target architecture

- **TypeScript**, compiled to ESM and CJS (`tsup`), Node **≥ 22** (Node 20 reached end-of-life in April 2026). Zero runtime deps: global `fetch`, `Headers`, `AbortSignal.timeout`, `node:crypto`, `node:fs`.
- Uses only Web APIs in the core (crypto via `globalThis.crypto.subtle` or a small sha1 shim) so it also runs on Bun, Deno and edge runtimes. Browsers are out of scope because of CORS and cookies.
- **Everything is async.** Paginated endpoints come in two forms: `getPlaylist(id, { limit })` and `iterPlaylist(id)` (an `AsyncGenerator`).
- **No mixins.** Each `src/endpoints/*` module exports a method object whose functions take `this: ClientContext`. `client.ts` attaches them to `YTMusic.prototype` (non-enumerable), and interface merging (`interface YTMusic extends BrowsingMethods, …`) adds their signatures to the class. Endpoints only depend on the `ClientContext` interface, so they can be tested with a fake, and TS mixin typing problems are avoided. (The first plan was plain `(ctx, ...args)` functions; the method objects keep the same testability without a delegation layer.)
- Public API uses camelCase methods with an options object for optional params:
  `search(query, { filter, scope, limit, ignoreSpelling, signal })`. YouTube's id field names stay as they are (`videoId`, `browseId`, `playlistId`) so results match upstream output **key-for-key**. That is what lets us golden-test against Python.
- Typed results: hand-written interfaces for every public return type (`Song`, `Album`, `Artist`, `Playlist`, `SearchResult` as a discriminated union on `resultType`, …). Raw InnerTube JSON is `JsonObject`/`unknown`.

```
src/
  index.ts                 // public exports
  client.ts                // YTMusic class, options, lazy init
  context.ts               // InnerTube context builder (immutable, per request)
  http.ts                  // fetch wrapper: timeout, AbortSignal, retries, hooks, errors
  errors.ts                // YTMusicError, UserError, ServerError, GatedError, AuthError
  nav.ts                   // nav(), findObjectByKey(), path constants
  continuations.ts         // the three styles, as async generators
  i18n/                    // locales/*.json (generated from upstream .po) + t()
  auth/
    index.ts               // parseAuth, auth type detection
    browser.ts             // header parsing, SAPISIDHASH
  cli.ts                   // setup CLI (bin/yt-music-node.js → dist/cli.js)
  parsers/                 // 1:1 with upstream parsers/*.py, plus py.ts (Python semantics)
  endpoints/               // 1:1 with upstream mixins/*.py
  types/                   // public result types
bin/yt-music-node.js       // npx yt-music-node browser
scripts/po-to-ts.ts        // converts upstream locales
test/
  fixtures/                // copied from upstream tests/data
  unit/*.test.ts           // offline: unit, parser ports, golden fixture tests, auth, CLI
  live/*.test.ts           // gated by env (YTM_LIVE=1)
```

## 3. Python → JS gotchas (where ports usually break)

1. **`nav()` must keep failing loudly.** Python raises `KeyError`/`IndexError` on a missing path. Optional chaining in JS would silently give `undefined` and hide YouTube layout changes. Implement `nav(root, path)` that throws `NavigationError(path, atKey)`, plus `nav(root, path, true)` that returns `null` (Python `None`, so JSON output matches upstream).
2. **Truthiness.** `[]` and `{}` are falsy in Python but truthy in JS. Upstream has 19 `if not x:` checks and many `if results:`. Audit each one, and use a `isEmpty()` helper.
3. **Negative indices.** `x[-1]` becomes `x.at(-1)`, including inside `nav` paths. There are 3 occurrences, and `nav` must support `-1`.
4. **Dict equality.** `runs.index(DOT_SEPARATOR_RUN)` compares dicts by value. JS needs a structural compare.
5. **`x in obj`** maps to `Object.hasOwn(obj, x)`. Never use JS `in` on arrays for value lookup.
6. **Regex.** `re.findall` with groups becomes `matchAll`. Python `str.split(sep, n)` keeps the remainder, but JS `split(sep, n)` truncates it.
7. **Mutation.** `body.update(self.context)` mutates the caller's dict, and continuation lambdas reuse the same `body`. Build a fresh body for every request.
8. **gettext** becomes JSON maps generated at build time from upstream `.po` files. Each client gets its own translator; no globals (see bug 4).
9. **Integer parsing.** `int()` throws on bad input, while `parseInt` accepts junk prefixes. Use strict helpers.

## 4. Bugs found upstream (fix them in the port)

| # | Where | Problem | Fix in Node |
|---|---|---|---|
| 1 | `helpers.py::to_int`; used for playlist `views`, album `trackCount`, search `itemCount` | Strips **all** non-digits, so `"2M views"` becomes `2` and `"1.3M views"` becomes `13` (both strings are in upstream fixtures). `locale.atoi` runs after the strip, so it does nothing. An empty string raises `ValueError`. In `parsers/playlists.py:86-91`, `re.findall` never returns `None`, so the guard never fires and a track-count text with no digits crashes. | `parseCount(text)`: handles K/M/B suffixes and decimal separators, returns `null` when it can't parse. Also keep the raw text (`viewsText`) so localized suffixes aren't lost. |
| 2 | `auth/auth_parse.py::determine_auth_type` | The detection branches all fall through to the same default, so the check does nothing, and unrecognized headers get a misleading error. `is_browser()` exists but is never used. | Explicit detection: a `cookie` → browser. Anything else throws `YTMusicUserError` saying what's missing. |
| 3 | `ytmusic.py::_send_request` | Calls `json.loads` **before** checking status, so an HTML 429/5xx page raises `JSONDecodeError`. Then `message + None` raises `TypeError` when the error has no `message`. | Check status first, parse JSON defensively. `YTMusicServerError { status, code, reason, body }`. |
| 4 | `ytmusic.py` init, `parsers/_utils.py::i18n` | `locale.setlocale(LC_ALL, …)` changes the **process-wide** locale. The `@i18n` decorator writes `_` into **module globals**, so two instances with different languages (or threads) race each other. | Translator stored on the client context and passed explicitly. No global state. |
| 5 | `ytmusic.py::as_mobile` | Temporarily mutates the shared `context` ("Not thread-safe!"). With Node's async interleaving, concurrent calls *would* send the wrong client. | Per-request override: `request("browse", body, { client: "ANDROID_MUSIC" })`. |
| 8 | `mixins/uploads.py::upload_song` | Uses bare `requests.post`, which bypasses the session, **has no timeout** and ignores cookies. Doesn't check the start response, so a missing `X-Goog-Upload-URL` raises `KeyError`. The extension check is case-sensitive (`.MP3` is rejected). | Goes through the HTTP layer (timeout, hooks, auth headers). Paths are read lazily with `fs.openAsBlob`; `{ data, filename }` takes a Blob or Uint8Array. Both responses are checked. |
| 9 | `helpers.py::initialize_headers` | Sends `content-encoding: gzip` on an **uncompressed** JSON body. | **Done:** header dropped. A live test (2026-11-08) showed YouTube returns 200 for plain, mislabeled and real-gzip bodies alike, and request bodies are too small for gzip to help. |
| 10 | `constants.py::USER_AGENT` | Firefox 88 (2021) UA string. | Current UA, configurable. |
| 11 | `ytmusic.py::base_headers` / `helpers.get_visitor_id` | If the visitor id fetch fails, it silently sends `X-Goog-Visitor-Id: ""`. Python caches it with `cached_property`; a naive async port would fetch it N times on concurrent first calls. | A memoized init promise. Warn or throw on failure. Accept `visitorData` as an option so callers can skip the homepage fetch. |
| 12 | `mixins/browsing.py::get_basejs_url` / `get_signatureTimestamp` | Fetches the homepage and base.js on every call. | Cache with a TTL (base.js changes rarely). |
| 13 | `mixins/browsing.py::get_album_browse_id` | `.encode("utf8").decode("unicode_escape")` garbles non-ASCII text. It's only there to undo `\x22` escapes. | Single-pass decoding of `\xNN`, `\uNNNN` and `\"` escapes (see 27). |
| 14 | `mixins/library.py::add_history_item` | `randint(0, 256) & 63` is inclusive of 256, giving a slight bias. | `crypto.getRandomValues`. Minor. |
| 15 | `helpers.py::sapisid_from_cookie` | Only reads `__Secure-3PAPISID`. | Fall back to `SAPISID`/`__Secure-1PAPISID`. Optionally send the `SAPISID1PHASH`/`SAPISID3PHASH` set the current web client uses (check live). |

Found while porting the core (fixed in Phase 1):

| # | Where | Problem | Fix in Node |
|---|---|---|---|
| 16 | `continuations.py::get_continuation_token` | Indexes `results[-1]` unguarded, so an empty list raises `IndexError`. | Returns `undefined`. |
| 17 | `continuations.py::get_validated_continuations` | No guard: if the server keeps answering with empty pages that still carry a continuation token, it keeps requesting indefinitely. | Stops after 3 consecutive empty pages. |
| 18 | `navigation.py::nav` | A `null` value partway along the path raises an uncaught `TypeError`, even with `none_if_absent=True`. | Treated as absent. |

Note for Phase 3: `get_reloadable_continuations` re-sends the same reload token for every batch. That looks intentional (each reload returns a fresh batch of suggestions), so it's kept, but check live whether batches contain duplicates.

Report the ones that reproduce (1, 2, 3, 8, 16, 17) upstream too. That's good will, and it keeps the two codebases from drifting apart.

## 5. Enhancements that make sense for Node

- **`AbortSignal`** on every method, plus a global `timeoutMs` (default 30s; uploads get their own 10-minute default).
- **Retry/backoff** (opt-in) on 429/5xx/network errors, honoring `Retry-After`. Optional concurrency limiter.
- **Pluggable `fetch`** (`new YTMusic({ fetch })`) for proxies (undici `ProxyAgent`), testing, and recording fixtures. Drop upstream's `proxies` dict in favor of this.
- **Hooks**: `onRequest` / `onResponse` for logging and for capturing fresh fixtures when YouTube changes a layout.
- **Async iterators** for every paginated endpoint (library, playlists, search with continuation, uploads, podcasts).
- **Typed discriminated unions** for search results and `LikeStatus`/`PrivacyStatus` as string literal unions.
- **CLI**: `npx yt-music-node browser` (reads pasted headers from stdin, same parser as upstream incl. Chrome's multi-line format).
- **Raw escape hatch**: `ytm.request(endpoint, body)` for endpoints not wrapped yet.
- Out of scope, as upstream: deciphering `signatureCipher`/`n` for stream URLs. Document that `getSong().streamingData` URLs may need a decipher library.

## 6. Testing strategy

1. **Golden parity tests (offline, CI).** Copy `tests/data/*.json` and `expected_output/*.json` from upstream. Feed the raw responses to the TS parsers and deep-compare against the expected output. Add a script that runs the **Python** parser on any new fixture to generate expected output, so parity is checked by machine rather than by eye.
2. **Unit tests**: `nav`, continuations (fake request fn), auth detection, SAPISIDHASH (fixed clock), header parsing (upstream `raw_chrome_headers.txt` / `raw_firefox_headers.txt`), `parseCount`, `parseDuration`.
3. **Live tests**: unauthenticated ones run nightly in CI (they catch YouTube layout changes early). Authenticated ones run locally with `YTM_AUTH` (mirror upstream `tests/test.example.cfg`).
4. Vitest, `@vitest/coverage-v8`, ESLint, `tsc --noEmit`, GitHub Actions on Node 22/24/26.

## 7. Phased roadmap

### Status

- [x] **Phase 0**: scaffold (2026-11-08)
- [x] **Phase 1**: core (2026-11-08). Bugs 3, 4, 5 (mechanism), 9, 10, 11, 16, 17, 18 fixed. 61 unit tests and 4 live tests pass.
- [x] **Phase 2**: public endpoints (2026-11-09). All parsers and endpoint modules are ported. Bugs 1, 12, 13 and 19–24 are fixed.
- [x] **Phase 3**: auth + account features (2026-11-09). Browser auth, `fromAuthFile`, CLI, library, playlists, uploads and history are done. Bugs 2, 8, 14, 15, 25 and 27 are fixed.
- [x] **Phase 4**: hardening (2026-11-09). README with a migration table, and builds for ESM, CJS and the CLI. Not done yet: TypeDoc, the upstream bug reports, `npm publish`.
- [x] **Phase 5**: documentation (2026-11-09). VitePress site in `docs/` (guide, API pages for all 62 methods with recorded example output, recipes, migration, contributing), TypeDoc type reference, coverage matrix, `npm run docs:check` (TSDoc on every export, coverage matrix current, every `ts` example typechecks, no dead links), GitHub Pages workflow. README cut to an overview that links into the docs.
- [x] **Phase 6**: credentials guide (2026-11-09). `docs/authentication/`: overview, step-by-step browser setup (Firefox verified; Chrome/Edge "Raw" path not yet dry-run), multiple accounts, servers and CI, security, troubleshooting. `npx yt-music-node verify [--file] [--quiet]` added; CLI errors link to the matching troubleshooting section. Text only, no screenshots.

Results on 2026-11-09:

- 206 offline tests pass: unit tests, ported upstream parser tests, golden fixture tests, auth and CLI. They cover typecheck and lint.
- 37 live tests pass against music.youtube.com, unauthenticated.
- 41 authenticated live tests pass against a real account with browser auth (`npm run test:auth`). They cover the library, playlist CRUD, ratings, library status, subscriptions, history, search suggestions and uploads. Every change is undone, and the account was checked afterwards. Not tested live: brand accounts and `setTasteProfile` (which can't be undone).

Bugs found while porting endpoints:

| # | Where | Problem | Fix in Node |
|---|---|---|---|
| 19 | `mixins/search.py` | The "no results" check is always false. `res["musicShelfRenderer"]` raises `KeyError` for some sections. | Both checked properly. |
| 20 | `parsers/search.py::parse_search_result` | Mutates the response's runs in place. | Works on a copy. |
| 21 | `parsers/songs.py::parse_artists_runs` | An even run count raises `IndexError`. | Tolerated. |
| 22 | `mixins/browsing.py::get_album` | An unknown carousel size raises `KeyError`. | Skipped. |
| 23 | `mixins/library.py::get_history` | Raises with a dict as the error message. | Uses the run's text. |
| 24 | `parsers/explore.py::parse_trending_item`, `parsers/browsing.py::parse_song_flat` | A greyed-out (unplayable) track in Trending has no play endpoint, so `get_explore()` raises `KeyError`. Seen live on 2026-11-09. | Optional lookups, with `videoId` taken from `playlistItemData`. |
| 25 | `parsers/explore.py::parse_chart_episode` | Reads the duration from `playbackProgress`, which current responses lack, so it is always `None`. | Falls back to the subtitle (`"<date> • <duration>"`). This matches upstream's expected output. |
| 27 | `mixins/browsing.py::get_album_browse_id` | (port regression, caught live) Decoding only `\xNN` left a trailing `\` from `\"`-escaped JSON. | Decodes all JS string escapes in one pass. |

Found by the authenticated live tests (2026-11-09):

| # | Where | Problem | Fix in Node |
|---|---|---|---|
| 28 | `mixins/playlists.py::get_playlist`, `parsers/playlists.py::parse_audio_playlist` | `limit` is passed to the continuation loop without subtracting the first page, so another page is always fetched. `get_liked_songs(limit=50)` returned 200 tracks. | Remaining limit passed. |
| 29 | `parsers/albums.py::parse_album_header_2024` | `likeStatus` comes from the save toggle's `defaultServiceEndpoint`, which is "like" whether or not the album is saved. A liked album always reports `INDIFFERENT`. | Read from `isToggled`. |
| 30 | `mixins/playlists.py::delete_playlist` | YTM now confirms a delete with a `handlePlaylistDeletionCommand` instead of `status`, so the raw response is returned. | Recognized as `STATUS_SUCCEEDED`. |
| 31 | `mixins/podcasts.py::get_episodes_playlist` | "Episodes for later" (`SE`) now uses a `musicPlaylistShelfRenderer`, which has no `contents` when empty, and "New episodes" (`RDPN`) has no contents when the account follows no podcasts. Both raise `KeyError`. | Both shelf types accepted. An empty `RDPN` throws a `YTMusicServerError` that explains why. |
| 32 | `mixins/playlists.py::get_playlist` | `id` comes from the play button, which has no endpoint on Liked Music (`LM`), and `SE` has no buttons, so `id` is `None`. | Falls back to the requested id. |
| 33 | port: `addHistoryItem` | It is a write, but it went through the retrying GET path, so a retry could record the play twice. | Not retried. |

Live-only behavior, documented and not changed:

- `getWatchPlaylist` tracks can't show `DISLIKE`. The tests check dislikes through the player bar's `likeStatusEntity`.
- Adding a source playlist that overlaps the target is refused as a whole (`STATUS_FAILED`).
- Uploading a file that is already uploaded returns HTTP 409, which surfaces as a `YTMusicServerError` with `status` 409.

**Phase 0 – Scaffold (½ day).** Switch `package.json` to TS + `tsup` (ESM + CJS + `.d.ts`, `exports` map), Vitest, ESLint, CI, `engines.node >= 22`. Delete the empty `index.js`. Copy fixtures and the upstream LICENSE notice (MIT, keep attribution).

**Phase 1 – Core (1–2 days).** `errors`, `nav` + constants, `context`, `http` (bugs 3, 9, 10, 11), i18n JSON generation (bug 4), continuations as generators, the `YTMusic` constructor with language/location validation and `user` (brand account).
*Milestone:* raw `ytm.request("browse", { browseId: "FEmusic_home" })` works unauthenticated.

**Phase 2 – Public endpoints (4–6 days).** Port parsers and endpoints in dependency order: `parsers/_utils` → `songs` → `browsing` → `search` + `mixins/search` → `watch` → `albums` / `artists` / `browsing` mixin (incl. lyrics with timestamps via the mobile override, bug 5) → `explore`, `charts`, `podcasts`. Fix bugs 1, 12, 13 along the way. Golden tests for each.
*Milestone:* `search`, `getArtist`, `getAlbum`, `getSong`, `getLyrics`, `getWatchPlaylist`, `getPlaylist` (public) match upstream output.

**Phase 3 – Auth + account features (3–4 days).** Browser auth (bugs 2, 15), CLI. Then `library`, `playlists` (create/edit/add/remove, `validate_write_response` / gated errors), `uploads` (bug 8), history (bug 14), taste profile.

**Phase 4 – Hardening & release (1–2 days).** Retries/limiter, hooks, TypeDoc API docs, README with a migration table (Python name → Node name), the upstream bug reports, `npm publish` with provenance.

**Phase 5 – Documentation of everything that exists and is tested (2–3 days).** All docs live in `docs/` as Markdown in the repo, so they are versioned with the code and readable on GitHub and npm. The README becomes a short overview with links into `docs/`.

*Layout:*

```
docs/
  README.md               // index: what the library does, which page to read for what
  getting-started.md      // install, runtimes (Node/Bun/Deno), ESM/CJS, first unauthenticated calls
  configuration.md        // every YTMusicOptions field, language/location, proxies via fetch,
                          // timeouts, retries (reads only), AbortSignal, hooks, logger, raw request()
  api/
    search.md             // search (filters, scopes, limits), suggestions
    browsing.md           // home, artists, albums, songs, credits, related, lyrics, users, taste profile
    watch.md              // watch playlists and radio
    explore.md            // moods, charts, explore
    podcasts.md           // channels, podcasts, episodes, episode playlists
    playlists.md          // getPlaylist, liked songs, create/edit/add/remove/delete, collaboration
    library.md            // library lists, ratings, library status, subscriptions, history, account
    uploads.md            // listing, upload, delete
  errors.md               // error classes, when each happens, what to do
  limitations.md          // live-only behavior (no DISLIKE in watch tracks, 409 duplicate upload,
                          // STATUS_FAILED for overlapping source playlists, stream deciphering, …)
  migration.md            // ytmusicapi → yt-music-node table + behavior differences (moved from README)
  testing.md              // unit, golden, live and authenticated suites; cleanup of leftovers
  contributing.md         // upstream sync (absorbs UPSTREAM.md), locales, recording fixtures with hooks
  reference/              // generated by TypeDoc (`npm run docs`), not committed; published to GitHub Pages
```

*Every method entry has the same shape:*

- signature and options
- whether it needs auth, and which auth types
- what it returns, with a trimmed real example
- the errors it throws and its limitations
- how it is verified: offline / golden / live / live with auth

*Steps:*

1. Write TSDoc for every public method, option and result type. Run TypeDoc with `--validation.notDocumented` and make CI fail on undocumented exports.
2. Write `scripts/doc-examples.ts`. It runs the unauthenticated calls and writes trimmed outputs to `docs/examples/*.json`, so examples are real and can be refreshed when YTM changes. Examples for authenticated methods are hand-trimmed from test runs, with no personal data (placeholder titles and ids). Check this by grepping the docs for the account's name, handle and ids before commit.
3. Generate a coverage matrix (`docs/api/README.md`): method → doc page → tests that cover it. A script builds it from the prototype method list and test files, so a method without docs or tests is visible.
4. Write the guides above. Move the migration table and the behavior differences out of README and PLAN.md into `docs/migration.md`.

*Acceptance criteria:*

- `npm run docs:check` passes. It:
  - typechecks every `ts` code block in `docs/` (extracted to a temporary file and run through `tsc`)
  - checks relative links
  - fails on undocumented exports via TypeDoc
- Every one of the 61 public methods has a doc entry and appears in the coverage matrix.
- The README is under ~120 lines.

**Phase 6 – Credentials guide for other users (1–2 days).** Lives in `docs/authentication/`. It is written for someone who has never opened developer tools. Text only, no screenshots (decided 2026-11-09): steps name the exact menu labels instead, so browser UI changes don't leave stale images behind.

*Layout:*

```
docs/authentication/
  README.md               // overview: what browser auth is, what it can do, how long it lasts
  browser.md              // step by step, Firefox first (Network tab → filter "browse" → click Library →
                          // POST request → right-click → Copy Value → Copy Request Headers), then
                          // Chrome/Edge (Headers → Request Headers → Raw → copy), Safari (Develop menu).
                          // Saving the headers: the interactive CLI paste (all platforms), or a clipboard pipe:
                          // macOS `pbpaste |`, Linux `xclip -o -selection clipboard |` / `wl-paste |`,
                          // Windows PowerShell `Get-Clipboard |`. Then how to verify it worked.
  multiple-accounts.md    // x-goog-authuser (several Google accounts in one browser), brand accounts (`user`)
  deployment.md           // servers/CI: auth JSON from an env var or secret store
                          // (`new YTMusic({ auth: process.env.YTM_AUTH })`), file permissions,
  security.md             // treat the file like a password: never commit it or paste it into issues,
                          // 0600 permissions, .gitignore, revoke by signing out of that browser session
  troubleshooting.md      // the exact error messages users will see, mapped to fixes
```

`troubleshooting.md` covers these errors:

- "missing in your headers: cookie, x-goog-authuser"
- "missing the required value __Secure-3PAPISID"
- "Could not determine the auth type"
- 401/403
- an expired session
- `YTMusicGatedError`
- HTTP 409 on upload

*Steps:*

1. **Add `npx yt-music-node verify [--file browser.json]`.** It loads the file, calls `getAccountInfo` and prints only the auth type and "signed in as <name>", so users can confirm their setup without writing code. This is a small CLI addition with unit tests.
2. **Make CLI errors point to the guide.** Each error links to the matching section of `troubleshooting.md`.
3. **Verify each path end to end before documenting it as working.**
   - Firefox: already verified on 2026-11-09.
   - Chrome Raw: a dry run by the maintainer.
   - The Linux and Windows clipboard commands, and Safari: marked "community-verified" until someone confirms them.
4. **Link everything.** The README, `docs/getting-started.md` and the CLI's `--help` link to `docs/authentication/README.md`.

*Acceptance criteria:*

- A reader can get from zero to `verify` printing their account name by following only the guide.
- Every error message the library can raise during auth appears in `troubleshooting.md`.
- No guide contains real credentials, account names or ids.

**Ongoing.** Record the upstream commit each parser was synced from (in a header comment and `UPSTREAM.md`). Watch upstream releases: most of its commits are parser fixes for YouTube layout changes, and those port easily because the module layout is 1:1.

## 8. Decisions to confirm

Decided (2026-11-08): package name `yt-music-node`, MIT with upstream attribution, camelCase methods.

Still open before publishing:

- Check that `yt-music-node` is available on npm.
- Test brand accounts live (needs a brand account id).
- Report bugs 1, 2, 3, 8, 16, 17, 24, 25 and 28–32 upstream.

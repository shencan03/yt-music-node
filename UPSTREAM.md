# Upstream sync

This package ports [sigma67/ytmusicapi](https://github.com/sigma67/ytmusicapi). Each module records the upstream commit it was last synced from. To port upstream parser fixes, diff the upstream module from that commit to `main`.

| Node module | Upstream source | Synced at |
|---|---|---|
| `src/constants.ts` | `ytmusicapi/constants.py` | `488dbf3` |
| `src/nav.ts` | `ytmusicapi/navigation.py` | `488dbf3` |
| `src/continuations.ts` | `ytmusicapi/continuations.py` | `488dbf3` |
| `src/context.ts`, `src/client.ts`, `src/http.ts` | `ytmusicapi/ytmusic.py`, `ytmusicapi/helpers.py` | `488dbf3` |
| `src/errors.ts` | `ytmusicapi/exceptions.py` | `488dbf3` |
| `src/auth/index.ts` | `ytmusicapi/auth/auth_parse.py` | `488dbf3` |
| `src/auth/browser.ts` | `ytmusicapi/auth/browser.py`, `ytmusicapi/helpers.py` (SAPISID) | `488dbf3` |
| `src/cli.ts` | `ytmusicapi/setup.py` | `488dbf3` |
| `src/parsers/py.ts` | – (Python semantics helpers) | – |
| `src/parsers/utils.ts` | `ytmusicapi/parsers/_utils.py`, `ytmusicapi/helpers.py` | `488dbf3` |
| `src/parsers/songs.ts` | `ytmusicapi/parsers/songs.py` | `488dbf3` |
| `src/parsers/albums.ts` | `ytmusicapi/parsers/albums.py` | `488dbf3` |
| `src/parsers/browsing.ts` | `ytmusicapi/parsers/browsing.py` | `488dbf3` |
| `src/parsers/explore.ts` | `ytmusicapi/parsers/explore.py` | `488dbf3` |
| `src/parsers/i18n.ts` | `ytmusicapi/parsers/i18n.py` | `488dbf3` |
| `src/parsers/library.ts` | `ytmusicapi/parsers/library.py` | `488dbf3` |
| `src/parsers/playlists.ts` | `ytmusicapi/parsers/playlists.py` | `488dbf3` |
| `src/parsers/podcasts.ts` | `ytmusicapi/parsers/podcasts.py` | `488dbf3` |
| `src/parsers/search.ts` | `ytmusicapi/parsers/search.py` | `488dbf3` |
| `src/parsers/uploads.ts` | `ytmusicapi/parsers/uploads.py` | `488dbf3` |
| `src/parsers/watch.ts` | `ytmusicapi/parsers/watch.py` | `488dbf3` |
| `src/endpoints/browsing.ts` | `ytmusicapi/mixins/browsing.py` | `488dbf3` |
| `src/endpoints/explore.ts` | `ytmusicapi/mixins/explore.py`, `ytmusicapi/mixins/charts.py` | `488dbf3` |
| `src/endpoints/library.ts` | `ytmusicapi/mixins/library.py`, `ytmusicapi/mixins/_utils.py` | `488dbf3` |
| `src/endpoints/playlists.ts` | `ytmusicapi/mixins/playlists.py` | `488dbf3` |
| `src/endpoints/podcasts.ts` | `ytmusicapi/mixins/podcasts.py` | `488dbf3` |
| `src/endpoints/search.ts` | `ytmusicapi/mixins/search.py` | `488dbf3` |
| `src/endpoints/uploads.ts` | `ytmusicapi/mixins/uploads.py` | `488dbf3` |
| `src/endpoints/watch.ts` | `ytmusicapi/mixins/watch.py` | `488dbf3` |
| `src/types/results.ts` | return-value docstrings of the mixins | `488dbf3` |
| `src/i18n/locales.ts` (generated) | `ytmusicapi/locales/*/LC_MESSAGES/base.po` (copied to `locales/`) | `488dbf3` |
| `test/fixtures/` | `tests/data/` | `488dbf3` |

To refresh locales, copy the upstream `.po` files to `locales/<lang>.po`, then run `npm run i18n`.

Notes on the fixtures:

- Several files in `tests/data/expected_output/` predate the recorded responses they belong to. Feedback tokens and `radioId` differ, and upstream's current parsers add keys such as `communityVoteStatus`. Upstream itself only compares the description fields for artists and albums. `test/unit/golden.test.ts` does the same, and checks the rest structurally.
- `2025_11_get_explore.json` is compared in full. Our output matches it because the port reads episode durations from the subtitle. Upstream's current code returns `null` for them.

## Python → JS pitfalls

Check for these when porting an upstream change.

1. **`nav()` must keep failing loudly.** Python raises `KeyError`/`IndexError` on a missing path. Optional chaining in JS would silently give `undefined` and hide YouTube layout changes. Implement `nav(root, path)` that throws `NavigationError(path, atKey)`, plus `nav(root, path, true)` that returns `null` (Python `None`, so JSON output matches upstream).
2. **Truthiness.** `[]` and `{}` are falsy in Python but truthy in JS. Upstream has 19 `if not x:` checks and many `if results:`. Audit each one, and use a `isEmpty()` helper.
3. **Negative indices.** `x[-1]` becomes `x.at(-1)`, including inside `nav` paths. There are 3 occurrences, and `nav` must support `-1`.
4. **Dict equality.** `runs.index(DOT_SEPARATOR_RUN)` compares dicts by value. JS needs a structural compare.
5. **`x in obj`** maps to `Object.hasOwn(obj, x)`. Never use JS `in` on arrays for value lookup.
6. **Regex.** `re.findall` with groups becomes `matchAll`. Python `str.split(sep, n)` keeps the remainder, but JS `split(sep, n)` truncates it.
7. **Mutation.** `body.update(self.context)` mutates the caller's dict, and continuation lambdas reuse the same `body`. Build a fresh body for every request.
8. **gettext** becomes JSON maps generated at build time from upstream `.po` files. Each client gets its own translator; no globals (see bug 4).
9. **Integer parsing.** `int()` throws on bad input, while `parseInt` accepts junk prefixes. Use strict helpers.

## Upstream bugs fixed in the port

Each fix is also summarized for users in the [migration guide](docs/guide/migration.md#behavior-differences). Numbers are stable; 6, 7 and 26 were dropped. Not yet reported upstream: 1, 2, 3, 8, 16, 17, 24, 25 and 28–32.

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
| 16 | `continuations.py::get_continuation_token` | Indexes `results[-1]` unguarded, so an empty list raises `IndexError`. | Returns `undefined`. |
| 17 | `continuations.py::get_validated_continuations` | No guard: if the server keeps answering with empty pages that still carry a continuation token, it keeps requesting indefinitely. | Stops after 3 consecutive empty pages. |
| 18 | `navigation.py::nav` | A `null` value partway along the path raises an uncaught `TypeError`, even with `none_if_absent=True`. | Treated as absent. |
| 19 | `mixins/search.py` | The "no results" check is always false. `res["musicShelfRenderer"]` raises `KeyError` for some sections. | Both checked properly. |
| 20 | `parsers/search.py::parse_search_result` | Mutates the response's runs in place. | Works on a copy. |
| 21 | `parsers/songs.py::parse_artists_runs` | An even run count raises `IndexError`. | Tolerated. |
| 22 | `mixins/browsing.py::get_album` | An unknown carousel size raises `KeyError`. | Skipped. |
| 23 | `mixins/library.py::get_history` | Raises with a dict as the error message. | Uses the run's text. |
| 24 | `parsers/explore.py::parse_trending_item`, `parsers/browsing.py::parse_song_flat` | A greyed-out (unplayable) track in Trending has no play endpoint, so `get_explore()` raises `KeyError`. Seen live on 2026-11-09. | Optional lookups, with `videoId` taken from `playlistItemData`. |
| 25 | `parsers/explore.py::parse_chart_episode` | Reads the duration from `playbackProgress`, which current responses lack, so it is always `None`. | Falls back to the subtitle (`"<date> • <duration>"`). This matches upstream's expected output. |
| 27 | `mixins/browsing.py::get_album_browse_id` | (port regression, caught live) Decoding only `\xNN` left a trailing `\` from `\"`-escaped JSON. | Decodes all JS string escapes in one pass. |
| 28 | `mixins/playlists.py::get_playlist`, `parsers/playlists.py::parse_audio_playlist` | `limit` is passed to the continuation loop without subtracting the first page, so another page is always fetched. `get_liked_songs(limit=50)` returned 200 tracks. | Remaining limit passed. |
| 29 | `parsers/albums.py::parse_album_header_2024` | `likeStatus` comes from the save toggle's `defaultServiceEndpoint`, which is "like" whether or not the album is saved. A liked album always reports `INDIFFERENT`. | Read from `isToggled`. |
| 30 | `mixins/playlists.py::delete_playlist` | YTM now confirms a delete with a `handlePlaylistDeletionCommand` instead of `status`, so the raw response is returned. | Recognized as `STATUS_SUCCEEDED`. |
| 31 | `mixins/podcasts.py::get_episodes_playlist` | "Episodes for later" (`SE`) now uses a `musicPlaylistShelfRenderer`, which has no `contents` when empty, and "New episodes" (`RDPN`) has no contents when the account follows no podcasts. Both raise `KeyError`. | Both shelf types accepted. An empty `RDPN` throws a `YTMusicServerError` that explains why. |
| 32 | `mixins/playlists.py::get_playlist` | `id` comes from the play button, which has no endpoint on Liked Music (`LM`), and `SE` has no buttons, so `id` is `None`. | Falls back to the requested id. |
| 33 | port: `addHistoryItem` | It is a write, but it went through the retrying GET path, so a retry could record the play twice. | Not retried. |

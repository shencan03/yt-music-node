# Testing

Four suites, from fastest to most realistic. The [coverage matrix](/api/coverage) shows which suites call each method.

| Suite | Command | Network | Runs in CI |
|---|---|---|---|
| unit | `npm test` | none (fake `fetch`) | every push |
| golden | `npm test` | none (recorded responses) | every push |
| live | `npm run test:live` | music.youtube.com, signed out | nightly |
| live (auth) | `npm run test:auth` | music.youtube.com, your account | never; run locally |

## Unit tests

`test/unit/*.test.ts` test parsers, transport, auth, the CLI and endpoint logic against a fake `fetch` (`test/helpers.ts`):

<!-- no-check -->
```ts
import { fakeFetch, json } from "../helpers.ts";

const fetch = fakeFetch((request) => json({ status: "STATUS_SUCCEEDED" }));
// fetch.requests holds every request: url, method, headers, body
```

## Golden tests

`test/unit/golden.test.ts` runs upstream's recorded InnerTube responses (`test/fixtures/*.json`, from ytmusicapi's `tests/data`) through the full client and compares the result with upstream's expected output (`test/fixtures/expected_output/`). This is how the port proves it returns what ytmusicapi returns.

Several upstream expected outputs predate the recorded responses they belong to: feedback tokens and `radioId` differ, and upstream's current parsers add keys such as `communityVoteStatus`. Upstream itself only compares the description fields for artists and albums. The golden tests do the same, and check the rest structurally. The explore fixture is compared in full: the port's output matches upstream's expected output because it reads episode durations from the subtitle, where upstream's current code returns `null`.

To add a golden test for a layout change:

1. Record the response with a [hook](/guide/advanced#recording-responses), signed out.
2. Save it as `test/fixtures/<yyyy>_<mm>_<method>.json`.
3. Add a test that serves it with `clientReturning(response)` and asserts on the parsed result.

## Live tests

```sh
npm run test:live
```

`test/live/*.test.ts` call music.youtube.com signed out. They catch layout changes and run nightly in CI. They use stable ids (well-known artists and albums) and assert on shapes and invariants, not on exact values that change, like view counts.

## Authenticated tests

```sh
npx yt-music-node browser --file test/.auth/browser.json
npm run test:auth
```

`test/live/auth/` runs against a real account, from the credentials in `test/.auth/browser.json` (git-ignored, mode `0600`). The suite needs about two minutes.

**Every test leaves the account as it found it:**

- **Read-only tests** (library, history, account) change nothing.
- **Write tests** record the state, change it, verify the change, and restore it in a `finally` block: ratings, library status, subscriptions, history entries, search history.
- **Playlists** are created with the prefix `yt-music-node test`, edited (title, privacy, items, moves, collaboration) and deleted.
- **Uploads** use a 100 KB tagged test file (`test/fixtures/yt-music-node-test.mp3`) that is deleted afterwards.
- **Leftovers** from an interrupted run (playlists or uploads with the test prefix) are deleted at the start of the next run.

Requests are paced (one every 350 ms) and retried, so the suite stays well under YouTube's rate limits. Not covered: brand accounts and `setTasteProfile`, which can't be undone.

::: warning Use an account you're comfortable testing with
The suite restores what it changes, but an interrupted run can leave a test playlist or upload behind until the next run. A separate Google account is the safest choice.
:::

## Docs examples

The docs' example outputs are recorded from the live API:

```sh
npm run docs:examples                 # all
node scripts/doc-examples.ts album    # one
```

See [writing docs](/contributing/docs).

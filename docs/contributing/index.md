# Development

## Setup

```sh
git clone https://github.com/shencan03/yt-music-node.git
cd yt-music-node
npm install
npm run check   # typecheck + lint + offline tests
```

Node.js 22 or later. The library has no runtime dependencies. Keep it that way: everything it needs exists in Node's standard library and the Web platform (`fetch`, Web Crypto, `AbortSignal`).

## Layout

```
src/
  client.ts           YTMusic: options, headers, transport, endpoint wiring
  context.ts          InnerTube context, request options, the ClientContext interface
  http.ts             fetch wrapper: timeouts, retries, hooks, error mapping
  continuations.ts    the three pagination styles
  nav.ts              nav() and the response path constants
  auth/               header parsing, SAPISIDHASH
  endpoints/          one file per ytmusicapi mixin; methods attached to YTMusic.prototype
  parsers/            one file per ytmusicapi parser module; pure functions
  types/results.ts    public result types
  cli.ts              the yt-music-node command
  i18n/               translations generated from locales/*.po
scripts/              locale conversion, docs tooling
test/
  unit/               offline tests, incl. golden.test.ts
  live/               tests against music.youtube.com (YTM_LIVE=1)
  live/auth/          tests against a real account (YTM_AUTH_FILE)
  fixtures/           recorded responses and upstream's expected output
docs/                 this site (VitePress)
```

Endpoint methods are plain objects of functions typed with `this: ClientContext`. `client.ts` copies them onto `YTMusic.prototype`, and declaration merging gives `YTMusic` their types. Endpoints only use the `ClientContext` interface, so they can be tested against a fake.

## Scripts

| Script | What it does |
|---|---|
| `npm run check` | typecheck, lint and offline tests: run before every commit |
| `npm test` | offline tests only |
| `npm run test:live` | live tests against music.youtube.com, signed out |
| `npm run test:auth` | live tests against your account; see [testing](/contributing/testing#authenticated-tests) |
| `npm run build` | ESM, CommonJS, types and the CLI into `dist/` |
| `npm run docs:dev` | this site, with hot reload |
| `npm run docs:check` | everything the docs CI runs; see [writing docs](/contributing/docs) |
| `npm run i18n` | regenerate `src/i18n/locales.ts` from `locales/*.po` |

## Conventions

- **Same results as ytmusicapi.** Keep upstream's result keys and nesting, including its snake_case keys. Deviations must be bug fixes, and each goes in `PLAN.md`'s bug list and the [migration guide](/guide/migration#behavior-differences).
- **Python semantics, ported carefully.** `src/parsers/py.ts` has helpers for the places where Python and JavaScript differ (truthiness of `[]`/`{}`, `in`, negative indices). Absent values are `null`.
- **Writes are never retried.** Pass `retry: false` for any request that changes state.
- **Every public export has TSDoc.** TypeDoc fails the docs build otherwise.
- **Commit messages** describe the change and the reason for it.

## Reporting a broken method

When a method throws `YTMusicNavigationError` or returns wrong data, include:

1. the method and its arguments
2. the full error message
3. if you can, a [recorded response](/guide/advanced#recording-responses) from a **signed-out** client

Never attach `browser.json`, cookies or request headers.

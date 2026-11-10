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

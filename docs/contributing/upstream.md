# Syncing with upstream

yt-music-node ports [sigma67/ytmusicapi](https://github.com/sigma67/ytmusicapi). Most upstream commits are parser fixes for YouTube layout changes, and they port easily because the module layout is one-to-one: `ytmusicapi/parsers/albums.py` → `src/parsers/albums.ts`, `ytmusicapi/mixins/browsing.py` → `src/endpoints/browsing.ts`.

## Sync points

Each module records the upstream commit it was last synced from. To port upstream fixes, diff the upstream module from that commit to `main`:

```sh
git -C ../ytmusicapi diff 488dbf3..main -- ytmusicapi/parsers/albums.py
```

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

After porting, update the commit in this table (and in `UPSTREAM.md` in the repository), copy any new upstream fixtures to `test/fixtures/`, and run `npm run check`.

## Porting rules

- **Translate, don't redesign.** Keep functions, names (camelCased) and control flow close to upstream, so the next diff is easy to apply.
- **Python semantics.** `if not x` is false for `[]` and `{}` in Python but not in JavaScript. `x in d` checks keys. `x[-1]` is the last item. Use the helpers in `src/parsers/py.ts` and `nav`'s negative indices.
- **`None` → `null`.** `nav(…, true)` returns `null` like `nav(…, none_if_absent=True)`.
- **Bugs.** If upstream has a bug, fix it here, add it to the bug list in `UPSTREAM.md` and to the [migration guide](/guide/migration#behavior-differences), and consider reporting it upstream.

## Locales

Upstream translates localized section titles with gettext. To refresh the translations, copy upstream's `ytmusicapi/locales/<lang>/LC_MESSAGES/base.po` files to `locales/<lang>.po`, then run:

```sh
npm run i18n
```

This regenerates `src/i18n/locales.ts`, so translations ship with the code and need no file access at runtime.

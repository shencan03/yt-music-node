# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - Unreleased

First release: a TypeScript port of [ytmusicapi](https://github.com/sigma67/ytmusicapi),
synced from upstream commit `488dbf3` (see `UPSTREAM.md`).

### Added

- `YTMusic` client with all 62 public methods: search, browsing (artists, albums, songs,
  lyrics with timestamps), watch playlists, explore, charts, podcasts, library, playlists,
  uploads and history. Results are typed.
- Browser-header authentication (`YTMusic.fromAuthFile`), with brand account support via `user`.
- `yt-music-node` CLI: `browser` saves request headers, `verify` checks an auth file.
- Opt-in retries on 429, 5xx and network errors for read requests.
- Typed errors (`YTMusicServerError` with `status`, `statusText`, `reason`, `body`, `url`).
- ESM and CommonJS builds with type declarations, for Node.js 22 and later.
- Documentation site with an authentication guide and a guide to migrating from ytmusicapi.

### Fixed

- More than 30 upstream bugs. The
  [migration guide](https://shencan03.github.io/yt-music-node/guide/migration#behavior-differences)
  lists every behavior difference.

[0.1.0]: https://github.com/shencan03/yt-music-node/releases/tag/v0.1.0

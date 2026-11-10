# Limitations

Things that work differently than you might expect. Most were found while running the live test suites against a real account.

## By design

- **No streaming or downloads.** `getSong` returns stream formats, but deciphering `signatureCipher` URLs is out of scope, as it is in ytmusicapi. See [streaming URLs](/guide/advanced#streaming-urls).
- **Browser auth only.** Sign-in uses request headers from a signed-in browser session. The session lasts as long as that browser stays signed in. See [authentication](/authentication/).
- **`limit` is a target.** Whole pages are kept, so lists can be slightly longer than `limit`. See [limits and pagination](/guide/concepts#limits-and-pagination).
- **`search` without a filter ignores `limit`.** YouTube returns one fixed page of mixed results. Use a `filter` to page.

## YouTube Music behavior

These come from YouTube Music itself and also affect ytmusicapi.

| Behavior | Details |
|---|---|
| Dislikes don't show in watch playlists | `getWatchPlaylist` tracks report `LIKE` or `INDIFFERENT` only. A disliked song shows as `INDIFFERENT` there, because the track menu only toggles likes. |
| Uploads take time to appear | `uploadSong` returns once YouTube has the file. Processing takes from about a minute to several minutes before the song shows up in `getLibraryUploadSongs`. |
| Uploading the same file twice | fails with HTTP 409 (`YTMusicServerError` with `status: 409`) |
| Adding a playlist to an overlapping one | `addPlaylistItems(id, { sourcePlaylist })` returned `STATUS_FAILED` in the live tests when the source shared items with the target. Use `videoIds` for those. |
| Brand new playlists | can briefly return no contents right after `createPlaylist`. Retry a moment later. |
| "New episodes" (`RDPN`) | only exists when the account follows at least one podcast. Otherwise `getEpisodesPlaylist()` throws a `YTMusicServerError` that says so. |
| Removing history items | doesn't work for brand accounts |
| Gated writes | an account can be temporarily blocked from an action after many quick writes. You get [`YTMusicGatedError`](/guide/errors#ytmusicgatederror). |
| Taste profile | `setTasteProfile` can't be undone through the API, so it is only tested offline |
| Regional content | availability, charts and some result fields depend on `location` and on the IP address the request comes from |

## Not tested live

The [coverage matrix](/contributing/coverage) shows which suites call each method. These have no live test:

- **Brand accounts** (`user` option). The code follows upstream, but no live test runs with a brand account yet.
- **`setTasteProfile`** and **`joinCollaborativePlaylist`**: tested offline, against a fake server, because they can't be undone or need a second account.

## Layout changes

YouTube changes page layouts without notice. When it does, the affected methods throw `YTMusicNavigationError` or return incomplete data until the parsers are updated. The nightly live test run usually detects this. If you hit one first, please [report it](https://github.com/shencan03/yt-music-node/issues).

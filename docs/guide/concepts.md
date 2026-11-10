# Core concepts

## One client, many calls

`YTMusic` holds your settings (language, location, auth, timeouts) and nothing else. It opens no connection and starts no background work. On its first request it looks up a visitor id from the YouTube Music homepage once and caches it. Create one client per account and reuse it.

```ts
import { YTMusic } from "yt-music-node";

export const ytm = new YTMusic({ language: "en", location: "US" });
```

Concurrent calls on one client are safe. Unlike ytmusicapi, the client has no shared mutable state: the language and the per-request client override are passed explicitly.

## Ids: which one goes where

YouTube Music uses several kinds of ids. Results carry the ids you need for the next call, so you rarely build one yourself.

| Id | Looks like | Identifies | Used by |
|---|---|---|---|
| `videoId` | `hpSrLjc5SMs` (11 chars) | a song, video or episode | `getSong`, `getWatchPlaylist`, `rateSong`, `addPlaylistItems` |
| `browseId` (album) | `MPREb_4pL8gzRtw1p` | an album page | `getAlbum` |
| `audioPlaylistId` | `OLAK5uy_…` | an album as a playlist | `getAlbumBrowseId`, `getPlaylist`, `ratePlaylist` |
| `channelId` / `browseId` (artist) | `UCmMUZbaYdNH0bEd1PAlAqsA` | an artist, user or podcast channel | `getArtist`, `getUser`, `getChannel`, `subscribeArtist` |
| `playlistId` | `PL…`, `RDCLAK…`, `VL…` | a playlist (`VL` prefix is stripped) | `getPlaylist`, `editPlaylist`, `getWatchPlaylist` |
| special playlists | `LM`, `SE`, `RDPN` | Liked music, Episodes for later, New episodes | `getLikedSongs`, `getSavedEpisodes`, `getEpisodesPlaylist` |
| `podcastId` | `MPSP…` or the playlist id | a podcast | `getPodcast` (prefix optional) |
| lyrics / related `browseId` | `MPLYt_…` / `MPTRt_…` | a song's lyrics / related content | `getLyrics`, `getSongRelated` (from `getWatchPlaylist`) |
| `creditsBrowseId` | `MPTC…` | a song's credits | `getSongCredits` (from album and playlist tracks) |
| `setVideoId` | opaque | one item's position in one playlist | `removePlaylistItems`, `editPlaylist({ moveItem })` |
| `feedbackTokens` | opaque, `{ add, remove }` | "add to / remove from library" for one item | `editSongLibraryStatus` |
| `feedbackToken` | opaque | one history entry | `removeHistoryItems` |
| `entityId` | `t_po_…` / `FEmusic_library_privately_owned_release_detail…` | an uploaded song or album | `deleteUploadEntity` |
| `params` | opaque | a section of a page ("all albums", a mood) | `getArtistAlbums`, `getUserPlaylists`, `getMoodPlaylists`, `getChannelEpisodes` |

### Following a section to its full list

Artist, user and channel pages show a few items per section. When a section has more, it carries a `browseId` and `params`. Pass them to the matching method to get everything:

```ts
const artist = await ytm.getArtist("UCmMUZbaYdNH0bEd1PAlAqsA");

const section = artist.albums;
const allAlbums =
  section?.browseId && section.params
    ? await ytm.getArtistAlbums(section.browseId, section.params, { limit: null })
    : (section?.results ?? []);
```

| Section | Method |
|---|---|
| `getArtist(…).albums` / `.singles` / `.shows` | `getArtistAlbums(browseId, params)` |
| `getUser(…).playlists` | `getUserPlaylists(browseId, params)` |
| `getUser(…).videos` | `getUserVideos(browseId, params)` |
| `getChannel(…).episodes` | `getChannelEpisodes(channelId, params)` |
| `getArtist(…).songs.browseId` | `getPlaylist(browseId)` (all songs, as a playlist) |

## Result shapes

Results are plain objects with ytmusicapi's keys. Most keys are camelCase, and some keep upstream's snake_case (`duration_seconds`, `other_sections`, `start_time`), so code written against ytmusicapi carries over.

- **Absent values are `null`**, like Python's `None` in ytmusicapi's output. Optional keys that only some result types have are marked optional (`?`) in the types.
- **Counts stay as text where YouTube abbreviates them.** `views: "1.7B"`, `subscribers: "6.4M"`. Playlist `views` are the exception: they are parsed to a number (`2500000`), where upstream turns `"2.5M"` into `25`.
- **Durations** come as text (`"4:19"`) and, where upstream does it, as a number (`duration_seconds: 259`).
- **Thumbnails** are lists, smallest first. The last entry is the largest.
- **Text in the client's language.** Section titles, `views`, `"Song"`/`"Video"` and dates follow the `language` option. Keys don't change.

The examples on each API page show real, trimmed output. Arrays show their first items followed by a `"… N more"` marker.

## Limits and pagination

Methods that return lists take a `limit`. YouTube sends results in pages (usually 20 to 100 items), and the library fetches pages until it has at least `limit` items:

- `limit` is a **target, not a cap**. Whole pages are kept, so you can get a few more than you asked for, as with ytmusicapi. Use `.slice(0, n)` if you need exactly `n`.
- `limit: null` fetches **everything**. That can mean many requests for a big library or playlist.
- Each method documents its default. Most are 25 (library) or 100 (playlists, podcasts).

```ts
const liked = await ytm.getLikedSongs({ limit: null }); // every liked song
const first10 = (await ytm.getPlaylist("RDCLAK5uy_kmPRjHDECIcuVwnKsx2Ng7fyNgFKWNJFs", { limit: 10 })).tracks.slice(0, 10);
```

`search` is special. Without a `filter`, YouTube returns one fixed page of mixed results and `limit` has no effect. With a filter, it pages up to `limit`.

## Language and location

```ts
import { YTMusic } from "yt-music-node";

const de = new YTMusic({ language: "de", location: "DE" });
const charts = await de.getCharts({ country: "DE" });
```

- `language` changes the text YouTube returns. 17 languages are supported (`SUPPORTED_LANGUAGES`). The parsers recognize localized section titles in each one.
- `location` sets the country (`gl`) for availability and personalization (`SUPPORTED_LOCATIONS`). Charts take their own `country` option.

## Signed out vs signed in

Every method that reads public data works without auth. Methods marked **Auth required** throw `YTMusicUserError: Please provide authentication before using this function` without sending a request. Some public methods return more when signed in: `likeStatus` and `inLibrary` on tracks, `saved` on podcasts, your own playlists' `setVideoId`s. See [Authentication](/authentication/).

## Writes

Write methods (marked **Write** on the API pages) return `"STATUS_SUCCEEDED"` like upstream, or the raw response when YouTube reports something else. Two guarantees apply:

- **Never retried.** Even with `retry` enabled, a write is sent once, because a retry could apply it twice.
- **Gated writes throw.** When YouTube answers with a dialog instead of acting (for example when an account is temporarily restricted), the method throws [`YTMusicGatedError`](/guide/errors#ytmusicgatederror) instead of silently returning.

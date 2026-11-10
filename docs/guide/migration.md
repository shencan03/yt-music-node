# Migrating from ytmusicapi

If you know ytmusicapi, you already know most of yt-music-node. Results have the same keys, so code that reads results needs few changes. The calls change in three ways:

1. **camelCase method names.** `get_artist` → `getArtist`, `get_signatureTimestamp` → `getSignatureTimestamp`.
2. **Optional parameters go in an options object.** `search(query, filter="songs", limit=10)` → `search(query, { filter: "songs", limit: 10 })`. Required parameters stay positional.
3. **Everything is async.** Add `await`.

```python
# ytmusicapi
from ytmusicapi import YTMusic

yt = YTMusic("browser.json")
results = yt.search("oasis", filter="songs", limit=10)
album = yt.get_album(results[0]["album"]["id"])
print(album["title"], album["duration_seconds"])
```

```ts
// yt-music-node
import { YTMusic } from "yt-music-node";

const yt = await YTMusic.fromAuthFile("browser.json");
const results = await yt.search("oasis", { filter: "songs", limit: 10 });
const album = await yt.getAlbum(results[0]!.album!.id!);
console.log(album.title, album.duration_seconds);
```

Write methods return `"STATUS_SUCCEEDED"` like upstream, and your existing `browser.json` works unchanged.

## Method map

| ytmusicapi | yt-music-node |
|---|---|
| `YTMusic("browser.json")` | `await YTMusic.fromAuthFile("browser.json")` |
| `YTMusic(requests_session=s, proxies=p)` | `new YTMusic({ fetch })` |
| `ytmusicapi browser` | `npx yt-music-node browser` |
| `search(query, filter, scope, limit, ignore_spelling)` | `search(query, { filter, scope, limit, ignoreSpelling })` |
| `get_search_suggestions(query, detailed_runs)` | `getSearchSuggestions(query, { detailedRuns })` |
| `remove_search_suggestions(suggestions, indices)` | `removeSearchSuggestions(suggestions, { indices })` |
| `get_home(limit)` | `getHome({ limit })` |
| `get_artist(channelId)` | `getArtist(channelId)` |
| `get_artist_albums(channelId, params, limit, order)` | `getArtistAlbums(channelId, params, { limit, order })` |
| `get_user(channelId)` / `get_user_playlists` / `get_user_videos` | `getUser` / `getUserPlaylists(channelId, params)` / `getUserVideos(channelId, params)` |
| `get_album_browse_id(audioPlaylistId)` / `get_album(browseId)` | `getAlbumBrowseId` / `getAlbum` |
| `get_song(videoId, signatureTimestamp)` | `getSong(videoId, { signatureTimestamp })` |
| `get_song_related(browseId)` / `get_song_credits(browseId)` | `getSongRelated` / `getSongCredits` |
| `get_lyrics(browseId, timestamps)` | `getLyrics(browseId, { timestamps })` |
| `get_basejs_url()` / `get_signatureTimestamp(url)` | `getBasejsUrl()` / `getSignatureTimestamp({ url })` (both cached for 1 hour) |
| `get_tasteprofile()` / `set_tasteprofile(artists, profile)` | `getTasteProfile()` / `setTasteProfile(artists, { tasteProfile })` |
| `get_watch_playlist(videoId, playlistId, limit, radio, shuffle)` | `getWatchPlaylist({ videoId, playlistId, limit, radio, shuffle })` |
| `get_mood_categories()` / `get_mood_playlists(params)` | `getMoodCategories()` / `getMoodPlaylists(params)` |
| `get_charts(country)` / `get_explore()` | `getCharts({ country })` / `getExplore()` |
| `get_channel(id)` / `get_channel_episodes(id, params)` | `getChannel` / `getChannelEpisodes` |
| `get_podcast(playlistId, limit)` / `get_episode(videoId)` | `getPodcast(playlistId, { limit })` / `getEpisode` |
| `get_episodes_playlist(playlist_id)` | `getEpisodesPlaylist(playlistId)` |
| `get_playlist(playlistId, limit, related, suggestions_limit)` | `getPlaylist(playlistId, { limit, related, suggestionsLimit })` |
| `get_liked_songs(limit)` / `get_saved_episodes(limit)` | `getLikedSongs({ limit })` / `getSavedEpisodes({ limit })` |
| `create_playlist(title, description, privacy_status, video_ids, source_playlist)` | `createPlaylist(title, description, { privacyStatus, videoIds, sourcePlaylist })` |
| `edit_playlist(playlistId, title, …)` | `editPlaylist(playlistId, { title, description, privacyStatus, moveItem, addPlaylistId, addToTop, collaboration, voteOption, sortOrder })` |
| `delete_playlist` / `join_collaborative_playlist` | `deletePlaylist` / `joinCollaborativePlaylist` |
| `add_playlist_items(playlistId, videoIds, source_playlist, duplicates)` | `addPlaylistItems(playlistId, { videoIds, sourcePlaylist, duplicates })` |
| `remove_playlist_items(playlistId, videos)` | `removePlaylistItems(playlistId, videos)` |
| `get_library_playlists` / `_songs` / `_albums` / `_artists` / `_subscriptions` / `_podcasts` / `_channels` `(limit, order)` | `getLibraryPlaylists` / `getLibrarySongs` / … `({ limit, order })` (`getLibrarySongs` also takes `validateResponses`) |
| `get_history()` / `add_history_item(song)` / `remove_history_items(tokens)` | `getHistory()` / `addHistoryItem(song)` / `removeHistoryItems(tokens)` |
| `rate_song(videoId, rating)` / `rate_playlist(playlistId, rating)` | `rateSong(videoId, rating)` / `ratePlaylist(playlistId, rating)` (`"LIKE"`, `"DISLIKE"`, `"INDIFFERENT"`) |
| `edit_song_library_status(feedbackTokens)` | `editSongLibraryStatus(feedbackTokens)` |
| `subscribe_artist(channelId)` / `unsubscribe_artists(channelIds)` | `subscribeArtist` / `unsubscribeArtists` (the deprecated `subscribe_artists` is not ported) |
| `get_account_info()` | `getAccountInfo()` |
| `get_library_upload_songs` / `_albums` / `_artists` `(limit, order)` | `getLibraryUploadSongs` / `getLibraryUploadAlbums` / `getLibraryUploadArtists` `({ limit, order })` |
| `get_library_upload_artist(browseId, limit)` / `get_library_upload_album(browseId)` | `getLibraryUploadArtist(browseId, { limit })` / `getLibraryUploadAlbum(browseId)` |
| `upload_song(filepath)` | `uploadSong(path)` or `uploadSong({ data, filename })`. Throws on failure instead of returning the response |
| `delete_upload_entity(entityId)` | `deleteUploadEntity(entityId)` |
| `with yt.as_mobile(): …` | `request(endpoint, body, { client: MOBILE_CLIENT })` |

Every method is also listed in the [API overview](/api/), and each API entry shows its ytmusicapi name.

## Behavior differences

These are deliberate fixes of upstream bugs. Where results differ, the port's output is the correct one.

| Area | ytmusicapi | yt-music-node |
|---|---|---|
| Playlist `views` | `"2.5M views"` → `25` (strips every non-digit) | `2500000` (parses K/M/B and decimals) |
| `limit` on playlists and liked songs | ignores the first page, so `get_liked_songs(limit=50)` returned 200 tracks | counts the first page |
| Album `likeStatus` | always `INDIFFERENT` for saved albums | read from the save toggle |
| Playlist `id` for `LM` and `SE` | `None` | the requested id |
| `delete_playlist` | returns the raw response (YouTube changed its confirmation) | `"STATUS_SUCCEEDED"` |
| `get_explore` with an unplayable trending track | `KeyError` | the track, without play info |
| Chart episode `duration` | always `None` | parsed from the subtitle |
| `get_episodes_playlist` for "Episodes for later" | `KeyError` | works, including when empty |
| `upload_song` | case-sensitive extension check (`.MP3` rejected); returns the HTTP response; no timeout | case-insensitive; throws `YTMusicServerError` on failure; 10 minute default timeout |
| Error responses | an HTML 429/5xx page raises `JSONDecodeError` | `YTMusicServerError` with `status` |
| Gated writes | returned as if successful | throw `YTMusicGatedError` |
| Two clients with different languages | share one translator (process-wide locale) | independent |
| `as_mobile()` | changes the client for every concurrent request on the instance | `request(..., { client: MOBILE_CLIENT })` for one request |
| `get_basejs_url` / `get_signatureTimestamp` | fetch on every call | cached for an hour |
| Visitor id lookup failure | sends an empty `X-Goog-Visitor-Id` silently | warns through `logger` |
| Auth input without a cookie | a misleading error about another auth type | says what's missing |
| Missing optional values | `None` | `null` |

The full list, with the upstream source location of each bug, is in the repository's `PLAN.md`.

## Not ported

| ytmusicapi | Instead |
|---|---|
| `YTMusic(requests_session=…, proxies=…)` | `new YTMusic({ fetch })`; see [proxies](/guide/configuration#proxies-and-custom-fetch) |
| `subscribe_artists` (deprecated) | `subscribeArtist` |
| `with yt.as_mobile()` | `request(endpoint, body, { client: MOBILE_CLIENT })` |

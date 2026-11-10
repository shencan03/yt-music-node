---
title: getArtist
summary: "An artist page"
auth: optional
order: 2
---

# `getArtist`

<MethodInfo />

An artist's page: name, description, subscribers, top songs and sections of albums, singles, videos, related artists, and, for some artists, episodes and podcasts. Signed in, `subscribed` reflects your subscription. `MPLA`-prefixed ids work too.

```ts
const artist = await ytm.getArtist("UCmMUZbaYdNH0bEd1PAlAqsA");
console.log(artist.name, artist.subscribers, artist.monthlyListeners);
console.log(artist.songs.results?.map((s) => s.title));

// play the artist's radio
const radio = await ytm.getWatchPlaylist({ playlistId: artist.radioId! });
```

## Reference

```ts
getArtist(channelId: string, options?: CallOptions): Promise<Artist>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `channelId` | `string` | yes | the artist's channel id (`UC…`); `MPLA…` ids work too |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`Artist`](/reference/interfaces/Artist).

| Result key | Description |
|---|---|
| `name`, `description`, `views`, `subscribers`, `monthlyListeners`, `thumbnails` | page header |
| `channelId`, `shuffleId`, `radioId` | ids for `subscribeArtist`, and for `getWatchPlaylist({ playlistId })` (shuffle or radio of the artist) |
| `songs` | top songs. `songs.browseId` is a playlist of all songs (pass it to `getPlaylist`) |
| `albums`, `singles`, `shows`, `videos`, `playlists`, `related`, `episodes`, `podcasts` | [sections](/guide/concepts#following-a-section-to-its-full-list). `results` holds the items shown, and `browseId` + `params` lead to the full list |
| `subscribed` | whether you are subscribed (`false` when signed out) |

## Example output

<details class="example"><summary>Example output: <code>getArtist("UCmMUZbaYdNH0bEd1PAlAqsA")</code> (Oasis)</summary>

<<< @/examples/artist.json

</details>

## Coming from ytmusicapi

This is `get_artist` in ytmusicapi. See the [migration guide](/guide/migration).

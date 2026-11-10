---
title: getSong
summary: "Player data for a song"
auth: none
order: 9
---

# `getSong`

<MethodInfo />

The player's data for a song or video: `videoDetails` (title, author, length, view count, keywords, thumbnails), `playabilityStatus`, `microformat` (category, publish date, available countries), `playbackTracking` (for [`addHistoryItem`](/api/library/addHistoryItem)) and `streamingData`. The shapes are YouTube's own.

```ts
const song = await ytm.getSong("hpSrLjc5SMs");
console.log(song.videoDetails.title, song.videoDetails.lengthSeconds, song.playabilityStatus.status);
```

::: warning Stream URLs
Most formats in `streamingData` have a `signatureCipher` instead of a URL. Deciphering it is out of scope. See [streaming URLs](/guide/advanced#streaming-urls).
:::

## Reference

```ts
getSong(videoId: string, options?: { signatureTimestamp?: number }): Promise<SongPlayerResponse>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `videoId` | `string` | yes | the song, video or episode id (11 characters) |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signatureTimestamp` | `number` | estimated from the date | from [`getSignatureTimestamp`](/api/browsing/getSignatureTimestamp), for valid stream URLs |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`SongPlayerResponse`](/reference/interfaces/SongPlayerResponse).

## Example output

<details class="example"><summary>Example output (streaming formats omitted)</summary>

<<< @/examples/song.json

</details>

## Coming from ytmusicapi

This is `get_song` in ytmusicapi. See the [migration guide](/guide/migration).

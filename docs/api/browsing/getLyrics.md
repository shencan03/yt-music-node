---
title: getLyrics
summary: "Lyrics, optionally timed"
auth: none
order: 12
---

# `getLyrics`

<MethodInfo />

A song's lyrics. Pass the `lyrics` browseId from [`getWatchPlaylist`](/api/watch/getWatchPlaylist). Returns `null` when the song has no lyrics.

Check `hasTimestamps` to tell the two shapes apart:

```ts
const watch = await ytm.getWatchPlaylist({ videoId: "hpSrLjc5SMs", limit: 1 });
const lyrics = watch.lyrics ? await ytm.getLyrics(watch.lyrics, { timestamps: true }) : null;

if (lyrics?.hasTimestamps) {
  for (const line of lyrics.lyrics) console.log(line.start_time, line.end_time, line.text);
} else if (lyrics) {
  console.log(lyrics.lyrics); // one string, lines separated by \n
}
```

`start_time` and `end_time` are milliseconds. `source` credits the lyrics provider (e.g. `"Source: LyricFind"`). Display it with the lyrics.

## Reference

```ts
getLyrics(browseId: string, options?: { timestamps?: boolean }): Promise<Lyrics | TimedLyrics | null>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `browseId` | `string` | yes | the `lyrics` id (`MPLYt_…`) from `getWatchPlaylist` |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `timestamps` | `boolean` | `false` | request timed lyrics. They come from the mobile app's API, and when a song has none, you get plain lyrics. |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`Lyrics`](/reference/interfaces/Lyrics)` | `[`TimedLyrics`](/reference/interfaces/TimedLyrics)` | null`.

### Errors

Throws `YTMusicUserError` for an empty `browseId`.

## Example output

<details class="example"><summary>Example output (lyric text replaced; lyrics are copyrighted)</summary>

<<< @/examples/lyrics.json

<<< @/examples/lyrics-timed.json

</details>

## Coming from ytmusicapi

This is `get_lyrics` in ytmusicapi. See the [migration guide](/guide/migration).

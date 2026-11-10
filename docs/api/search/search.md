---
title: search
summary: "Search the catalog, your library or uploads"
auth: optional
order: 1
---

# `search`

<MethodInfo />

Searches YouTube Music. Results come in the order the website shows them, starting with the top result.

```ts
const songs = await ytm.search("oasis wonderwall", { filter: "songs", limit: 3 });
const top = songs[0];
console.log(top?.title, top?.videoId, top?.duration_seconds);

// mixed results: switch on resultType
for (const result of await ytm.search("oasis")) {
  if (result.resultType === "artist") console.log("artist:", result.browseId);
  if (result.resultType === "album") console.log("album:", result.title, result.browseId);
}
```

## Reference

```ts
search(query: string, options?: SearchOptions): Promise<SearchResult[]>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | `string` | yes | what to search for, as you would type it |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `filter` | `SearchFilter` | all types | `"songs"`, `"videos"`, `"albums"`, `"artists"`, `"playlists"`, `"community_playlists"`, `"featured_playlists"`, `"profiles"`, `"podcasts"` or `"episodes"` |
| `scope` | `"library"` \| `"uploads"` | catalog | search your library or uploads instead. **Requires auth.** |
| `limit` | `number` | `20` | results to aim for. Only applies with a `filter`: YouTube pages filtered results, but returns one fixed page without a filter. |
| `ignoreSpelling` | `boolean` | `false` | search exactly what you typed, without "Did you mean" correction |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`SearchResult`](/reference/interfaces/SearchResult)`[]`, in the order the website shows them.

Every result has `category` (the shelf it came from, e.g. `"Top result"` or `"Songs"`) and `resultType` (`"song"`, `"video"`, `"album"`, `"artist"`, `"playlist"`, `"podcast"`, `"episode"`, `"profile"`, …). The other keys depend on `resultType`: songs have `videoId`, `artists`, `album` and `duration`; albums, artists and podcasts have `browseId`; playlists have `browseId` and `itemCount`.

### Errors

Throws `YTMusicUserError` for an unknown `filter` or `scope`, a `filter` combined with `scope: "uploads"`, `community_playlists`/`featured_playlists` with `scope: "library"`, or a `scope` without auth.

## Example output

<details class="example"><summary>Example output: <code>search("oasis wonderwall", { filter: "songs", limit: 3 })</code></summary>

<<< @/examples/search-songs.json

</details>

<details class="example"><summary>Example output: <code>search("oasis")</code> (no filter)</summary>

<<< @/examples/search-all.json

</details>

## Coming from ytmusicapi

This is `search` in ytmusicapi. See the [migration guide](/guide/migration).

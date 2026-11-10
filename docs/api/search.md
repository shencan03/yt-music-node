# Search

## `search`

<MethodInfo name="search" auth="optional" />

```ts
search(query: string, options?: SearchOptions): Promise<SearchResult[]>
```

Searches YouTube Music. Results come in the order the website shows them, starting with the top result.

| Option | Type | Default | Description |
|---|---|---|---|
| `filter` | `SearchFilter` | all types | `"songs"`, `"videos"`, `"albums"`, `"artists"`, `"playlists"`, `"community_playlists"`, `"featured_playlists"`, `"profiles"`, `"podcasts"` or `"episodes"` |
| `scope` | `"library"` \| `"uploads"` | catalog | search your library or uploads instead. **Requires auth.** |
| `limit` | `number` | `20` | results to aim for. Only applies with a `filter`: YouTube pages filtered results, but returns one fixed page without a filter. |
| `ignoreSpelling` | `boolean` | `false` | search exactly what you typed, without "Did you mean" correction |
| `signal` | `AbortSignal` | – | cancels the call |

Every result has `category` (the shelf it came from, e.g. `"Top result"` or `"Songs"`) and `resultType` (`"song"`, `"video"`, `"album"`, `"artist"`, `"playlist"`, `"podcast"`, `"episode"`, `"profile"`, …). The other keys depend on `resultType`: songs have `videoId`, `artists`, `album` and `duration`; albums, artists and podcasts have `browseId`; playlists have `browseId` and `itemCount`.

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

<details class="example"><summary>Example output: <code>search("oasis wonderwall", { filter: "songs", limit: 3 })</code></summary>

<<< @/examples/search-songs.json

</details>

<details class="example"><summary>Example output: <code>search("oasis")</code> (no filter)</summary>

<<< @/examples/search-all.json

</details>

**Throws** `YTMusicUserError` for an unknown `filter` or `scope`, a `filter` combined with `scope: "uploads"`, `community_playlists`/`featured_playlists` with `scope: "library"`, or a `scope` without auth.

## `getSearchSuggestions`

<MethodInfo name="getSearchSuggestions" auth="optional" />

```ts
getSearchSuggestions(query: string, options?: { detailedRuns?: false }): Promise<string[]>
getSearchSuggestions(query: string, options: { detailedRuns: true }): Promise<SearchSuggestion[]>
```

The suggestions YouTube Music shows while you type. Signed in, they include matches from your search history.

| Option | Type | Default | Description |
|---|---|---|---|
| `detailedRuns` | `boolean` | `false` | return objects with the text split into runs (bold parts are what you typed), `fromHistory` and the `feedbackToken` needed to remove history entries |

```ts
const plain = await ytm.getSearchSuggestions("oasis wond");
// ["oasis wonderwall", "oasis wonderwall lyrics", ...]

const detailed = await ytm.getSearchSuggestions("oasis wond", { detailedRuns: true });
for (const s of detailed) console.log(s.text, s.fromHistory ? "(history)" : "");
```

<details class="example"><summary>Example output</summary>

<<< @/examples/search-suggestions.json

<<< @/examples/search-suggestions-detailed.json

</details>

## `removeSearchSuggestions`

<MethodInfo name="removeSearchSuggestions" auth="required" write />

```ts
removeSearchSuggestions(suggestions: SearchSuggestion[], options?: { indices?: number[] }): Promise<boolean>
```

Removes entries from your search history, using detailed suggestions. Without `indices`, every history suggestion in the list is removed.

```ts
const suggestions = await ytm.getSearchSuggestions("oasis", { detailedRuns: true });
const fromHistory = suggestions.map((s, i) => (s.fromHistory ? i : -1)).filter((i) => i >= 0);
if (fromHistory.length > 0) {
  await ytm.removeSearchSuggestions(suggestions, { indices: fromHistory });
}
```

Returns `true` when YouTube accepted the removal.

**Throws** `YTMusicUserError` when none of the suggestions come from history, or an index is out of range.

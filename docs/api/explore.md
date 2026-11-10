# Explore & charts

## `getExplore`

<MethodInfo name="getExplore" auth="none" />

```ts
getExplore(options?: CallOptions): Promise<Explore>
```

The Explore page. Which sections exist depends on your location:

| Key | Contents |
|---|---|
| `new_releases` | new albums and singles |
| `moods_and_genres` | categories, with `params` for [`getMoodPlaylists`](#getmoodplaylists) |
| `top_songs` | `{ playlist, items }`: the top songs chart (not in every country) |
| `trending` | `{ playlist, items }`: trending songs and videos, each with `rank` and `trend` |
| `new_videos` | new music videos |
| `top_episodes` | top podcast episodes (some countries) |

```ts
const explore = await ytm.getExplore();
console.log(explore.new_releases?.map((a) => a.title));
console.log(explore.trending?.items.slice(0, 5).map((t) => `${t.rank}. ${t.title}`));
```

<details class="example"><summary>Example output</summary>

<<< @/examples/explore.json

</details>

## `getMoodCategories`

<MethodInfo name="getMoodCategories" auth="none" />

```ts
getMoodCategories(options?: CallOptions): Promise<MoodCategories>
```

All mood and genre categories, grouped by section title (e.g. `"Moods & moments"`, `"Genres"`; the titles follow the client's `language`). Each category has a `title` and the `params` for `getMoodPlaylists`.

```ts
const categories = await ytm.getMoodCategories();
for (const [section, moods] of Object.entries(categories)) {
  console.log(section, moods.map((m) => m.title).join(", "));
}
```

<details class="example"><summary>Example output</summary>

<<< @/examples/mood-categories.json

</details>

## `getMoodPlaylists`

<MethodInfo name="getMoodPlaylists" auth="none" />

```ts
getMoodPlaylists(params: string, options?: CallOptions): Promise<PlaylistSummary[]>
```

The playlists of a mood or genre.

```ts
const categories = await ytm.getMoodCategories();
const chill = Object.values(categories).flat().find((c) => c.title === "Chill");
if (chill) {
  const playlists = await ytm.getMoodPlaylists(chill.params);
  console.log(playlists.map((p) => p.title));
}
```

<details class="example"><summary>Example output</summary>

<<< @/examples/mood-playlists.json

</details>

## `getCharts`

<MethodInfo name="getCharts" auth="none" />

```ts
getCharts(options?: { country?: string }): Promise<Charts>
```

The latest charts of a country.

| Option | Type | Default | Description |
|---|---|---|---|
| `country` | `string` | `"ZZ"` (global) | ISO 3166-1 alpha-2 code, e.g. `"US"`. `countries.options` lists the valid ones. |

| Key | Contents |
|---|---|
| `countries` | `selected` (the chart's country) and `options` (all available codes) |
| `videos` | video chart playlists |
| `artists` | the artist chart, each with `rank` and `trend` (`"up"`, `"down"`, `"neutral"`) |
| `genres` | genre chart playlists (US) |
| `daily`, `weekly` | daily and weekly top-song playlists (in some countries) |
| `languages` | chart playlists by language (India) |

Chart entries are playlists: load the songs with `getPlaylist(entry.playlistId)`.

```ts
const charts = await ytm.getCharts({ country: "US" });
console.log(charts.artists?.slice(0, 10).map((a) => `${a.rank}. ${a.title} (${a.trend})`));

const topVideos = charts.videos?.[0];
if (topVideos) console.log((await ytm.getPlaylist(topVideos.playlistId, { limit: 10 })).tracks.map((t) => t.title));
```

<details class="example"><summary>Example output: <code>getCharts({ country: "US" })</code></summary>

<<< @/examples/charts.json

</details>

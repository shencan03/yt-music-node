---
title: getCharts
summary: "Charts by country"
auth: none
order: 4
---

# `getCharts`

<MethodInfo />

The latest charts of a country.

Chart entries are playlists: load the songs with `getPlaylist(entry.playlistId)`.

```ts
const charts = await ytm.getCharts({ country: "US" });
console.log(charts.artists?.slice(0, 10).map((a) => `${a.rank}. ${a.title} (${a.trend})`));

const topVideos = charts.videos?.[0];
if (topVideos) console.log((await ytm.getPlaylist(topVideos.playlistId, { limit: 10 })).tracks.map((t) => t.title));
```

## Reference

```ts
getCharts(options?: { country?: string }): Promise<Charts>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `country` | `string` | `"ZZ"` (global) | ISO 3166-1 alpha-2 code, e.g. `"US"`. `countries.options` lists the valid ones. |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`Charts`](/reference/interfaces/Charts).

| Key | Contents |
|---|---|
| `countries` | `selected` (the chart's country) and `options` (all available codes) |
| `videos` | video chart playlists |
| `artists` | the artist chart, each with `rank` and `trend` (`"up"`, `"down"`, `"neutral"`) |
| `genres` | genre chart playlists (US) |
| `daily`, `weekly` | daily and weekly top-song playlists (in some countries) |
| `languages` | chart playlists by language (India) |

## Example output

<details class="example"><summary>Example output: <code>getCharts({ country: "US" })</code></summary>

<<< @/examples/charts.json

</details>

## Coming from ytmusicapi

This is `get_charts` in ytmusicapi. See the [migration guide](/guide/migration).

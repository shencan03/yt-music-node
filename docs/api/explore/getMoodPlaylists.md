---
title: getMoodPlaylists
summary: "Playlists of a mood or genre"
auth: none
order: 3
---

# `getMoodPlaylists`

<MethodInfo />

The playlists of a mood or genre.

```ts
const categories = await ytm.getMoodCategories();
const chill = Object.values(categories).flat().find((c) => c.title === "Chill");
if (chill) {
  const playlists = await ytm.getMoodPlaylists(chill.params);
  console.log(playlists.map((p) => p.title));
}
```

## Reference

```ts
getMoodPlaylists(params: string, options?: CallOptions): Promise<PlaylistSummary[]>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `params` | `string` | yes | the `params` of a category from `getMoodCategories` |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`PlaylistSummary`](/reference/interfaces/PlaylistSummary)`[]`.

## Example output

<details class="example"><summary>Example output</summary>

<<< @/examples/mood-playlists.json

</details>

## Coming from ytmusicapi

This is `get_mood_playlists` in ytmusicapi. See the [migration guide](/guide/migration).

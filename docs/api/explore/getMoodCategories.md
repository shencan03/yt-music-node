---
title: getMoodCategories
summary: "Moods and genres"
auth: none
order: 2
---

# `getMoodCategories`

<MethodInfo />

All mood and genre categories, grouped by section title (e.g. `"Moods & moments"`, `"Genres"`; the titles follow the client's `language`). Each category has a `title` and the `params` for `getMoodPlaylists`.

```ts
const categories = await ytm.getMoodCategories();
for (const [section, moods] of Object.entries(categories)) {
  console.log(section, moods.map((m) => m.title).join(", "));
}
```

## Reference

```ts
getMoodCategories(options?: CallOptions): Promise<MoodCategories>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`MoodCategories`](/reference/type-aliases/MoodCategories).

## Example output

<details class="example"><summary>Example output</summary>

<<< @/examples/mood-categories.json

</details>

## Coming from ytmusicapi

This is `get_mood_categories` in ytmusicapi. See the [migration guide](/guide/migration).

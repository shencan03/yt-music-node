---
title: getHome
summary: "The home page shelves"
auth: optional
order: 1
---

# `getHome`

<MethodInfo />

The home page as rows ("shelves"), each with a `title` and mixed `contents`: songs, albums, playlists, artists, videos, episodes. Signed in, the rows are personalized ("Listen again", "Quick picks", "Mixed for you").

```ts
for (const row of await ytm.getHome({ limit: 6 })) {
  console.log(row.title, Array.isArray(row.contents) ? row.contents.length : "");
}
```

## Reference

```ts
getHome(options?: { limit?: number }): Promise<HomeSection[]>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | `3` | rows to aim for. The first page has about 3 rows; more are fetched until `limit` is reached. |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`HomeSection`](/reference/interfaces/HomeSection)`[]`.

## Example output

<details class="example"><summary>Example output (signed out)</summary>

<<< @/examples/home.json

</details>

## Coming from ytmusicapi

This is `get_home` in ytmusicapi. See the [migration guide](/guide/migration).

---
title: getLibraryChannels
summary: "Podcast channels you subscribe to"
auth: required
order: 7
---

# `getLibraryChannels`

<MethodInfo />

Podcast channels you subscribe to.

```ts
const channels = await ytm.getLibraryChannels();
console.log(channels.map((c) => c.artist));
```

## Reference

```ts
getLibraryChannels(options?: LibraryOptions): Promise<LibraryArtist[]>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number \| null` | `25` | items to aim for; `null` for all |
| `order` | `"a_to_z"` \| `"z_to_a"` \| `"recently_added"` | library order | sort order |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`LibraryArtist`](/reference/interfaces/LibraryArtist)`[]`.

An empty library section returns `[]`.

## Coming from ytmusicapi

This is `get_library_channels` in ytmusicapi. See the [migration guide](/guide/migration).

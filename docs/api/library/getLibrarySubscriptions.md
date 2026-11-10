---
title: getLibrarySubscriptions
summary: "Artists you subscribe to"
auth: required
order: 5
---

# `getLibrarySubscriptions`

<MethodInfo />

Artists you subscribe to, with `subscribers` (count text).

```ts
const subscriptions = await ytm.getLibrarySubscriptions({ limit: null, order: "a_to_z" });
console.log(subscriptions.map((a) => `${a.artist}: ${a.subscribers ?? "?"} subscribers`));
```

## Reference

```ts
getLibrarySubscriptions(options?: LibraryOptions): Promise<LibraryArtist[]>
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

This is `get_library_subscriptions` in ytmusicapi. See the [migration guide](/guide/migration).

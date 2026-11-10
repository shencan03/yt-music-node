---
title: getTasteProfile
summary: "Artists in the taste profile"
auth: required
upstream: get_tasteprofile
order: 15
---

# `getTasteProfile`

<MethodInfo />

The artists YouTube Music offers in "Tell us which artists you like", keyed by name. Each entry has the `selectionValue` and `impressionValue` that [`setTasteProfile`](/api/browsing/setTasteProfile) needs.

```ts
const profile = await ytm.getTasteProfile();
console.log(Object.keys(profile)); // artist names
```

## Reference

```ts
getTasteProfile(options?: CallOptions): Promise<TasteProfile>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`TasteProfile`](/reference/type-aliases/TasteProfile).

## Coming from ytmusicapi

This is `get_tasteprofile` in ytmusicapi. See the [migration guide](/guide/migration).

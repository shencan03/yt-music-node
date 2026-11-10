---
title: removeSearchSuggestions
summary: "Remove search history entries"
auth: required
write: true
order: 3
---

# `removeSearchSuggestions`

<MethodInfo />

Removes entries from your search history, using detailed suggestions. Without `indices`, every history suggestion in the list is removed.

```ts
const suggestions = await ytm.getSearchSuggestions("oasis", { detailedRuns: true });
const fromHistory = suggestions.map((s, i) => (s.fromHistory ? i : -1)).filter((i) => i >= 0);
if (fromHistory.length > 0) {
  await ytm.removeSearchSuggestions(suggestions, { indices: fromHistory });
}
```

## Reference

```ts
removeSearchSuggestions(suggestions: SearchSuggestion[], options?: { indices?: number[] }): Promise<boolean>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `suggestions` | `SearchSuggestion[]` | yes | suggestions from `getSearchSuggestions(query, { detailedRuns: true })` |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `indices` | `number[]` | every history suggestion | positions in `suggestions` to remove |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of `boolean`: `true` when YouTube accepted the removal.

### Errors

Throws `YTMusicUserError` when none of the suggestions come from history, or an index is out of range.

## Coming from ytmusicapi

This is `remove_search_suggestions` in ytmusicapi. See the [migration guide](/guide/migration).

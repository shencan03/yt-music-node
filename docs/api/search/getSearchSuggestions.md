---
title: getSearchSuggestions
summary: "Suggestions while typing"
auth: optional
order: 2
---

# `getSearchSuggestions`

<MethodInfo />

The suggestions YouTube Music shows while you type. Signed in, they include matches from your search history.

```ts
const plain = await ytm.getSearchSuggestions("oasis wond");
// ["oasis wonderwall", "oasis wonderwall lyrics", ...]

const detailed = await ytm.getSearchSuggestions("oasis wond", { detailedRuns: true });
for (const s of detailed) console.log(s.text, s.fromHistory ? "(history)" : "");
```

## Reference

```ts
getSearchSuggestions(query: string, options?: { detailedRuns?: false }): Promise<string[]>
getSearchSuggestions(query: string, options: { detailedRuns: true }): Promise<SearchSuggestion[]>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | `string` | yes | what to search for, as you would type it |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `detailedRuns` | `boolean` | `false` | return objects with the text split into runs (bold parts are what you typed), `fromHistory` and the `feedbackToken` needed to remove history entries |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of `string[]`, or of [`SearchSuggestion`](/reference/interfaces/SearchSuggestion)`[]` with `detailedRuns: true`.

## Example output

<details class="example"><summary>Example output</summary>

<<< @/examples/search-suggestions.json

<<< @/examples/search-suggestions-detailed.json

</details>

## Coming from ytmusicapi

This is `get_search_suggestions` in ytmusicapi. See the [migration guide](/guide/migration).

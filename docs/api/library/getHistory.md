---
title: getHistory
summary: "Your play history"
auth: required
order: 13
---

# `getHistory`

<MethodInfo />

Your play history, newest first. Each item is a track plus `played` (the group it's in, e.g. `"Today"`, `"Yesterday"`) and the `feedbackToken` to remove it.

```ts
const history = await ytm.getHistory();
for (const item of history.slice(0, 10)) console.log(item.played, item.title);
```

## Reference

```ts
getHistory(options?: CallOptions): Promise<HistoryItem[]>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`HistoryItem`](/reference/interfaces/HistoryItem)`[]`.

## Coming from ytmusicapi

This is `get_history` in ytmusicapi. See the [migration guide](/guide/migration).

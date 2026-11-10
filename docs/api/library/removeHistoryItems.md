---
title: removeHistoryItems
summary: "Remove history entries"
auth: required
write: true
order: 15
---

# `removeHistoryItems`

<MethodInfo />

Removes entries from your history, using their `feedbackToken`s from `getHistory`. Doesn't work for brand accounts.

```ts
const history = await ytm.getHistory();
const today = history.filter((h) => h.played === "Today" && h.feedbackToken).map((h) => h.feedbackToken!);
await ytm.removeHistoryItems(today);
```

## Reference

```ts
removeHistoryItems(feedbackTokens: string[], options?: CallOptions): Promise<any>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `feedbackTokens` | `string[]` | yes | the `feedbackToken` of each entry, from `getHistory` |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of YouTube's raw response, typed `any`. It isn't checked for success.

## Coming from ytmusicapi

This is `remove_history_items` in ytmusicapi. See the [migration guide](/guide/migration).

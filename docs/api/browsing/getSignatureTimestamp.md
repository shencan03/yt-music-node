---
title: getSignatureTimestamp
summary: "The player's signature timestamp"
auth: none
upstream: get_signatureTimestamp
order: 14
---

# `getSignatureTimestamp`

<MethodInfo />

The `signatureTimestamp` of the current player, for [`getSong`](/api/browsing/getSong). Cached for an hour, unless you pass a `url`.

```ts
const signatureTimestamp = await ytm.getSignatureTimestamp(); // e.g. 20403
const song = await ytm.getSong("hpSrLjc5SMs", { signatureTimestamp });
```

## Reference

```ts
getSignatureTimestamp(options?: { url?: string }): Promise<number>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | `getBasejsUrl()` | the player script URL, if you already have it |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of `number`.

## Coming from ytmusicapi

This is `get_signatureTimestamp` in ytmusicapi. See the [migration guide](/guide/migration).

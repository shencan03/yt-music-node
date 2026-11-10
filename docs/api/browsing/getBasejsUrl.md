---
title: getBasejsUrl
summary: "The player script URL"
auth: none
order: 13
---

# `getBasejsUrl`

<MethodInfo />

The URL of the current `base.js` player script. Cached on the client for an hour.

```ts
const url = await ytm.getBasejsUrl();
// "https://music.youtube.com/s/player/…/player_es6.vflset/…/base.js"
```

## Reference

```ts
getBasejsUrl(options?: CallOptions): Promise<string>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of `string`.

## Coming from ytmusicapi

This is `get_basejs_url` in ytmusicapi. See the [migration guide](/guide/migration).

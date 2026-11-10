---
title: setTasteProfile
summary: "Select artists in the taste profile"
auth: required
write: true
upstream: set_tasteprofile
order: 16
---

# `setTasteProfile`

<MethodInfo />

Selects artists in your taste profile, which shapes recommendations. `artists` are names from `getTasteProfile`. Pass the profile you already fetched as `tasteProfile` to save a request.

```ts
const profile = await ytm.getTasteProfile();
await ytm.setTasteProfile(["Oasis", "Blur"], { tasteProfile: profile });
```

::: warning Can't be undone
There's no API to deselect artists, so this method is only tested against a fake server.
:::

## Reference

```ts
setTasteProfile(artists: string[], options?: { tasteProfile?: TasteProfile }): Promise<void>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `artists` | `string[]` | yes | artist names as they appear in the taste profile |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `tasteProfile` | `TasteProfile` | fetched | the result of `getTasteProfile()`, to skip fetching it again |
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of `void`.

### Errors

Throws `YTMusicUserError` for a name that isn't in the profile.

## Coming from ytmusicapi

This is `set_tasteprofile` in ytmusicapi. See the [migration guide](/guide/migration).

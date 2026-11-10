---
title: request
summary: "Any InnerTube endpoint"
auth: optional
upstream: _send_request
order: 1
---

# `request`

<MethodInfo />

Sends a request to any InnerTube endpoint (`https://music.youtube.com/youtubei/v1/<endpoint>`) and returns the parsed JSON. The client adds its `context` (client name and version, language, location, brand account), auth headers and visitor id, and applies its timeout, retries and hooks, as for every other method.

```ts
import { MOBILE_CLIENT, YTMusic } from "yt-music-node";

const ytm = new YTMusic();

// any browse page
const home = await ytm.request("browse", { browseId: "FEmusic_home" });

// the same, as the Android app
const mobileHome = await ytm.request("browse", { browseId: "FEmusic_home" }, { client: MOBILE_CLIENT });

// the player response, unfiltered (getSong sends the same body)
const player = await ytm.request("player", { video_id: "hpSrLjc5SMs" });
```

Use [`nav`](/guide/advanced#navigate-a-response) to dig values out of the response. Errors work as for every method: a non-2xx status throws [`YTMusicServerError`](/guide/errors#ytmusicservererror).

## Reference

```ts
request(endpoint: string, body?: JsonObject, options?: RequestOptions): Promise<any>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `endpoint` | `string` | yes | the InnerTube endpoint, e.g. `"browse"` or `"next"` |
| `body` | `JsonObject` | no | the request body; the client adds `context` |

### Options

| Option | Type | Description |
|---|---|---|
| `client` | `ClientInfo` | send as another client for this request, e.g. `MOBILE_CLIENT` |
| `additionalParams` | `string` | appended to the query string, e.g. `&ctoken=…&continuation=…` |
| `retry` | `boolean` | `false` to never retry. Set it for anything that changes state. Default `true` (when the client has retries enabled). |
| `signal` | `AbortSignal` | cancels the call |

### Returns

A promise of the parsed JSON response, typed `any` because its shape depends on the endpoint.

## Useful endpoints

| Endpoint | Body | Returns |
|---|---|---|
| `browse` | `{ browseId, params? }` | any page: `FEmusic_home`, `FEmusic_explore`, `FEmusic_charts`, `FEmusic_library_landing`, `MPRE…`, `UC…`, `VL…` |
| `next` | `{ videoId?, playlistId? }` | the watch page (queue, lyrics and related tabs) |
| `player` | `{ video_id }` | playback data |
| `search` | `{ query, params? }` | search results |
| `music/get_search_suggestions` | `{ input }` | suggestions |
| `account/account_menu` | `{}` | the account menu (signed in) |

## Coming from ytmusicapi

This is `_send_request` in ytmusicapi. See the [migration guide](/guide/migration).

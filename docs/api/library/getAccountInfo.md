---
title: getAccountInfo
summary: "The signed-in account's name, handle and photo"
auth: required
order: 16
---

# `getAccountInfo`

<MethodInfo />

The signed-in account: `accountName`, `channelHandle` (e.g. `"@name"`, or `null`) and `accountPhotoUrl`. [`npx yt-music-node verify`](/guide/cli#verify) uses this to check a session.

```ts
const { accountName, channelHandle } = await ytm.getAccountInfo();
```

## Reference

```ts
getAccountInfo(options?: CallOptions): Promise<AccountInfo>
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`AccountInfo`](/reference/interfaces/AccountInfo).

## Coming from ytmusicapi

This is `get_account_info` in ytmusicapi. See the [migration guide](/guide/migration).

---
title: getUser
summary: "A user's page"
auth: none
order: 4
---

# `getUser`

<MethodInfo />

A user's channel page: `name`, and `playlists` and `videos` sections.

```ts
const user = await ytm.getUser("UC44hbeRoCZVVMVg5z0FfIww");
console.log(user.name, user.playlists?.results.map((p) => p.title));
```

## Reference

```ts
getUser(channelId: string, options?: CallOptions): Promise<User>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `channelId` | `string` | yes | the user's channel id (`UC…`) |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`User`](/reference/interfaces/User).

## Example output

<details class="example"><summary>Example output</summary>

<<< @/examples/user.json

</details>

## Coming from ytmusicapi

This is `get_user` in ytmusicapi. See the [migration guide](/guide/migration).

---
title: deleteUploadEntity
summary: "Delete an upload"
auth: required
write: true
order: 7
---

# `deleteUploadEntity`

<MethodInfo />

Deletes an uploaded song or album. Pass a song's `entityId`, or an upload album's `browseId`.

```ts
const uploads = await ytm.getLibraryUploadSongs({ limit: null });
for (const song of uploads.filter((s) => s.title?.startsWith("demo"))) {
  await ytm.deleteUploadEntity(song.entityId);
}
```

## Reference

```ts
deleteUploadEntity(entityId: string, options?: CallOptions): Promise<WriteStatus>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `entityId` | `string` | yes | the `entityId` of an uploaded song or album |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`WriteStatus`](/reference/type-aliases/WriteStatus): `"STATUS_SUCCEEDED"`, or the error from YouTube's response.

## Coming from ytmusicapi

This is `delete_upload_entity` in ytmusicapi. See the [migration guide](/guide/migration).

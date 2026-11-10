---
title: uploadSong
summary: "Upload an audio file"
auth: required
write: true
order: 1
---

# `uploadSong`

<MethodInfo />

Uploads an audio file. Pass a file path (Node.js), or the data and a file name:

- Supported formats: `mp3`, `m4a`, `wma`, `flac`, `ogg` (`SUPPORTED_UPLOAD_TYPES`), with case-insensitive extensions.
- Maximum size: 300 MB (`MAX_UPLOAD_SIZE`).
- Paths are streamed from disk, not read into memory first.

```ts
// from a path
await ytm.uploadSong("./music/my-song.mp3");

// from memory, e.g. a download or a form upload
const data = new Uint8Array(await (await fetch("https://example.com/song.mp3")).arrayBuffer());
await ytm.uploadSong({ data, filename: "song.mp3" });
```

YouTube reads title, artist and album from the file's tags (ID3 for MP3), so tag your files before uploading. The upload artist and album listings are built from those tags.

::: info Processing takes time
`uploadSong` resolves when YouTube has the file. Processing takes about a minute or more before the song shows up in `getLibraryUploadSongs`.
:::

## Reference

```ts
uploadSong(source: string | { data: Blob | Uint8Array; filename: string }, options?: UploadSongOptions): Promise<"STATUS_SUCCEEDED">
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `source` | `string \| { data: Blob \| Uint8Array; filename: string }` | yes | a file path, or `{ data, filename }` with the file's bytes |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `timeoutMs` | `number` | 10 minutes | timeout of the upload request (the client's `timeoutMs` is too short for large files) |
| `signal` | `AbortSignal` | – | cancels the upload |

### Returns

A promise of `"STATUS_SUCCEEDED"`.

### Errors

| Error | When |
|---|---|
| `YTMusicUserError` | the file doesn't exist, the format isn't supported or it's too large |
| `YTMusicServerError` with `status: 409` | this exact file is already uploaded |
| `YTMusicServerError` | either upload request failed |

## Coming from ytmusicapi

This is `upload_song` in ytmusicapi. See the [migration guide](/guide/migration).

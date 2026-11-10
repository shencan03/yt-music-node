# Uploads

Upload your own music files to YouTube Music, and manage them. Everything here needs auth.

## `uploadSong`

<MethodInfo name="uploadSong" auth="required" write />

```ts
uploadSong(source: string | { data: Blob | Uint8Array; filename: string }, options?: UploadSongOptions): Promise<"STATUS_SUCCEEDED">
```

Uploads an audio file. Pass a file path (Node.js), or the data and a file name:

| Option | Type | Default | Description |
|---|---|---|---|
| `timeoutMs` | `number` | 10 minutes | timeout of the upload request (the client's `timeoutMs` is too short for large files) |
| `signal` | `AbortSignal` | – | cancels the upload |

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

**Throws:**

| Error | When |
|---|---|
| `YTMusicUserError` | the file doesn't exist, the format isn't supported or it's too large |
| `YTMusicServerError` with `status: 409` | this exact file is already uploaded |
| `YTMusicServerError` | either upload request failed |

::: info Processing takes time
`uploadSong` resolves when YouTube has the file. Processing takes about a minute or more before the song shows up in `getLibraryUploadSongs`.
:::

## `getLibraryUploadSongs`

<MethodInfo name="getLibraryUploadSongs" auth="required" />

```ts
getLibraryUploadSongs(options?: LibraryOptions): Promise<UploadedSong[]>
```

Your uploaded songs, with `entityId` (to delete), `videoId` (to play), `title`, `artists`, `album`, `duration`, `duration_seconds`, `likeStatus` and `thumbnails`. Takes the [library listing options](/api/library#library-listings).

```ts
const uploads = await ytm.getLibraryUploadSongs({ limit: null, order: "recently_added" });
```

## `getLibraryUploadAlbums`

<MethodInfo name="getLibraryUploadAlbums" auth="required" />

```ts
getLibraryUploadAlbums(options?: LibraryOptions): Promise<AlbumSummary[]>
```

Albums of your uploaded songs. Use their `browseId` with `getLibraryUploadAlbum`.

## `getLibraryUploadArtists`

<MethodInfo name="getLibraryUploadArtists" auth="required" />

```ts
getLibraryUploadArtists(options?: LibraryOptions): Promise<LibraryArtist[]>
```

Artists of your uploaded songs. Use their `browseId` with `getLibraryUploadArtist`.

## `getLibraryUploadArtist`

<MethodInfo name="getLibraryUploadArtist" auth="required" />

```ts
getLibraryUploadArtist(browseId: string, options?: { limit?: number | null }): Promise<UploadedSong[]>
```

Your uploaded songs by one artist. `limit` defaults to `25`.

## `getLibraryUploadAlbum`

<MethodInfo name="getLibraryUploadAlbum" auth="required" />

```ts
getLibraryUploadAlbum(browseId: string, options?: CallOptions): Promise<UploadedAlbum>
```

One album of uploaded songs: `title`, `type`, `thumbnails`, `trackCount`, `duration`, `duration_seconds`, `audioPlaylistId` and `tracks`.

## `deleteUploadEntity`

<MethodInfo name="deleteUploadEntity" auth="required" write />

```ts
deleteUploadEntity(entityId: string, options?: CallOptions): Promise<WriteStatus>
```

Deletes an uploaded song or album. Pass a song's `entityId`, or an upload album's `browseId`.

```ts
const uploads = await ytm.getLibraryUploadSongs({ limit: null });
for (const song of uploads.filter((s) => s.title?.startsWith("demo"))) {
  await ytm.deleteUploadEntity(song.entityId);
}
```

Returns `"STATUS_SUCCEEDED"`, or the error from YouTube's response.

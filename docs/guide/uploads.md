# Upload songs

Upload your own audio files to YouTube Music and manage them. Needs a [signed-in client](/authentication/).

## Upload a folder of songs

Uploads every supported file in a folder and skips files that are already uploaded (HTTP 409):

```ts
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { SUPPORTED_UPLOAD_TYPES, YTMusic, YTMusicServerError } from "yt-music-node";

const ytm = await YTMusic.fromAuthFile("browser.json");
const dir = "./music";

for (const name of await readdir(dir)) {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (!(SUPPORTED_UPLOAD_TYPES as readonly string[]).includes(extension)) continue;
  try {
    await ytm.uploadSong(join(dir, name));
    console.log("uploaded", name);
  } catch (error) {
    if (error instanceof YTMusicServerError && error.status === 409) console.log("already uploaded", name);
    else throw error;
  }
}
```

Uploaded songs take a while (often a minute or more) to be processed before they appear in `getLibraryUploadSongs`.

## Tag your files first

YouTube reads title, artist and album from the file's tags (ID3 for MP3). The upload artist and album listings are built from those tags, so tag files before uploading. [`uploadSong`](/api/uploads/uploadSong) lists the supported formats and the size limit.

## Next steps

- [Uploads API](/api/uploads/): list, inspect and delete uploads
- [Limitations](/guide/limitations): what isn't tested live

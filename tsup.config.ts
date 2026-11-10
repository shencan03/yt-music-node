import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "node22",
    platform: "neutral",
    treeshake: true,
    // keep `node:` specifiers (dynamic imports in fromAuthFile and uploadSong), required by Deno;
    // the neutral platform does not know Node built-ins, so mark them external
    removeNodeProtocol: false,
    external: [/^node:/],
  },
  {
    // the setup CLI (bin/yt-music-node.js), Node.js only
    entry: ["src/cli.ts"],
    format: ["esm"],
    sourcemap: true,
    target: "node22",
    platform: "node",
    removeNodeProtocol: false,
  },
]);

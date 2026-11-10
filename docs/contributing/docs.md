# Writing docs

This site is built with [VitePress](https://vitepress.dev) from `docs/`. The type reference is generated with [TypeDoc](https://typedoc.org).

```sh
npm run docs:dev      # local site with hot reload (generates the reference first)
npm run docs:build    # static site in docs/.vitepress/dist
npm run docs:check    # what CI checks
```

## What `docs:check` checks

1. **TSDoc on every export.** TypeDoc runs with `notDocumented` validation, and warnings are errors. An undocumented export fails the build.
2. **The coverage matrix is current, and every method is documented.** `scripts/docs-coverage.ts --check` fails if a public method has no page at `docs/api/<area>/<methodName>.md`, or if `docs/contributing/coverage.md` is out of date (`npm run docs:coverage` regenerates it).
3. **Every TypeScript example compiles.** `scripts/docs-typecheck.ts` extracts each ` ```ts ` block and typechecks it against the source. Blocks that use `ytm` without creating it get a `declare const ytm: YTMusic`. Put `<!-- no-check -->` on the line before a block to skip it (for example for partial snippets). Method signature blocks are skipped automatically.
4. **No dead links.** The VitePress build fails on broken internal links.

## Method pages

Each method has its own page, `docs/api/<area>/<methodName>.md`, with the same sections in the same order. The areas and their order are in `docs/.vitepress/api-areas.ts`. The sidebar, the area index pages and the tables on the [API overview](/api/) are generated from the pages' frontmatter, so adding a page is all it takes.

````md
---
title: methodName
summary: "Short phrase for the method tables"
auth: none # none | optional (more data when signed in) | required
write: true # only for methods that change the account
upstream: _name # only when the ytmusicapi name isn't the snake_case form of title
order: 3 # position in the area
---

# `methodName`

<MethodInfo />

What it does, in one or two sentences.

```ts
// a short, typed example
```

## Reference

```ts
methodName(arg: string, options?: Options): Promise<Result>
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signal` | `AbortSignal` | – | cancels the call |

### Returns

A promise of [`Result`](/reference/interfaces/Result).

### Errors

Only the errors specific to this method.

## Example output

<details class="example"><summary>Example output</summary>

<<< @/examples/method-name.json

</details>

## Coming from ytmusicapi

This is `method_name` in ytmusicapi. See the [migration guide](/guide/migration).
````

`<MethodInfo />` reads `auth` and `write` from the frontmatter and renders the badges. Callouts (`::: info`, `::: warning`) go right after the example. Old links of the form `/api/<area>#<methodname>` are redirected to the method page by the theme.

## Example outputs

`docs/examples/*.json` are real responses, recorded signed out by `scripts/doc-examples.ts` and trimmed: arrays keep their first items plus a `"… N more"` marker, thumbnail lists keep one entry, and long strings are cut. Lyric texts are replaced, because lyrics are copyrighted. Regenerate them when YouTube changes a layout:

```sh
npm run docs:examples
```

**Never commit output from a signed-in client.** It contains account names, playlists and history.

## Style

- Write for someone who hasn't used ytmusicapi.
- Show code that runs, with real ids.
- Say what's verified and what isn't. If a behavior wasn't tested, don't claim it.
- Don't put credentials, real account names or personal ids in examples.

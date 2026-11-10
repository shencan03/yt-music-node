/**
 * Pagination helpers. Port of ytmusicapi/continuations.py.
 *
 * Every style is exposed as an async generator that yields one parsed page at a time, so callers can
 * stream results (`for await`) or collect them with {@link collect}. The `get*` functions mirror the
 * upstream signatures and limit semantics.
 */
import { nav } from "./nav.ts";
import type { JsonObject } from "./types/json.ts";

/** Sends a continuation request whose token goes in the query string. */
export type RequestFn = (additionalParams: string) => Promise<any>;
/** Sends a continuation request whose token goes in the body. */
export type RequestBodyFn = (body: JsonObject) => Promise<any>;
export type ParseFn = (items: any[]) => any[];

export const CONTINUATION_TOKEN = [
  "continuationItemRenderer",
  "continuationEndpoint",
  "continuationCommand",
  "token",
] as const;
export const COMMAND_EXECUTOR_COMMANDS = [
  "continuationItemRenderer",
  "continuationEndpoint",
  "commandExecutorCommand",
  "commands",
] as const;
export const CONTINUATION_ITEMS = [
  "onResponseReceivedActions",
  0,
  "appendContinuationItemsAction",
  "continuationItems",
] as const;

/**
 * Collects pages until at least `limit` items were gathered (`null`/`undefined` = everything).
 * Like upstream, the result may contain more than `limit` items; callers trim where upstream does.
 */
export async function collect<T>(pages: AsyncIterable<T[]>, limit?: number | null): Promise<T[]> {
  const items: T[] = [];
  if (limit != null && limit <= 0) return items;
  for await (const page of pages) {
    items.push(...page);
    if (limit != null && items.length >= limit) break;
  }
  return items;
}

// ---- 2025-style continuations (continuationItemRenderer, token sent in the body) ----------------

/** Token of a trailing `continuationItemRenderer`, if any. */
export function getContinuationToken(results: readonly any[]): string | undefined {
  // upstream indexes results[-1] unguarded and raises IndexError on an empty list
  const last = results.at(-1);
  if (last === undefined) return undefined;

  const token = nav(last, CONTINUATION_TOKEN, true);
  if (token) return token as string;

  // continuation tokens may be nested in a commandExecutorCommand list
  // (alongside playlistVotingRefreshPopupCommand, for example)
  const commands: any[] = nav(last, COMMAND_EXECUTOR_COMMANDS, true) ?? [];
  for (const command of commands) {
    if (nav(command, ["continuationCommand", "request"], true) === "CONTINUATION_REQUEST_TYPE_BROWSE") {
      return nav(command, ["continuationCommand", "token"]) as string;
    }
  }
  return undefined;
}

export async function* iterContinuations2025(
  results: any,
  requestFn: RequestBodyFn,
  parseFn: ParseFn,
): AsyncGenerator<any[], void, undefined> {
  let token = getContinuationToken(results.contents);
  while (token) {
    const response = await requestFn({ continuation: token });
    const continuationItems: any[] | undefined = nav(response, CONTINUATION_ITEMS, true);
    if (!continuationItems || continuationItems.length === 0) break;

    const contents = parseFn(continuationItems);
    if (contents.length === 0) break;
    yield contents;
    token = getContinuationToken(continuationItems);
  }
}

export function getContinuations2025(
  results: any,
  limit: number | null | undefined,
  requestFn: RequestBodyFn,
  parseFn: ParseFn,
): Promise<any[]> {
  return collect(iterContinuations2025(results, requestFn, parseFn), limit);
}

// ---- legacy continuations (continuations[0].next<X>ContinuationData, token in the query string) --

export interface ContinuationOptions {
  /** Rarely used: reads the token from `next<ctokenPath>ContinuationData`. */
  ctokenPath?: string;
  /** Fixed params for every request instead of the token from each response. */
  additionalParams?: string;
}

export async function* iterContinuations(
  results: any,
  continuationType: string,
  requestFn: RequestFn,
  parseFn: ParseFn,
  options: ContinuationOptions = {},
): AsyncGenerator<any[], void, undefined> {
  const { ctokenPath = "", additionalParams } = options;
  while (hasKey(results, "continuations")) {
    const params = additionalParams || getContinuationParams(results, ctokenPath);
    const response = await requestFn(params);
    if (!hasKey(response, "continuationContents")) break;
    results = response.continuationContents[continuationType];

    const contents = getContinuationContents(results, parseFn);
    if (contents.length === 0) break;
    yield contents;
  }
}

/**
 * @param limit minimum number of items to retrieve; `null`/`undefined` retrieves everything
 */
export function getContinuations(
  results: any,
  continuationType: string,
  limit: number | null | undefined,
  requestFn: RequestFn,
  parseFn: ParseFn,
  options: ContinuationOptions = {},
): Promise<any[]> {
  return collect(iterContinuations(results, continuationType, requestFn, parseFn, options), limit);
}

/**
 * Reloadable continuations only exist on the playlist page (suggestions). Every request re-sends the
 * same reload token, and each response is a fresh batch.
 */
export function iterReloadableContinuations(
  results: any,
  continuationType: string,
  requestFn: RequestFn,
  parseFn: ParseFn,
): AsyncGenerator<any[], void, undefined> {
  const additionalParams = getReloadableContinuationParams(results);
  return iterContinuations(results, continuationType, requestFn, parseFn, { additionalParams });
}

export function getReloadableContinuations(
  results: any,
  continuationType: string,
  limit: number | null | undefined,
  requestFn: RequestFn,
  parseFn: ParseFn,
): Promise<any[]> {
  return collect(iterReloadableContinuations(results, continuationType, requestFn, parseFn), limit);
}

/**
 * Like {@link iterContinuations}, but re-sends a request (up to `maxRetries` times) while the page
 * holds fewer items than expected. YouTube sometimes returns short pages that a retry fills.
 */
export async function* iterValidatedContinuations(
  results: any,
  continuationType: string,
  limit: number,
  perPage: number,
  requestFn: RequestFn,
  parseFn: ParseFn,
  ctokenPath = "",
  maxRetries = 3,
): AsyncGenerator<any[], void, undefined> {
  let count = 0;
  let emptyPages = 0;
  while (hasKey(results, "continuations") && count < limit) {
    const params = getContinuationParams(results, ctokenPath);
    const expected = Math.min(perPage, limit - count);
    const parse = (response: any) => {
      const pageResults = nav(response, ["continuationContents", continuationType]);
      return { results: pageResults, parsed: getContinuationContents(pageResults, parseFn) };
    };

    let best = parse(await requestFn(params));
    for (let retry = 0; best.parsed.length < expected && retry < maxRetries; retry++) {
      const attempt = parse(await requestFn(params));
      if (attempt.parsed.length > best.parsed.length) best = attempt;
    }

    results = best.results;
    count += best.parsed.length;
    if (best.parsed.length === 0) {
      // upstream has no guard: a server that keeps answering with empty pages plus a continuation
      // token keeps it requesting indefinitely
      if (++emptyPages >= maxRetries) break;
      continue;
    }
    emptyPages = 0;
    yield best.parsed;
  }
}

export function getValidatedContinuations(
  results: any,
  continuationType: string,
  limit: number,
  perPage: number,
  requestFn: RequestFn,
  parseFn: ParseFn,
  ctokenPath = "",
): Promise<any[]> {
  return collect(
    iterValidatedContinuations(results, continuationType, limit, perPage, requestFn, parseFn, ctokenPath),
  );
}

export function getContinuationParams(results: any, ctokenPath = ""): string {
  const ctoken = nav(results, ["continuations", 0, `next${ctokenPath}ContinuationData`, "continuation"]);
  return getContinuationString(ctoken);
}

export function getReloadableContinuationParams(results: any): string {
  const ctoken = nav(results, ["continuations", 0, "reloadContinuationData", "continuation"]);
  return getContinuationString(ctoken);
}

export function getContinuationString(ctoken: string): string {
  // sent verbatim like upstream: tokens may already be percent-encoded
  return `&ctoken=${ctoken}&continuation=${ctoken}`;
}

export function getContinuationContents(continuation: any, parseFn: ParseFn): any[] {
  for (const term of ["contents", "items"]) {
    if (hasKey(continuation, term)) return parseFn(continuation[term]);
  }
  return [];
}

function hasKey(value: unknown, key: string): value is Record<string, any> {
  return value !== null && typeof value === "object" && Object.hasOwn(value, key);
}

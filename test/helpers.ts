import type { FetchLike } from "../src/http.ts";

export interface RecordedRequest {
  url: string;
  method: string;
  headers: Headers;
  body: string | undefined;
}

export type Responder = (request: RecordedRequest, index: number) => Response | Promise<Response>;

/** A fetch fake that records requests and answers through `responder`. Honors abort signals. */
export function fakeFetch(responder: Responder): FetchLike & { requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];
  const fn = (async (input: string, init: RequestInit) => {
    const request: RecordedRequest = {
      url: input,
      method: init.method ?? "GET",
      headers: new Headers(init.headers),
      body: typeof init.body === "string" ? init.body : undefined,
    };
    requests.push(request);
    const signal = init.signal;
    signal?.throwIfAborted();
    const pending = Promise.resolve(responder(request, requests.length - 1));
    if (!signal) return pending;
    return new Promise<Response>((resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      pending.then(resolve, reject);
    });
  }) as FetchLike & { requests: RecordedRequest[] };
  fn.requests = requests;
  return fn;
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    ...init,
    headers: { "content-type": "application/json", ...(init.headers as Record<string, string>) },
  });
}

export const HOMEPAGE = `<html><script>ytcfg.set({"VISITOR_DATA":"VISITOR123","OTHER":1});</script></html>`;

export function never(): Promise<Response> {
  return new Promise(() => {});
}

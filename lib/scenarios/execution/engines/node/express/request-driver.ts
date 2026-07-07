/* eslint-disable @typescript-eslint/no-explicit-any */
import { NodeExecError } from "@/lib/scenarios/execution/engines/node/diagnostics";
import type { ExpressApp, ExpressRequest, ExpressResponse } from "@/lib/scenarios/execution/engines/node/express/express-app";

/**
 * A tiny Supertest-style request driver. `request(app).get("/x")` builds an
 * in-memory request, runs it directly through the app's handler stack (no
 * socket, no listen, no ports), and resolves to a plain response object. The
 * chain object is a thenable, so `await request(app).post("/x").send({...})`
 * works without an explicit `.end()`.
 */

export interface DriverResponse {
  status: number;
  statusCode: number;
  headers: Record<string, string | string[]>;
  type: string;
  text: string;
  body: unknown;
}

function parseQuery(qs: string): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  if (!qs) return out;
  for (const pair of qs.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawVal = eq === -1 ? "" : pair.slice(eq + 1);
    let key: string;
    let val: string;
    try {
      key = decodeURIComponent(rawKey.replace(/\+/g, " "));
      val = decodeURIComponent(rawVal.replace(/\+/g, " "));
    } catch {
      key = rawKey;
      val = rawVal;
    }
    const existing = out[key];
    if (existing === undefined) out[key] = val;
    else if (Array.isArray(existing)) existing.push(val);
    else out[key] = [existing, val];
  }
  return out;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function buildReq(method: string, fullPath: string, headers: Record<string, string>, rawBody?: string): ExpressRequest {
  const qIdx = fullPath.indexOf("?");
  const path = qIdx === -1 ? fullPath : fullPath.slice(0, qIdx);
  const queryString = qIdx === -1 ? "" : fullPath.slice(qIdx + 1);
  const lowerHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lowerHeaders[k.toLowerCase()] = v;

  return {
    method,
    url: fullPath,
    originalUrl: fullPath,
    path: path || "/",
    query: parseQuery(queryString),
    params: {},
    headers: lowerHeaders,
    body: undefined,
    cookies: parseCookies(lowerHeaders["cookie"]),
    _rawBody: rawBody,
    get(name: string) {
      return lowerHeaders[name.toLowerCase()];
    },
  };
}

function buildRes(): ExpressResponse {
  const finishCbs: Array<() => void> = [];
  const res: ExpressResponse = {
    statusCode: 200,
    finished: false,
    headersSent: false,
    locals: {},
    _headers: {},
    _body: undefined,
    _raw: "",
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    setHeader(field: string, value: string) {
      res._headers[field.toLowerCase()] = value;
    },
    set(field: string | Record<string, string>, value?: string) {
      if (typeof field === "object") {
        for (const [k, v] of Object.entries(field)) res._headers[k.toLowerCase()] = v;
      } else {
        res._headers[field.toLowerCase()] = value as string;
      }
      return res;
    },
    get(field: string) {
      return res._headers[field.toLowerCase()];
    },
    type(t: string) {
      const map: Record<string, string> = {
        json: "application/json",
        html: "text/html",
        text: "text/plain",
      };
      res._headers["content-type"] = map[t] ?? t;
      return res;
    },
    json(body: unknown) {
      if (res._headers["content-type"] === undefined) res._headers["content-type"] = "application/json";
      res._body = body;
      res.end(JSON.stringify(body));
      return res;
    },
    send(body?: unknown) {
      if (body !== null && typeof body === "object") return res.json(body);
      if (res._headers["content-type"] === undefined) res._headers["content-type"] = "text/html";
      res.end(body == null ? "" : String(body));
      return res;
    },
    sendStatus(code: number) {
      res.status(code);
      res.send(String(code));
      return res;
    },
    cookie(name: string, value: string) {
      const cookie = `${name}=${value}`;
      const existing = res._headers["set-cookie"];
      if (existing === undefined) res._headers["set-cookie"] = [cookie];
      else if (Array.isArray(existing)) existing.push(cookie);
      else res._headers["set-cookie"] = [existing, cookie];
      return res;
    },
    end(data?: unknown) {
      if (res.finished) return;
      if (data != null) res._raw = typeof data === "string" ? data : String(data);
      res.finished = true;
      res.headersSent = true;
      for (const cb of finishCbs) cb();
    },
    _onFinish(cb: () => void) {
      if (res.finished) cb();
      else finishCbs.push(cb);
    },
  };
  return res;
}

function makeResponse(res: ExpressResponse): DriverResponse {
  const contentType = String(res._headers["content-type"] ?? "");
  let body: unknown = res._body;
  if (body === undefined) {
    if (contentType.includes("application/json") && res._raw) {
      try {
        body = JSON.parse(res._raw);
      } catch {
        body = res._raw;
      }
    } else {
      body = res._raw;
    }
  }
  return {
    status: res.statusCode,
    statusCode: res.statusCode,
    headers: res._headers,
    type: contentType.split(";")[0]!.trim(),
    text: res._raw,
    body,
  };
}

function dispatch(app: ExpressApp, req: ExpressRequest, res: ExpressResponse): Promise<DriverResponse> {
  if (!app || typeof (app as any).handle !== "function") {
    return Promise.reject(
      new NodeExecError(
        "runtime",
        "request(app): the imported value is not an Express app. Make sure the workspace module does `export default app`.",
      ),
    );
  }
  return new Promise<DriverResponse>((resolve, reject) => {
    res._onFinish(() => resolve(makeResponse(res)));
    try {
      app.handle(req, res, (err?: unknown) => {
        if (res.finished) return;
        if (err) {
          const status = (err as any)?.status ?? 500;
          res.status(status);
          res.set("content-type", "text/plain");
          res.end(String((err as any)?.message ?? err));
        } else {
          res.status(404);
          res.set("content-type", "text/plain");
          res.end("Not Found");
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

class PendingRequest implements PromiseLike<DriverResponse> {
  private headers: Record<string, string> = {};
  private rawBody: string | undefined;
  private queryString = "";

  constructor(
    private readonly app: ExpressApp,
    private readonly method: string,
    private path: string,
  ) {}

  set(field: string | Record<string, string>, value?: string): this {
    if (typeof field === "object") {
      for (const [k, v] of Object.entries(field)) this.headers[k] = v;
    } else {
      this.headers[field] = value ?? "";
    }
    return this;
  }

  query(params: Record<string, unknown>): this {
    const parts = Object.entries(params).map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    );
    this.queryString = this.queryString ? `${this.queryString}&${parts.join("&")}` : parts.join("&");
    return this;
  }

  send(body?: unknown): this {
    if (typeof body === "string") {
      this.rawBody = body;
    } else if (body !== undefined) {
      this.rawBody = JSON.stringify(body);
      if (!this.hasHeader("content-type")) this.headers["Content-Type"] = "application/json";
    }
    return this;
  }

  private hasHeader(name: string): boolean {
    return Object.keys(this.headers).some((h) => h.toLowerCase() === name);
  }

  private fullPath(): string {
    if (!this.queryString) return this.path;
    return this.path.includes("?") ? `${this.path}&${this.queryString}` : `${this.path}?${this.queryString}`;
  }

  private run(): Promise<DriverResponse> {
    const req = buildReq(this.method, this.fullPath(), this.headers, this.rawBody);
    const res = buildRes();
    return dispatch(this.app, req, res);
  }

  then<TResult1 = DriverResponse, TResult2 = never>(
    onFulfilled?: ((value: DriverResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onFulfilled, onRejected);
  }

  catch<TResult = never>(onRejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null): Promise<DriverResponse | TResult> {
    return this.run().catch(onRejected);
  }
}

export interface RequestAgent {
  get(path: string): PendingRequest;
  post(path: string): PendingRequest;
  put(path: string): PendingRequest;
  patch(path: string): PendingRequest;
  delete(path: string): PendingRequest;
}

/** Build the `request` global. Fresh per run (stateless, but kept per-run for
 *  parity with the rest of the isolated sandbox). */
export function createRequest(): (app: ExpressApp) => RequestAgent {
  return (app: ExpressApp): RequestAgent => ({
    get: (p) => new PendingRequest(app, "GET", p),
    post: (p) => new PendingRequest(app, "POST", p),
    put: (p) => new PendingRequest(app, "PUT", p),
    patch: (p) => new PendingRequest(app, "PATCH", p),
    delete: (p) => new PendingRequest(app, "DELETE", p),
  });
}

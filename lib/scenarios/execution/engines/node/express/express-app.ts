/* eslint-disable @typescript-eslint/no-explicit-any */
import { NodeExecError } from "@/lib/scenarios/execution/engines/node/diagnostics";

/**
 * A tiny, in-memory Express-compatible implementation — the "bundled Express"
 * the Node engine exposes to candidate code. It supports the common REST/CRUD
 * authoring surface (app/Router, method routes, middleware, next(), error
 * middleware, route params, nested routers, express.json()) and NOTHING that
 * needs a socket. `app.listen()`/`createServer`/`express.static` throw a
 * structured "unsupported" diagnostic instead of touching the network.
 *
 * It is pure host JavaScript (no Node built-ins), so it runs inside the sandbox
 * vm context and stays fully synchronous/in-memory. Requests are driven by the
 * companion request-driver, never by real HTTP.
 */

export interface ExpressRequest {
  method: string;
  url: string;
  originalUrl: string;
  path: string;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
  cookies: Record<string, string>;
  _rawBody?: string;
  get(name: string): string | undefined;
}

export interface ExpressResponse {
  statusCode: number;
  finished: boolean;
  locals: Record<string, unknown>;
  headersSent: boolean;
  _headers: Record<string, string | string[]>;
  _body: unknown;
  _raw: string;
  status(code: number): ExpressResponse;
  set(field: string | Record<string, string>, value?: string): ExpressResponse;
  setHeader(field: string, value: string): void;
  get(field: string): string | string[] | undefined;
  type(t: string): ExpressResponse;
  json(body: unknown): ExpressResponse;
  send(body?: unknown): ExpressResponse;
  sendStatus(code: number): ExpressResponse;
  end(data?: unknown): void;
  cookie(name: string, value: string, opts?: Record<string, unknown>): ExpressResponse;
  _onFinish(cb: () => void): void;
}

type NextFn = (err?: unknown) => void;
type Handler = (req: ExpressRequest, res: ExpressResponse, next: NextFn) => unknown;
type ErrorHandler = (err: unknown, req: ExpressRequest, res: ExpressResponse, next: NextFn) => unknown;

interface Layer {
  method: string | null; // "GET".. | "ALL" | null(use/middleware)
  matcher: { regex: RegExp; keys: string[] };
  handle: any;
  isError: boolean;
  isMount: boolean;
}

export interface RouterLike {
  __isRouter: true;
  layers: Layer[];
  use(...args: any[]): RouterLike;
  get(path: string, ...handlers: Handler[]): RouterLike;
  post(path: string, ...handlers: Handler[]): RouterLike;
  put(path: string, ...handlers: Handler[]): RouterLike;
  patch(path: string, ...handlers: Handler[]): RouterLike;
  delete(path: string, ...handlers: Handler[]): RouterLike;
  all(path: string, ...handlers: Handler[]): RouterLike;
  handle(req: ExpressRequest, res: ExpressResponse, done: NextFn): void;
}

const HTTP_ERR = (status: number, message: string) => Object.assign(new Error(message), { status });

/** Convert an Express path (`/users/:id`) to a matcher. `end` anchors the match
 *  (routes) vs. matches a prefix (middleware / mounted routers). */
function compilePath(path: string, end: boolean): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  if (path === "/" || path === "") {
    return { regex: new RegExp(end ? "^/?$" : "^/?"), keys };
  }
  const parts = path.split("/").filter((s) => s.length > 0);
  const pattern =
    "/" +
    parts
      .map((seg) => {
        if (seg.startsWith(":")) {
          keys.push(seg.slice(1));
          return "([^/]+)";
        }
        if (seg === "*") return ".*";
        return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
  return { regex: new RegExp(end ? `^${pattern}/?$` : `^${pattern}(?=/|$)`), keys };
}

function isRouter(x: any): x is RouterLike {
  return !!x && typeof x === "object" && x.__isRouter === true;
}

function runStack(layers: Layer[], req: ExpressRequest, res: ExpressResponse, outerNext: NextFn): void {
  let i = 0;
  const savedParams = req.params;
  const next: NextFn = (err) => {
    if (res.finished) return;
    if (i >= layers.length) {
      req.params = savedParams;
      return outerNext(err);
    }
    const layer = layers[i++]!;
    const m = layer.matcher.regex.exec(req.path);
    if (!m) return next(err);
    if (layer.method && layer.method !== "ALL" && layer.method !== req.method) return next(err);
    if (err && !layer.isError) return next(err);
    if (!err && layer.isError) return next();

    if (layer.matcher.keys.length > 0) {
      const params = { ...req.params };
      layer.matcher.keys.forEach((k, idx) => {
        try {
          params[k] = decodeURIComponent(m[idx + 1]!);
        } catch {
          params[k] = m[idx + 1]!;
        }
      });
      req.params = params;
    }

    if (layer.isMount) {
      const prefix = m[0]!;
      const savedPath = req.path;
      let sub = savedPath.slice(prefix.length);
      if (!sub.startsWith("/")) sub = "/" + sub;
      req.path = sub;
      (layer.handle as RouterLike).handle(req, res, (e) => {
        req.path = savedPath;
        next(e);
      });
      return;
    }

    try {
      const ret = err
        ? (layer.handle as ErrorHandler)(err, req, res, next)
        : (layer.handle as Handler)(req, res, next);
      if (ret && typeof (ret as any).then === "function") {
        (ret as Promise<unknown>).then(undefined, (e) => next(e));
      }
    } catch (e) {
      next(e);
    }
  };
  next();
}

function createRouter(): RouterLike {
  const layers: Layer[] = [];

  const addRoute = (method: string, path: string, handlers: Handler[]) => {
    for (const h of handlers) {
      layers.push({ method, matcher: compilePath(path, true), handle: h, isError: false, isMount: false });
    }
  };

  const use = (...args: any[]) => {
    let path = "/";
    let handlers = args;
    if (typeof args[0] === "string") {
      path = args[0];
      handlers = args.slice(1);
    }
    for (const h of handlers) {
      if (isRouter(h)) {
        layers.push({ method: null, matcher: compilePath(path, false), handle: h, isError: false, isMount: true });
      } else if (typeof h === "function") {
        layers.push({ method: null, matcher: compilePath(path, false), handle: h, isError: h.length === 4, isMount: false });
      } else {
        throw new NodeExecError("runtime", "app.use() expects a middleware function or a router.");
      }
    }
    return router;
  };

  const router: RouterLike = {
    __isRouter: true,
    layers,
    use,
    get: (p, ...h) => (addRoute("GET", p, h), router),
    post: (p, ...h) => (addRoute("POST", p, h), router),
    put: (p, ...h) => (addRoute("PUT", p, h), router),
    patch: (p, ...h) => (addRoute("PATCH", p, h), router),
    delete: (p, ...h) => (addRoute("DELETE", p, h), router),
    all: (p, ...h) => (addRoute("ALL", p, h), router),
    handle: (req, res, done) => runStack(layers, req, res, done),
  };
  return router;
}

export interface ExpressApp extends RouterLike {
  listen(...args: any[]): never;
  set(key: string, value?: unknown): unknown;
  enable(key: string): ExpressApp;
  disable(key: string): ExpressApp;
  locals: Record<string, unknown>;
  settings: Record<string, unknown>;
}

function createApp(): ExpressApp {
  const router = createRouter();
  const settings: Record<string, unknown> = {};

  const app = {
    ...router,
    // Express overloads `get`: `app.get('/path', handler)` is a route;
    // `app.get('setting')` reads a setting.
    get(this: void, ...args: any[]): any {
      if (args.length >= 2 || typeof args[1] === "function") return (router.get as any)(...args);
      if (args.length === 1) return settings[args[0]];
      return (router.get as any)(...args);
    },
    listen(): never {
      throw new NodeExecError(
        "unsupported",
        "app.listen() is not supported — the Express engine runs entirely in memory. Export the app with `export default app` and drive it with request(app).",
      );
    },
    set(key: string, value?: unknown) {
      settings[key] = value;
      return app;
    },
    enable(key: string) {
      settings[key] = true;
      return app;
    },
    disable(key: string) {
      settings[key] = false;
      return app;
    },
    locals: {} as Record<string, unknown>,
    settings,
  } as unknown as ExpressApp;

  return app;
}

// ── body parsers ─────────────────────────────────────────────────────────────

function jsonParser(): Handler {
  return (req, _res, next) => {
    const ct = req.get("content-type") ?? "";
    if (ct.includes("application/json") && req._rawBody != null && req._rawBody !== "") {
      try {
        req.body = JSON.parse(req._rawBody);
      } catch {
        return next(HTTP_ERR(400, "Invalid JSON body"));
      }
    } else if (req.body === undefined) {
      req.body = {};
    }
    next();
  };
}

function urlencodedParser(): Handler {
  return (req, _res, next) => {
    const ct = req.get("content-type") ?? "";
    if (ct.includes("application/x-www-form-urlencoded") && req._rawBody) {
      const body: Record<string, string> = {};
      for (const pair of req._rawBody.split("&")) {
        const [k, v = ""] = pair.split("=");
        if (k) body[decodeURIComponent(k)] = decodeURIComponent(v);
      }
      req.body = body;
    } else if (req.body === undefined) {
      req.body = {};
    }
    next();
  };
}

export interface ExpressModule {
  (): ExpressApp;
  json(): Handler;
  urlencoded(): Handler;
  Router(): RouterLike;
  static(): never;
  default: ExpressModule;
  __esModule: true;
}

/** The value `require("express")` returns inside the sandbox. Fresh per run. */
export function createExpressModule(): ExpressModule {
  const express = function express(): ExpressApp {
    return createApp();
  } as unknown as ExpressModule;
  express.json = () => jsonParser();
  express.urlencoded = () => urlencodedParser();
  express.Router = () => createRouter();
  express.static = () => {
    throw new NodeExecError("unsupported", "express.static() is not supported (no filesystem access).");
  };
  // Support every TS import style (default, named, namespace) under esModuleInterop.
  express.default = express;
  express.__esModule = true;
  return express;
}

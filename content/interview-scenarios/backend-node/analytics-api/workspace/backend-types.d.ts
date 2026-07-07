// Editor/type declarations for modules provided by the backend verification engine.
// Runtime implementations are injected by the Node/Express/SQLite engine.

declare module "express" {
  export interface Request {
    method: string;
    url: string;
    originalUrl: string;
    path: string;
    query: Record<string, string | string[]>;
    params: Record<string, string>;
    headers: Record<string, string>;
    body: unknown;
    cookies: Record<string, string>;
    get(name: string): string | undefined;
  }
  export interface Response {
    statusCode: number;
    status(code: number): Response;
    set(field: string | Record<string, string>, value?: string): Response;
    json(body: unknown): Response;
    send(body?: unknown): Response;
    sendStatus(code: number): Response;
    end(data?: unknown): void;
  }
  export type NextFunction = (err?: unknown) => void;
  export type RequestHandler = (req: Request, res: Response, next: NextFunction) => unknown;
  export interface Router {
    use(path: string, ...handlers: RequestHandler[]): Router;
    use(...handlers: RequestHandler[]): Router;
    get(path: string, ...handlers: RequestHandler[]): Router;
    post(path: string, ...handlers: RequestHandler[]): Router;
    put(path: string, ...handlers: RequestHandler[]): Router;
    patch(path: string, ...handlers: RequestHandler[]): Router;
    delete(path: string, ...handlers: RequestHandler[]): Router;
    all(path: string, ...handlers: RequestHandler[]): Router;
  }
  export interface Express extends Router {
    listen(...args: unknown[]): never;
  }
  export interface ExpressFactory {
    (): Express;
    json(): RequestHandler;
    urlencoded(): RequestHandler;
    Router(): Router;
  }
  const express: ExpressFactory;
  export default express;
}

declare module "@ace/db" {
  export type SqlParams = unknown[] | Record<string, unknown> | undefined;
  export interface DbApi {
    run(sql: string, params?: SqlParams): { changes: number; lastInsertRowid: number };
    get<T = Record<string, unknown>>(sql: string, params?: SqlParams): T | undefined;
    all<T = Record<string, unknown>>(sql: string, params?: SqlParams): T[];
    exec(sql: string): void;
    transaction<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R;
  }
  export const db: DbApi;
  export default db;
}

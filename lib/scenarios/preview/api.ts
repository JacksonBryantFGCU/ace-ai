export const API_PREVIEW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export type ApiPreviewMethod = (typeof API_PREVIEW_METHODS)[number];

export interface ApiPreviewExample {
  id: string;
  label: string;
  method: ApiPreviewMethod;
  path: string;
  body?: unknown;
}

export interface ApiPreviewConfig {
  title?: string;
  defaultExampleId?: string;
  examples: ApiPreviewExample[];
}

export interface ApiPreviewRequestConfig {
  method: ApiPreviewMethod;
  path: string;
  bodyText?: string;
}

export interface ApiPreviewResponse {
  status: number;
  statusCode: number;
  headers: Record<string, string | string[]>;
  type: string;
  text: string;
  body: unknown;
}

export interface ApiPreviewError {
  kind:
    | "invalid-json"
    | "unsupported"
    | "schema"
    | "seed"
    | "compile"
    | "import"
    | "runtime"
    | "sqlite"
    | "harness";
  message: string;
  details?: string;
  file?: string;
  line?: number;
}

export type ApiPreviewResult =
  | {
      ok: true;
      response: ApiPreviewResponse;
      durationMs: number;
      reset: true;
    }
  | {
      ok: false;
      error: ApiPreviewError;
      durationMs: number;
      reset: true;
    };

export function isApiPreviewMethod(value: string): value is ApiPreviewMethod {
  return API_PREVIEW_METHODS.includes(value as ApiPreviewMethod);
}

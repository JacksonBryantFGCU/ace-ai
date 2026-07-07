/**
 * What an execution engine can DO — advertised up front, independent of whether
 * execution is implemented yet. The UI and future tooling read these to decide
 * what to offer (e.g. only show a live Preview for engines that support it), so
 * a placeholder engine still declares its INTENDED capabilities.
 */
export interface EngineCapabilities {
  /** A live in-browser preview of the running component/app (React today). */
  supportsPreview: boolean;
  /** Executes inside a browser/DOM environment. */
  supportsBrowser: boolean;
  /** Candidate code may read/write a (virtual) filesystem. */
  supportsFilesystem: boolean;
  /** Candidate code may make network calls (real or mocked). */
  supportsNetwork: boolean;
  /** A database is provisioned for the exercise (SQL, ORMs, …). */
  supportsDatabase: boolean;
  /** Point-in-time state snapshots (for reset / time-travel / grading). */
  supportsSnapshots: boolean;
  /** An interactive terminal / process is available. */
  supportsTerminal: boolean;
  /** More than one editable workspace file. */
  supportsMultipleFiles: boolean;
}

/** Everything off — placeholders spread this and flip on what they intend to support. */
export const NO_CAPABILITIES: EngineCapabilities = {
  supportsPreview: false,
  supportsBrowser: false,
  supportsFilesystem: false,
  supportsNetwork: false,
  supportsDatabase: false,
  supportsSnapshots: false,
  supportsTerminal: false,
  supportsMultipleFiles: false,
};

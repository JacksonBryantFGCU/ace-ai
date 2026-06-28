/** Result of running user code against one test case. Ported from the legacy
 *  `useCodeExecution` / `codeExecutionService`. */
export interface TestResult {
  passed: boolean;
  actual: string;
  expected: string;
  error?: string;
}

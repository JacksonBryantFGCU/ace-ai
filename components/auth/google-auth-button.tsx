import { signInWithGoogle } from "@/actions/auth";

/** Multicolor Google "G" mark. */
function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.98 21.98 0 002 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

/**
 * "Continue with Google" — a server-action form (no client state; it redirects
 * to Google). Reused by login and signup; forwards `next`. Styled as a glass
 * OAuth button matching the legacy auth panel.
 *
 * Note: the legacy design also showed a GitHub button, but the new auth backend
 * only implements Google OAuth, so GitHub is intentionally omitted rather than
 * shown as a non-functional control.
 */
export function GoogleAuthButton({ next }: { next?: string }) {
  return (
    <form action={signInWithGoogle}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/60 bg-white/70 font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white/90"
      >
        <GoogleIcon />
        Continue with Google
      </button>
    </form>
  );
}

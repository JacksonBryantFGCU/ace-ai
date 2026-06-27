import { signInWithGoogle } from "@/actions/auth";
import { Button } from "@/components/ui/button";

/**
 * "Continue with Google" — a server-action form (no client state needed; it
 * redirects to Google). Reused by login and signup. Forwards `next`.
 */
export function GoogleAuthButton({ next }: { next?: string }) {
  return (
    <form action={signInWithGoogle}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Button type="submit" variant="outline" className="w-full">
        Continue with Google
      </Button>
    </form>
  );
}

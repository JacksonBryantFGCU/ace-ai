import type { Metadata } from "next";
import { redirectIfAuthenticated } from "@/server/auth";
import { safeNext } from "@/lib/auth-redirects";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  await redirectIfAuthenticated(safeNext(next));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Log in</CardTitle>
        <CardDescription>Welcome back to ACE.AI.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={next} errorParam={error} />
      </CardContent>
    </Card>
  );
}

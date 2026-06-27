import type { Metadata } from "next";
import { redirectIfAuthenticated } from "@/server/auth";
import { safeNext } from "@/lib/auth-redirects";
import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  await redirectIfAuthenticated(safeNext(next));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>Start practicing engineering interviews with ACE.AI.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm next={next} />
      </CardContent>
    </Card>
  );
}

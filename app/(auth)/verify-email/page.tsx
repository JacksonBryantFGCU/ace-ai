import type { Metadata } from "next";
import Link from "next/link";
import { redirectIfAuthenticated } from "@/server/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  await redirectIfAuthenticated();
  const { email } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Confirm your email</CardTitle>
        <CardDescription>
          We sent a confirmation link{email ? ` to ${email}` : ""}. Click it to activate your
          account, then log in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/login" className="text-foreground text-sm underline-offset-4 hover:underline">
          Back to log in
        </Link>
      </CardContent>
    </Card>
  );
}

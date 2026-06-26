import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="text-muted-foreground text-sm">
        {/* TODO(P2): server-read profile; updateRole server action. */}
        Profile and engineering role settings will live here.
      </p>
    </div>
  );
}

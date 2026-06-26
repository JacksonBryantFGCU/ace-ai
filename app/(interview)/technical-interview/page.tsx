import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Technical interview",
};

export default function TechnicalInterviewPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-center">
      <p className="text-muted-foreground text-sm">
        {/* TODO(P5): server-load problems → <TechnicalInterviewClient problems=... /> (Monaco + voice). */}
        The technical interview island (editor + voice) will mount here.
      </p>
    </div>
  );
}

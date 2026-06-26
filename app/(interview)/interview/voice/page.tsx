import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Behavioral interview",
};

export default function VoiceInterviewPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-center">
      <p className="text-muted-foreground text-sm">
        {/* TODO(P4): resolve config server-side → <VoiceInterviewClient config=... /> (Vapi island). */}
        The behavioral voice interview island will mount here.
      </p>
    </div>
  );
}

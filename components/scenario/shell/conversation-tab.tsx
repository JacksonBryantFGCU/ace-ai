"use client";

import { useEffect, useRef } from "react";
import { MessagesSquare } from "lucide-react";
import { shell } from "@/components/scenario/shell/tokens";
import type { ConversationEntry } from "@/lib/scenarios/conversation";

const clock = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/**
 * The Conversation panel tab: a read-only, live transcript of the interview —
 * interviewer/candidate utterances and narrated system notes as they arrive. There
 * is no text composer because the interview is driven by voice + the on-screen
 * controls, not free-text chat.
 */
export function ConversationTab({
  conversation,
  interviewerName,
}: {
  conversation: ConversationEntry[];
  interviewerName: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const initials = interviewerName.slice(0, 2).toUpperCase();

  // Follow the transcript as it grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.length]);

  const visible = conversation.filter(
    (e) => e.kind === "utterance" || e.kind === "system",
  );

  if (visible.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <MessagesSquare className="size-8" style={{ color: shell.textFainter }} />
        <p className="text-[13px]" style={{ color: shell.textFaint }}>
          Your conversation with {interviewerName} will appear here as you talk.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-4">
      {visible.map((entry, i) => {
        if (entry.kind === "system") {
          return (
            <div key={i} className="flex justify-center">
              <span
                className="rounded-xl px-3 py-1.5 text-[11px] leading-[1.45]"
                style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${shell.borderSoft}`, color: shell.textFaint }}
              >
                {entry.text}
              </span>
            </div>
          );
        }

        const isInterviewer = entry.role === "interviewer";
        return (
          <div key={i} className={`flex gap-2 ${isInterviewer ? "" : "flex-row-reverse"}`}>
            <div
              className="flex size-[26px] flex-none items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: isInterviewer ? shell.presenceAvatar : "linear-gradient(135deg,#3b82f6,#a855f7)" }}
            >
              {isInterviewer ? initials : "You".slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div
                className={`mb-[3px] text-[10.5px] font-semibold ${isInterviewer ? "" : "text-right"}`}
                style={{ color: isInterviewer ? shell.presenceSpeaking : shell.infoText }}
              >
                {isInterviewer ? interviewerName : "You"} · {clock(entry.at)}
              </div>
              <div
                className="rounded-xl px-[11px] py-[9px] text-[12.5px] leading-[1.5]"
                style={
                  isInterviewer
                    ? { background: "rgba(255,255,255,.04)", border: `1px solid ${shell.borderSoft}`, color: "#dbe0e7", borderTopLeftRadius: 3 }
                    : { background: shell.infoBg, border: "1px solid rgba(59,130,246,.22)", color: shell.titleText, borderTopRightRadius: 3 }
                }
              >
                {entry.text}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

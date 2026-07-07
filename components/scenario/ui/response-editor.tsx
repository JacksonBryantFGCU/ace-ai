"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

type SaveState = "saved" | "unsaved" | "saving";

/**
 * Autosaving textarea for discussion-step responses. Persists opportunistically
 * while typing (debounced) and flushes on unmount, so a candidate never loses work
 * by not blurring or by finishing the interview mid-sentence.
 *
 * Presentational + local UX state only — persistence goes through the same
 * `onSave` (the controller's `setResponse`); no runtime/controller change.
 */
export function ResponseEditor({
  initialValue,
  onSave,
  debounceMs = 600,
  placeholder,
}: {
  initialValue: string;
  onSave: (text: string) => void;
  debounceMs?: number;
  placeholder?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<SaveState>("saved");

  const valueRef = useRef(initialValue);
  const savedRef = useRef(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flipRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = (text: string) => {
    if (text === savedRef.current) {
      setStatus("saved");
      return;
    }
    onSave(text);
    savedRef.current = text;
    setStatus("saving");
    if (flipRef.current) clearTimeout(flipRef.current);
    flipRef.current = setTimeout(() => setStatus("saved"), 500);
  };

  const handleChange = (text: string) => {
    setValue(text);
    valueRef.current = text;
    setStatus(text === savedRef.current ? "saved" : "unsaved");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(text), debounceMs);
  };

  // Flush any pending edit on unmount (step change / completion) so nothing is lost.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (flipRef.current) clearTimeout(flipRef.current);
      if (valueRef.current !== savedRef.current) onSave(valueRef.current);
    };
  }, [onSave]);

  return (
    <div className="space-y-1.5">
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder ?? "Talk through your approach…"}
        rows={5}
        className="w-full resize-y rounded-md border border-white/15 bg-black/40 p-2 text-sm text-gray-100 outline-none focus:border-blue-400"
      />
      {value.trim().length > 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-end gap-1 text-xs text-gray-500"
        >
          {status === "saving" ? (
            <>
              <Loader2 className="size-3 animate-spin" /> Saving…
            </>
          ) : status === "unsaved" ? (
            <span className="text-amber-300/80">Unsaved changes</span>
          ) : (
            <>
              <Check className="size-3 text-green-400" /> Saved
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

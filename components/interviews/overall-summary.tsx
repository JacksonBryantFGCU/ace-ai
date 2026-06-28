import { scoreTone } from "@/lib/format";
import type { VapiAnalysisResult } from "@/types/interview";

const DIMENSIONS = [
  { key: "communication", label: "Communication" },
  { key: "technicalAccuracy", label: "Technical" },
  { key: "problemSolving", label: "Problem Solving" },
] as const;

/** Overall-summary card for the replay (dark): score dimensions + feedback lists. */
export function OverallSummary({ result }: { result: VapiAnalysisResult }) {
  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold text-white">Overall Summary</h3>
        <div className="flex gap-6 text-center">
          {DIMENSIONS.map(({ key, label }) => (
            <div key={key}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`text-lg font-semibold ${scoreTone(result[key])}`}>{result[key]}</p>
            </div>
          ))}
        </div>
      </div>

      <FeedbackList title="Strengths" dotClass="bg-green-400" items={result.strengths} />
      <FeedbackList title="Areas for Improvement" dotClass="bg-amber-400" items={result.improvements} />
      <FeedbackList title="Next Steps" dotClass="bg-blue-400" items={result.nextSteps} />
    </div>
  );
}

function FeedbackList({
  title,
  dotClass,
  items,
}: {
  title: string;
  dotClass: string;
  items?: string[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <span className={`size-2 rounded-full ${dotClass}`} />
        {title}
      </p>
      <ul className="space-y-1 pl-4 text-sm text-gray-300">
        {items.map((item, i) => (
          <li key={i} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

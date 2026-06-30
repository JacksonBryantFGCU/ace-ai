import { Check, Minus } from "lucide-react";
import type { PlanComparisonRow } from "@/lib/marketing/content";

/**
 * Renders a single Free/Pro cell. Booleans become a check (purple when the cell
 * is Pro-exclusive) or a muted dash; strings render verbatim.
 */
function Cell({ value, proAccent }: { value: boolean | string; proAccent: boolean }) {
  if (typeof value === "string") {
    return <span className="text-sm text-gray-500">{value}</span>;
  }
  if (value) {
    return (
      <Check
        aria-label="Included"
        className={`mx-auto size-5 ${proAccent ? "text-purple-600" : "text-gray-700"}`}
      />
    );
  }
  return <Minus aria-label="Not included" className="mx-auto size-5 text-gray-300" />;
}

/**
 * Feature-by-feature comparison table of the Free and Pro plans. Server
 * component; rows are passed in as props.
 */
export function PlanComparison({ rows }: { rows: PlanComparisonRow[] }) {
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-gray-100 shadow-sm">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-[#f5f4fa]">
            <th className="px-6 py-5 text-sm font-bold text-gray-900">Feature</th>
            <th className="px-6 py-5 text-center text-sm font-bold text-gray-900">Free</th>
            <th className="px-6 py-5 text-center text-sm font-bold text-purple-600">With a pass</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.feature} className={i % 2 === 1 ? "bg-[#faf9fc]" : "bg-white"}>
              <th
                scope="row"
                className="px-6 py-4 text-left text-sm font-normal text-gray-700"
              >
                {row.feature}
              </th>
              <td className="px-6 py-4 text-center align-middle">
                <Cell value={row.free} proAccent={false} />
              </td>
              <td className="px-6 py-4 text-center align-middle">
                <Cell value={row.pass} proAccent={row.free === false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

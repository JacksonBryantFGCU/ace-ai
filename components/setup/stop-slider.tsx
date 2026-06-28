import { Slider } from "@base-ui/react/slider";

/**
 * Discrete "stop" slider — a real, fully interactive slider (drag, track-click,
 * and keyboard) built on the Base UI `Slider` primitive, mapping its numeric
 * index back to the union-label config model. Same public API as before. Labels
 * are plain markers (no selected-state highlight); the thumb position conveys the
 * current value, matching the legacy design.
 */
export function StopSlider<T extends string>({
  label,
  options,
  value,
  onChange,
  optionLabel,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  optionLabel: (value: T) => string;
}) {
  const index = Math.max(0, options.indexOf(value));

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-gray-700">{label}</p>

      <Slider.Root
        value={index}
        onValueChange={(v) => {
          const i = typeof v === "number" ? v : v[0]!;
          onChange(options[i]!);
        }}
        min={0}
        max={options.length - 1}
        step={1}
      >
        <Slider.Control className="flex h-5 w-full touch-none items-center select-none">
          <Slider.Track className="relative h-2 w-full rounded-full bg-white/60">
            <Slider.Indicator className="rounded-full bg-gradient-to-r from-blue-400 to-blue-600" />
            <Slider.Thumb
              getAriaValueText={(_formatted, v) => optionLabel(options[v]!)}
              aria-label={label}
              className="size-5 rounded-full bg-white shadow-lg ring-1 ring-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>

      {/* Plain markers — no selected highlight; the thumb shows the value. */}
      <div className="mt-2 flex justify-between">
        {options.map((option) => (
          <span key={option} className="text-xs text-gray-600">
            {optionLabel(option)}
          </span>
        ))}
      </div>
    </div>
  );
}

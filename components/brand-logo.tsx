import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * ACE.AI logo — the real `public/ace-ai.png` asset, rendered with the legacy
 * treatment (80px box, scaled 1.5× from the left) so it matches the original
 * navbar lockup. The artwork is full-color, so it reads on both light and dark
 * surfaces without a variant.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/ace-ai.png"
      alt="ACE.AI"
      width={2000}
      height={2000}
      priority
      className={cn("h-auto w-20 origin-left scale-150 object-contain", className)}
    />
  );
}

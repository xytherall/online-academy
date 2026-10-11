import { MonitorPlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** A lecture's Vimeo thumbnail, or a plain placeholder when Vimeo gave none. */
export function LectureThumbnail({ url, className }: { url: string | null; className?: string }) {
  return (
    <div
      className={cn(
        "flex aspect-video shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted",
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- small Vimeo CDN thumbnail, no remote-pattern config needed
        <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
      ) : (
        <MonitorPlayIcon className="size-5 text-muted-foreground" aria-hidden />
      )}
    </div>
  );
}

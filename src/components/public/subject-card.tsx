import Link from "next/link";
import { excerpt as makeExcerpt } from "@/lib/excerpt";
import { COURSE_LEVEL_LABELS } from "@/lib/group-courses";
import type { PublicCourse } from "@/lib/courses";

type TileStyle = { background: string; symbol: string | null; art: React.ReactNode };

/**
 * One solid-colour tile per published course (Graph paper redesign). The
 * colour, symbol and animated drawing are picked from the course's subject
 * (read from its title) and level, and are purely decorative (aria-hidden),
 * never a stand-in for real course data. Other subjects get a plain grid.
 */
export function SubjectCard({ course, index }: { course: PublicCourse; index: number }) {
  const excerpt = course.description ? makeExcerpt(course.description, 140) : "";
  const style = tileStyle(course, index);

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="gp-tile hover-arrow-group relative flex min-h-[300px] flex-col overflow-hidden rounded-3xl p-7 text-tile-foreground sm:min-h-[330px] sm:p-8"
      style={{ backgroundColor: style.background }}
    >
      {style.art}
      <span className="relative self-start rounded-full bg-tile-foreground/18 px-3 py-1.5 text-[13px] font-semibold">
        {COURSE_LEVEL_LABELS[course.level]}
      </span>
      {style.symbol ? (
        <span aria-hidden className="relative mt-5 font-serif text-[54px] leading-none italic sm:text-[64px]">
          {style.symbol}
        </span>
      ) : null}
      <h3 className="relative mt-3.5 font-display text-[32px] leading-tight font-extrabold tracking-[-0.03em] sm:text-[40px]">
        {course.title}
      </h3>
      {excerpt ? <p className="relative mt-2 max-w-[38ch] leading-relaxed text-tile-foreground/85">{excerpt}</p> : null}
      <span className="relative mt-auto pt-6 font-semibold">
        View course{" "}
        <span aria-hidden className="hover-arrow inline-block">
          →
        </span>
      </span>
    </Link>
  );
}

const FALLBACK_COLOURS = ["var(--tile-blue)", "var(--tile-teal)", "var(--tile-navy)", "var(--tile-indigo)"];

function tileStyle(course: PublicCourse, index: number): TileStyle {
  const title = course.title.toLowerCase();
  const isA = course.level === "A";

  if (title.includes("math")) {
    return isA
      ? { background: "var(--tile-navy)", symbol: "∫", art: <IntegralArt /> }
      : { background: "var(--tile-blue)", symbol: "Σ", art: <ProtractorArt /> };
  }
  if (title.includes("physic")) {
    return isA
      ? { background: "var(--tile-indigo)", symbol: "F = ma", art: <AtomArt /> }
      : { background: "var(--tile-teal)", symbol: "λ", art: <WaveArt /> };
  }
  return { background: FALLBACK_COLOURS[index % FALLBACK_COLOURS.length], symbol: null, art: <GridArt /> };
}

function ProtractorArt() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      className="gp-spin pointer-events-none absolute -top-[70px] -right-[70px] size-[300px]"
      fill="none"
      stroke="var(--tile-foreground)"
      strokeOpacity="0.2"
    >
      <circle cx="100" cy="100" r="90" />
      <circle cx="100" cy="100" r="62" strokeDasharray="4 6" />
      <line x1="10" y1="100" x2="190" y2="100" />
      <line x1="100" y1="10" x2="100" y2="190" />
      <line x1="36" y1="36" x2="164" y2="164" strokeOpacity="0.12" />
    </svg>
  );
}

function WaveArt() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[70px] h-[150px] overflow-hidden">
      <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="gp-slide absolute top-0 left-0 h-[120px] w-[200%]">
        <path
          d="M0 60 C25 10 50 10 75 60 S125 110 150 60 S200 10 225 60 S275 110 300 60 S350 10 375 60 S425 110 450 60"
          fill="none"
          stroke="var(--tile-foreground)"
          strokeOpacity="0.35"
          strokeWidth="1.6"
        />
      </svg>
      <svg
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        className="gp-slide-slow absolute top-[26px] left-0 h-[120px] w-[200%]"
      >
        <path
          d="M0 60 C50 20 100 20 150 60 S250 100 300 60 S400 20 450 60"
          fill="none"
          stroke="var(--tile-foreground)"
          strokeOpacity="0.18"
          strokeWidth="1.2"
          strokeDasharray="5 7"
        />
      </svg>
    </div>
  );
}

function IntegralArt() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 300 220"
      className="pointer-events-none absolute top-2.5 -right-2.5 h-[220px] w-[300px]"
      fill="none"
    >
      <line x1="20" y1="190" x2="290" y2="190" stroke="var(--tile-foreground)" strokeOpacity="0.25" />
      <line x1="40" y1="20" x2="40" y2="200" stroke="var(--tile-foreground)" strokeOpacity="0.25" />
      <path
        className="gp-glow"
        d="M90 190 L90 128 C130 70 180 52 230 70 L230 190 Z"
        fill="var(--tile-glow)"
        fillOpacity="0.35"
      />
      <path
        className="gp-draw"
        pathLength={1}
        d="M40 170 C90 140 130 70 180 58 S260 70 290 40"
        stroke="var(--tile-glow)"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function AtomArt() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      className="pointer-events-none absolute -top-5 -right-[30px] size-[260px]"
      fill="none"
      stroke="var(--tile-foreground)"
      strokeOpacity="0.22"
      strokeWidth="1.2"
    >
      <ellipse cx="100" cy="100" rx="86" ry="32" />
      <ellipse cx="100" cy="100" rx="86" ry="32" transform="rotate(60 100 100)" />
      <ellipse cx="100" cy="100" rx="86" ry="32" transform="rotate(120 100 100)" />
      <circle cx="100" cy="100" r="8" fill="var(--tile-foreground)" fillOpacity="0.6" stroke="none" />
      <g className="gp-orbit">
        <circle cx="186" cy="100" r="5" fill="var(--tile-spark)" stroke="none" />
      </g>
      <g className="gp-orbit-slow">
        <circle cx="100" cy="14" r="4" fill="var(--tile-glow)" stroke="none" />
      </g>
    </svg>
  );
}

function GridArt() {
  return (
    <div
      aria-hidden
      className="gp-grid-band pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_70%_at_100%_0%,black,transparent_70%)]"
    />
  );
}

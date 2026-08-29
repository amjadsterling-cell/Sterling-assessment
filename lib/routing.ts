import type { Course } from "./content-types";

export type RoutingInput = {
  cefr: string; // A1..C2
  fluency_score: number;
  rhythm_score: number;
  intelligibility_score: number;
  preferredFormat?: string; // e.g. "One-on-one"
  courses: Course[];
};

export type RoutingResult = {
  recommended: string;
  alternate: string;
};

function findCourse(courses: Course[], name: string): string {
  const match = courses.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return match ? match.name : name;
}

/**
 * Drives the recommendation off spoken CEFR / speaking competence, not the
 * quiz — per build spec Part 8. Swap this function's body for a different
 * business (e.g. a study-abroad readiness verdict) without touching the
 * rest of the scoring pipeline.
 */
export function routeToCourse(input: RoutingInput): RoutingResult {
  const { cefr, fluency_score, rhythm_score, intelligibility_score, preferredFormat, courses } =
    input;

  let recommended: string;
  let alternate: string;

  const heavyAccent =
    fluency_score >= 65 && (rhythm_score < 50 || intelligibility_score < 50);

  if (heavyAccent) {
    recommended = findCourse(courses, "Accent / MTI");
    alternate = cefr; // note the band for the counsellor rather than a course
  } else if (cefr === "A1" || cefr === "A2") {
    recommended = findCourse(courses, "Foundation");
    alternate = findCourse(courses, "Foundation");
  } else if (cefr === "B1") {
    recommended = findCourse(courses, "Intermediate");
    alternate = findCourse(courses, "Foundation");
  } else {
    recommended = findCourse(courses, "Advanced");
    alternate = findCourse(courses, "Intermediate");
  }

  if (preferredFormat && preferredFormat.toLowerCase().includes("one-on-one")) {
    alternate = recommended;
    recommended = findCourse(courses, "1-on-1 Coaching");
  }

  return { recommended, alternate };
}

/**
 * Study-abroad variant mentioned in the build spec: swap in this function
 * (and point the report renderer at it) if this deployment is being used
 * for IELTS/PTE readiness instead of a courses business.
 */
export function routeToReadinessVerdict(cefr: string): {
  verdict: string;
  note: string;
} {
  switch (cefr) {
    case "C1":
    case "C2":
      return { verdict: "IELTS/PTE ready", note: "Speaking band is unlikely to be the limiting factor." };
    case "B2":
      return { verdict: "Short prep recommended", note: "A focused prep course should close the gap to target band." };
    case "B1":
      return { verdict: "Foundation first", note: "Build core fluency and grammar before starting exam-specific prep." };
    default:
      return { verdict: "Foundation first", note: "Spoken English needs significant groundwork before exam prep." };
  }
}

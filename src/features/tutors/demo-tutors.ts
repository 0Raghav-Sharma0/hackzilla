import { mockTutorMatchReason } from "@/features/help-requests/ai-mock";

export type DemoTutor = {
  id: string;
  name: string;
  headline: string;
  subjects: string[];
  rating: number;
  streak: number;
  responseMin: number;
  matchScore: number;
  review: string;
  online: boolean;
};

/** Rich tutor cards for matching UI — blend with real `interests[]` on detail page. */
export const demoTutors: DemoTutor[] = [
  {
    id: "demo-card-1",
    name: "Morgan Chen",
    headline: "Calculus TA · competitive math",
    subjects: ["calculus", "linear-algebra"],
    rating: 4.95,
    streak: 18,
    responseMin: 2,
    matchScore: 96,
    review: "“Explains proofs like Linear issues — crisp and kind.”",
    online: true,
  },
  {
    id: "demo-card-2",
    name: "Riley Park",
    headline: "Physics intuition + problem sets",
    subjects: ["physics", "mechanics"],
    rating: 4.88,
    streak: 9,
    responseMin: 4,
    matchScore: 91,
    review: "“Whiteboard energy is unreal — kept me in flow.”",
    online: true,
  },
  {
    id: "demo-card-3",
    name: "Jordan Lee",
    headline: "CS fundamentals / systems",
    subjects: ["cs-fundamentals", "algorithms"],
    rating: 4.9,
    streak: 24,
    responseMin: 3,
    matchScore: 89,
    review: "“Debugged my recursion mental model in 12 minutes.”",
    online: false,
  },
];

export function getMatchReason(t: DemoTutor, subjectSlug: string) {
  return mockTutorMatchReason(t.name, subjectSlug);
}

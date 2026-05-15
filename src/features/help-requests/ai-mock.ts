/** Deterministic “AI” tags for demo — swap for OpenAI + embeddings later. */
export function mockCategorize(input: { title: string; body: string; subjectSlug: string }): { tag: string; confidence: number }[] {
  const text = `${input.title} ${input.body}`.toLowerCase();
  const pool: { tag: string; confidence: number }[] = [
    { tag: input.subjectSlug.replace(/-/g, " "), confidence: 0.94 },
    { tag: "exam-prep", confidence: 0.72 },
  ];
  if (text.includes("recursion") || text.includes("stack")) pool.push({ tag: "recursion", confidence: 0.88 });
  if (text.includes("proof") || text.includes("theorem")) pool.push({ tag: "proof-writing", confidence: 0.81 });
  if (text.includes("python") || text.includes("code")) pool.push({ tag: "programming", confidence: 0.86 });
  if (text.includes("integral") || text.includes("calculus")) pool.push({ tag: "calculus", confidence: 0.9 });
  return pool.slice(0, 5);
}

export function mockTutorMatchReason(tutorName: string, subject: string): string {
  return `${tutorName} ranks highly for ${subject.replace(/-/g, " ")} — strong response cadence, verified teaching streak, and complementary language overlap.`;
}

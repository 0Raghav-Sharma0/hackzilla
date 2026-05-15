/** Client + server: enable demo pulse, safer fallbacks, and optional offline UI. */
export function isLearnloopDemo() {
  return process.env.NEXT_PUBLIC_LEARNLOOP_DEMO === "1";
}

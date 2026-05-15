/** Shared reduced-motion aware defaults for `motion` components. */
export const motionSafeViewport = { once: true, margin: "-60px" } as const;

/** Standardized timing — keep UI chrome fast; reserve slower curves for hero sections only. */
export const motionDuration = { fast: 0.2, base: 0.3, slow: 0.45 } as const;

export const motionEase = [0.22, 1, 0.36, 1] as const;

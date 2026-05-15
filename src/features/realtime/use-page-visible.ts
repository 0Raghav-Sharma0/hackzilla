"use client";

import * as React from "react";

/** `true` when the browser tab is visible — pause background polling when hidden. */
export function usePageVisible() {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => setVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return visible;
}

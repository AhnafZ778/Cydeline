import { Suspense, lazy, useEffect, useState } from "react";
const UnifiedConsole = lazy(() =>
  import("../features/live/UnifiedConsole").then((m) => ({
    default: m.UnifiedConsole,
  })),
);
export function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const change = () => setHash(window.location.hash);
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return (
    <Suspense fallback={<p role="status">Loading SOC console…</p>}>
      <UnifiedConsole hash={hash} />
    </Suspense>
  );
}

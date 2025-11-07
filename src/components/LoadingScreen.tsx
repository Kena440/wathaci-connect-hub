import { Loader2 } from "lucide-react";

export const LoadingScreen = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex min-h-[50vh] flex-col items-center justify-center gap-4"
  >
    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
    <span className="text-muted-foreground">Preparing your experience…</span>
  </div>
);

export default LoadingScreen;

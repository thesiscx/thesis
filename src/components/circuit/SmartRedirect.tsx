import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRounds } from "@/hooks/useRounds";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Smart redirect component that navigates to the appropriate round's pipeline.
 * - If user has an open round → redirect to /:openRoundSlug/pipeline
 * - If no open round but has closed rounds → redirect to first closed round's pipeline
 * - If no rounds at all → redirect to first closed round or stay (handled by Pipeline)
 */
export default function SmartRedirect() {
  const navigate = useNavigate();
  const { rounds, isLoading, openRound } = useRounds();

  useEffect(() => {
    if (isLoading) return;

    if (openRound) {
      // Redirect to open round's pipeline
      navigate(`/${openRound.slug}/pipeline`, { replace: true });
    } else if (rounds && rounds.length > 0) {
      // No open round, redirect to first round's pipeline
      const firstRound = rounds[0];
      navigate(`/${firstRound.slug}/pipeline`, { replace: true });
    }
    // If no rounds at all, Pipeline will handle the empty state
  }, [isLoading, openRound, rounds, navigate]);

  // Show loading while determining redirect
  return (
    <div className="min-h-screen flex flex-col">
      <Skeleton className="h-14 w-full" />
      <div className="flex-1 flex">
        <div className="flex-1 p-12 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

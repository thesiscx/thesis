import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Smart redirect component that navigates to the homepage.
 */
export default function SmartRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/home", { replace: true });
  }, [navigate]);

  // Show loading while redirecting
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

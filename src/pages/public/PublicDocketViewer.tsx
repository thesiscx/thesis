import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInvestorAuth } from "@/contexts/InvestorAuthContext";

/**
 * PublicDocketViewer - Redirects to the InvestorCommit flow which has the proper UI
 * The commitment flow handles all docket viewing with the step-based sidebar
 */
export default function PublicDocketViewer() {
  const navigate = useNavigate();
  const { companySlug, roundCode } = useParams();
  const { investorSession, isLoading: isAuthLoading } = useInvestorAuth();

  useEffect(() => {
    if (isAuthLoading) return;

    if (!investorSession) {
      // No session, redirect to access page
      navigate(`/share/${companySlug}/${roundCode}/docket`, { replace: true });
    } else {
      // Has session, redirect to commitment flow which has the proper UI
      navigate(`/share/${companySlug}/${roundCode}/invest`, { replace: true });
    }
  }, [isAuthLoading, investorSession, companySlug, roundCode, navigate]);

  // Show nothing while redirecting
  return null;
}

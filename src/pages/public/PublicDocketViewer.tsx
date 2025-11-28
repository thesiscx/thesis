import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInvestorAuth } from "@/contexts/InvestorAuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, FileCheck, ChevronRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DocketData {
  id: string;
  status: string;
  amount: number | null;
  content: any;
  wire_received: boolean;
}

interface RoundTerms {
  valuation_cap: number | null;
  discount_rate: number | null;
  company_name: string | null;
  signatory_name: string | null;
  signatory_title: string | null;
}

interface Signature {
  id: string;
  signer_type: string;
  signer_name: string;
  signed_at: string;
}

export default function PublicDocketViewer() {
  const navigate = useNavigate();
  const { companySlug, roundCode } = useParams();
  const { investorSession, clearInvestorSession, isLoading: isAuthLoading } = useInvestorAuth();
  
  const [docket, setDocket] = useState<DocketData | null>(null);
  const [roundTerms, setRoundTerms] = useState<RoundTerms | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if no session - WAIT for auth to finish loading first
  useEffect(() => {
    if (!isAuthLoading && !investorSession) {
      // Redirect to access key page, NOT root (which goes to founder routes)
      navigate(`/${companySlug}/${roundCode}/docket`, { replace: true });
    }
  }, [isAuthLoading, investorSession, companySlug, roundCode, navigate]);

  // Fetch docket data
  useEffect(() => {
    const fetchDocket = async () => {
      if (!investorSession) return;

      try {
        setIsLoading(true);

        let docketData = null;

        // Only fetch investor-specific docket if we have an actual investorId (not null/global)
        if (investorSession.investorId) {
          const { data, error: docketError } = await supabase
            .from('dockets')
            .select('*')
            .eq('round_id', investorSession.roundId)
            .eq('investor_id', investorSession.investorId)
            .maybeSingle();

          if (docketError) {
            console.error('Error fetching investor docket:', docketError);
          }
          docketData = data;
        }

        // If no investor-specific docket (or global key), try global docket
        if (!docketData) {
          const { data: globalDocket, error: globalError } = await supabase
            .from('dockets')
            .select('*')
            .eq('round_id', investorSession.roundId)
            .eq('is_global', true)
            .maybeSingle();

          if (globalError) {
            console.error('Error fetching global docket:', globalError);
          }
          docketData = globalDocket;
        }

        if (docketData) {
          setDocket(docketData);

          // Fetch signatures for this docket
          const { data: sigs } = await supabase
            .from('signatures')
            .select('*')
            .eq('docket_id', docketData.id);

          if (sigs) setSignatures(sigs);
        }

        // Fetch round terms
        const { data: terms } = await supabase
          .from('round_terms')
          .select('*')
          .eq('round_id', investorSession.roundId)
          .maybeSingle();

        if (terms) setRoundTerms(terms);

      } catch (err) {
        console.error('Error fetching docket:', err);
        setError('Failed to load agreement');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocket();
  }, [investorSession]);

  const handleLogout = () => {
    clearInvestorSession();
    // Redirect to access key page, NOT root
    navigate(`/${companySlug}/${roundCode}/docket`, { replace: true });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'sent':
        return <Badge variant="outline">Awaiting Signature</Badge>;
      case 'investor_signed':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Awaiting Countersignature</Badge>;
      case 'fully_executed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Fully Executed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const investorSignature = signatures.find(s => s.signer_type === 'investor');
  const companySignature = signatures.find(s => s.signer_type === 'company');

  // Show nothing while auth is loading or no session
  if (isAuthLoading || !investorSession) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{investorSession.companyName}</span>
              <ChevronRight className="h-4 w-4" />
              <span>Investment Agreement</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{investorSession.investorName}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Exit
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-medium text-foreground mb-2">Unable to load agreement</h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : !docket ? (
          <div className="text-center py-12">
            <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-medium text-foreground mb-2">Agreement not ready</h2>
            <p className="text-muted-foreground">The investment agreement is being prepared.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Status Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-heading font-semibold text-foreground">
                  SAFE Agreement
                </h1>
                <p className="text-muted-foreground mt-1">
                  {roundTerms?.company_name || investorSession.companyName}
                </p>
              </div>
              {getStatusBadge(docket.status)}
            </div>

            {/* Investment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Investment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Investor</dt>
                    <dd className="font-medium">{investorSession.investorName}</dd>
                  </div>
                  {docket.amount && (
                    <div>
                      <dt className="text-muted-foreground">Investment Amount</dt>
                      <dd className="font-medium">${docket.amount.toLocaleString()}</dd>
                    </div>
                  )}
                  {roundTerms?.valuation_cap && (
                    <div>
                      <dt className="text-muted-foreground">Valuation Cap</dt>
                      <dd className="font-medium">${roundTerms.valuation_cap.toLocaleString()}</dd>
                    </div>
                  )}
                  {roundTerms?.discount_rate && (
                    <div>
                      <dt className="text-muted-foreground">Discount Rate</dt>
                      <dd className="font-medium">{roundTerms.discount_rate}%</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* Signature Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Signature Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Investor Signature */}
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    {investorSignature ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-sm">Investor Signature</p>
                      <p className="text-xs text-muted-foreground">
                        {investorSignature 
                          ? `Signed by ${investorSignature.signer_name} on ${new Date(investorSignature.signed_at).toLocaleDateString()}`
                          : 'Awaiting signature'
                        }
                      </p>
                    </div>
                  </div>
                  {!investorSignature && docket.status === 'sent' && (
                    <Button size="sm">Sign Agreement</Button>
                  )}
                </div>

                {/* Company Signature */}
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {companySignature ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : investorSignature ? (
                      <Clock className="h-5 w-5 text-amber-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-sm">Company Countersignature</p>
                      <p className="text-xs text-muted-foreground">
                        {companySignature 
                          ? `Signed by ${companySignature.signer_name} on ${new Date(companySignature.signed_at).toLocaleDateString()}`
                          : investorSignature
                            ? 'Awaiting countersignature'
                            : 'Pending investor signature first'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agreement Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agreement Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] rounded-md border p-6 bg-secondary/30">
                  <div className="prose prose-sm max-w-none text-foreground">
                    <h2 className="text-center font-heading">SIMPLE AGREEMENT FOR FUTURE EQUITY</h2>
                    <p className="text-center text-muted-foreground text-sm">
                      ("SAFE")
                    </p>
                    
                    <p className="mt-6">
                      THIS INSTRUMENT CERTIFIES THAT in exchange for the payment by{" "}
                      <strong>{investorSession.investorName}</strong> (the "Investor") of{" "}
                      {docket.amount ? (
                        <strong>${docket.amount.toLocaleString()}</strong>
                      ) : (
                        "[AMOUNT]"
                      )}{" "}
                      (the "Purchase Amount") on or about the date set forth below,{" "}
                      <strong>{roundTerms?.company_name || investorSession.companyName}</strong>,
                      a Delaware corporation (the "Company"), hereby issues to the Investor the
                      right to certain shares of the Company's capital stock, subject to the
                      terms set forth below.
                    </p>

                    {roundTerms?.valuation_cap && (
                      <p className="mt-4">
                        <strong>Valuation Cap:</strong> ${roundTerms.valuation_cap.toLocaleString()}
                      </p>
                    )}

                    {roundTerms?.discount_rate && (
                      <p className="mt-2">
                        <strong>Discount Rate:</strong> {100 - roundTerms.discount_rate}%
                      </p>
                    )}

                    <p className="mt-6 text-muted-foreground text-xs">
                      [Full agreement text continues...]
                    </p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

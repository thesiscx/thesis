import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useInvestorAuth } from "@/contexts/InvestorAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, FileText, FileCheck } from "lucide-react";

interface InvestorAccessProps {
  tool: 'memo' | 'docket';
}

export default function InvestorAccess({ tool }: InvestorAccessProps) {
  const { companySlug, roundCode, investorSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { investorSession, isLoading, validateAndSetSession } = useInvestorAuth();
  
  const [accessKey, setAccessKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  // Format access key as user types (xxxx-xxxx-xxxx-xxxx)
  const formatAccessKey = (value: string) => {
    const cleaned = value.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const parts = [];
    for (let i = 0; i < cleaned.length && i < 16; i += 4) {
      parts.push(cleaned.slice(i, i + 4));
    }
    return parts.join('-');
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccessKey(formatAccessKey(e.target.value));
  };

  // Check if existing session matches the requested resource
  useEffect(() => {
    if (!isLoading && investorSession) {
      // For global keys, investorSlug will be "global"
      const isGlobalKey = investorSession.investorSlug === 'global';
      
      const sessionMatches = 
        investorSession.companySlug === companySlug &&
        investorSession.roundCode === roundCode &&
        investorSession.tool === tool &&
        (isGlobalKey || !investorSlug || investorSession.investorSlug === investorSlug);

      if (sessionMatches) {
        // Session matches, navigate to viewer
        const viewerSlug = isGlobalKey ? 'global' : investorSession.investorSlug;
        navigate(`/${companySlug}/${roundCode}/${tool}/${viewerSlug}/view`, { replace: true });
      }
    }
  }, [isLoading, investorSession, companySlug, roundCode, investorSlug, tool, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (accessKey.length !== 19) {
      toast({
        title: "Invalid format",
        description: "Please enter a complete access key (xxxx-xxxx-xxxx-xxxx)",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);

    try {
      const result = await validateAndSetSession(accessKey);

      if (result.success && result.session) {
        // Verify the key matches the requested resource
        const keyMatches = 
          result.session.companySlug === companySlug &&
          result.session.roundCode === roundCode &&
          result.session.tool === tool;

        if (!keyMatches) {
          toast({
            title: "Access denied",
            description: "This access key is not valid for this document.",
            variant: "destructive",
          });
          setIsValidating(false);
          return;
        }

        // Navigate to the viewer
        const viewerSlug = result.session.investorSlug || 'global';
        navigate(`/${companySlug}/${roundCode}/${tool}/${viewerSlug}/view`, { replace: true });
      } else {
        toast({
          title: "Invalid access key",
          description: result.error || "Please check your access key and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ToolIcon = tool === 'memo' ? FileText : FileCheck;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
            <ToolIcon className="h-8 w-8 text-foreground" />
          </div>
          <h1 className="text-2xl font-heading font-semibold text-foreground">
            {tool === 'memo' ? 'Investment Memo' : 'Investment Agreement'}
          </h1>
          <p className="text-muted-foreground">
            Enter your access key to view this document
          </p>
        </div>

        {/* Access Key Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="xxxx-xxxx-xxxx-xxxx"
                value={accessKey}
                onChange={handleKeyChange}
                className="pl-10 text-center font-mono tracking-wider text-lg h-12"
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Check your email for the access key
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base"
            disabled={isValidating || accessKey.length !== 19}
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Access Document'
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Access keys are unique to each investor and document.
          <br />
          Contact the company if you need a new key.
        </p>
      </div>
    </div>
  );
}

import { CheckCircle2, Download, UserPlus, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinalizeStepProps {
  amount: number;
  companyName: string;
  documentHtml?: string;
  signatoryName?: string;
  wireReceivedAt?: string;
}

export default function FinalizeStep({ 
  amount, 
  companyName,
  documentHtml,
  signatoryName,
  wireReceivedAt,
}: FinalizeStepProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);

  const formattedDate = wireReceivedAt 
    ? new Date(wireReceivedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  const handleDownload = () => {
    if (!documentHtml) return;
    
    const blob = new Blob([`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SAFE Agreement - ${companyName}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            h1, h2, h3 { font-family: inherit; }
          </style>
        </head>
        <body>
          ${documentHtml}
        </body>
      </html>
    `], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAFE-Agreement-${companyName.replace(/\s+/g, '-')}-Executed.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Success Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          Investment Complete
        </h1>
        <p className="text-muted-foreground mt-2">
          Your investment in {companyName} has been finalized.
        </p>
      </div>

      {/* Investment Details */}
      <div className="bg-muted/30 rounded-lg divide-y divide-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Investment Amount</p>
            <p className="text-sm font-semibold text-foreground">{formattedAmount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Funds Received</p>
            <p className="text-sm font-medium text-foreground">{formattedDate}</p>
          </div>
        </div>
      </div>

      {/* Download Button */}
      {documentHtml && (
        <Button 
          onClick={handleDownload}
          variant="outline" 
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Executed Agreement
        </Button>
      )}

      {/* Create Account CTA */}
      <div className="bg-primary/5 border border-primary/10 rounded-lg p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <UserPlus className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-heading font-medium text-foreground mb-2">
          Create Your Investor Account on Thesis
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Track your investment, access documents, and manage your portfolio in one place.
        </p>
        <Button 
          className="w-full"
          onClick={() => window.location.href = 'https://thesis.cx/auth/invite'}
        >
          Create Account
        </Button>
      </div>
    </div>
  );
}

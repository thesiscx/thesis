import { CheckCircle2, Download, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinalizeStepProps {
  amount: number;
  companyName: string;
  documentHtml: string;
  signatoryName?: string;
}

export default function FinalizeStep({ 
  amount, 
  companyName, 
  documentHtml,
  signatoryName,
}: FinalizeStepProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);

  const handleDownload = () => {
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
    a.download = `SAFE-Agreement-${companyName.replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mb-4">
          <Clock className="w-7 h-7 text-amber-600 animate-pulse" />
        </div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          Awaiting Funds
        </h1>
        <p className="text-muted-foreground mt-2">
          Your {formattedAmount} commitment to {companyName} is pending wire receipt.
        </p>
      </div>

      {/* Execution Status */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground text-sm">Your signature recorded</p>
            <p className="text-xs text-muted-foreground">Timestamp, IP address, and document hash captured</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground text-sm">Counter-signed by {companyName}</p>
            <p className="text-xs text-muted-foreground">
              {signatoryName ? `Signed by ${signatoryName}` : 'Pre-authorized signature applied'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground text-sm">Agreement fully executed</p>
            <p className="text-xs text-muted-foreground">Pending fund receipt to close</p>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <p className="text-sm text-blue-900 leading-relaxed">
          The agreement is fully executed but will only close upon confirmed receipt of funds. 
          Once cleared, you will be automatically recorded in the shareholder register.
        </p>
      </div>

      {/* Download Agreement */}
      <div className="bg-muted/30 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground text-sm">Executed Agreement</p>
          <p className="text-xs text-muted-foreground">Download your fully signed agreement</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
          <Download className="w-4 h-4" />
          Download
        </Button>
      </div>

      {/* Account Setup CTA */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 text-center">
        <p className="text-sm text-foreground mb-3">
          Set up your Circuit account to manage your shareholdings and receive updates.
        </p>
        <Button variant="outline" size="sm" className="gap-2">
          <ExternalLink className="w-4 h-4" />
          Create Investor Account
        </Button>
      </div>

      {/* Contact Note */}
      <p className="text-xs text-center text-muted-foreground">
        Questions about your investment? Contact the {companyName} team directly.
      </p>
    </div>
  );
}

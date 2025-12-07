import { CheckCircle2, Copy, Check, Download, Clock, FileCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface WireInstructions {
  wire_bank_name: string | null;
  wire_account_name: string | null;
  wire_account_number: string | null;
  wire_routing_number: string | null;
  wire_swift_code: string | null;
  wire_bank_address: string | null;
  wire_reference: string | null;
}

interface ConfirmationStepProps {
  amount: number;
  companyName: string;
  wireInstructions: WireInstructions | null;
  documentHtml: string;
  signatoryName?: string;
}

export default function ConfirmationStep({ 
  amount, 
  companyName, 
  wireInstructions,
  documentHtml,
  signatoryName
}: ConfirmationStepProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

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
          <FileCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
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

      {/* Wire Instructions */}
      {wireInstructions && (
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-heading font-medium text-foreground">
              Wire Instructions
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Please wire {formattedAmount} to complete your investment.
            </p>
          </div>

          <div className="bg-muted/30 rounded-lg divide-y divide-border">
            {wireInstructions.wire_bank_name && (
              <WireField
                label="Bank Name"
                value={wireInstructions.wire_bank_name}
                copied={copiedField === 'bank_name'}
                onCopy={() => copyToClipboard(wireInstructions.wire_bank_name!, 'bank_name')}
              />
            )}
            {wireInstructions.wire_account_name && (
              <WireField
                label="Account Name"
                value={wireInstructions.wire_account_name}
                copied={copiedField === 'account_name'}
                onCopy={() => copyToClipboard(wireInstructions.wire_account_name!, 'account_name')}
              />
            )}
            {wireInstructions.wire_account_number && (
              <WireField
                label="Account Number"
                value={wireInstructions.wire_account_number}
                copied={copiedField === 'account_number'}
                onCopy={() => copyToClipboard(wireInstructions.wire_account_number!, 'account_number')}
              />
            )}
            {wireInstructions.wire_routing_number && (
              <WireField
                label="Routing Number"
                value={wireInstructions.wire_routing_number}
                copied={copiedField === 'routing_number'}
                onCopy={() => copyToClipboard(wireInstructions.wire_routing_number!, 'routing_number')}
              />
            )}
            {wireInstructions.wire_swift_code && (
              <WireField
                label="SWIFT Code"
                value={wireInstructions.wire_swift_code}
                copied={copiedField === 'swift_code'}
                onCopy={() => copyToClipboard(wireInstructions.wire_swift_code!, 'swift_code')}
              />
            )}
            {wireInstructions.wire_bank_address && (
              <WireField
                label="Bank Address"
                value={wireInstructions.wire_bank_address}
                copied={copiedField === 'bank_address'}
                onCopy={() => copyToClipboard(wireInstructions.wire_bank_address!, 'bank_address')}
              />
            )}
            {wireInstructions.wire_reference && (
              <WireField
                label="Reference"
                value={wireInstructions.wire_reference}
                copied={copiedField === 'reference'}
                onCopy={() => copyToClipboard(wireInstructions.wire_reference!, 'reference')}
              />
            )}
          </div>
        </div>
      )}

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

function WireField({ 
  label, 
  value, 
  copied, 
  onCopy 
}: { 
  label: string; 
  value: string; 
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onCopy} className="h-8 w-8 p-0">
        {copied ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}

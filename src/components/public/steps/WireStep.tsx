import { Copy, Check, Landmark } from "lucide-react";
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

interface WireStepProps {
  amount: number;
  companyName: string;
  wireInstructions: WireInstructions | null;
  onContinue: () => void;
}

export default function WireStep({ 
  amount, 
  companyName, 
  wireInstructions,
  onContinue,
}: WireStepProps) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
          <Landmark className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          Wire Instructions
        </h1>
        <p className="text-muted-foreground mt-2">
          Wire {formattedAmount} to complete your investment in {companyName}.
        </p>
      </div>

      {/* Wire Instructions */}
      {wireInstructions && (
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
      )}

      {!wireInstructions && (
        <div className="bg-muted/30 rounded-lg p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Wire instructions will be provided by {companyName}.
          </p>
        </div>
      )}

      {/* Important Notice */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <p className="text-sm text-blue-900 leading-relaxed">
          Please include your name and "{companyName} Investment" in the wire memo for identification.
        </p>
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={onContinue} className="px-6">
          Continue
        </Button>
      </div>
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

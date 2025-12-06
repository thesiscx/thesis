import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileSignature, Check } from "lucide-react";

interface InvestorDocketProps {
  roundSlug?: string;
  investorSlug?: string;
}

export default function InvestorDocket({ roundSlug, investorSlug }: InvestorDocketProps) {
  // Placeholder data - would be fetched based on roundSlug and investorSlug
  const investorName = investorSlug?.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "Investor";
  const status = "investor_signed" as string;

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold mb-1">
              {investorName}'s Agreement
            </h1>
          <Badge variant={status === "executed" ? "default" : "secondary"}>
            {status === "investor_signed" && "Awaiting countersignature"}
            {status === "executed" && "Fully executed"}
            {status === "draft" && "Draft"}
            {status === "sent" && "Sent"}
            {status === "expired" && "Expired"}
          </Badge>
          </div>
          
          {status === "investor_signed" && (
            <Button className="gap-2">
              <FileSignature className="w-4 h-4" />
              Countersign
            </Button>
          )}
        </div>

        <Separator />

        {/* Investor Details */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium">Investor Details</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-xs">Name</Label>
                <p>{investorName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Entity</Label>
                <p>Individual</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p>investor@example.com</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Investment Details</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-xs">Amount</Label>
                <p className="text-xl font-semibold">$250,000</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Instrument</Label>
                <p>SAFE - Post-money</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Valuation Cap</Label>
                <p>$10,000,000</p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Agreement Preview */}
        <div>
          <h3 className="font-medium mb-4">Agreement Preview</h3>
          <div className="border rounded-lg p-6 bg-muted/30">
            <ScrollArea className="h-[400px]">
              <div className="prose prose-sm max-w-none">
                <h2>SAFE Agreement</h2>
                <p>
                  THIS CERTIFIES THAT in exchange for the payment by <strong>{investorName}</strong> 
                  (the "Investor") of <strong>$250,000</strong> (the "Purchase Amount") on or about 
                  January 15, 2024, <strong>Acme Inc.</strong>, a Delaware corporation (the "Company"), 
                  issues to the Investor the right to certain shares of the Company's Capital Stock, 
                  subject to the terms described below.
                </p>
                <p>
                  The "Post-Money Valuation Cap" is <strong>$10,000,000</strong>.
                </p>
                {/* More agreement content */}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-6">
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Investor Signature</h4>
            <div className="h-20 border-2 border-dashed rounded flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <Check className="w-6 h-6 mx-auto text-green-600" />
                <p className="text-sm text-muted-foreground mt-1">Signed</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Signed on January 15, 2024 at 3:45 PM
            </p>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Company Countersignature</h4>
            <div className="h-20 border-2 border-dashed rounded flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Awaiting signature</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Expires in 68 hours
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

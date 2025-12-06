import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRounds, ROUND_TYPES, ROUND_TYPE_LABELS, RoundType } from "@/hooks/useRounds";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateRoundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, called after round creation instead of navigating away */
  onSuccess?: () => void;
}

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Round Type",
  2: "Investment Terms",
  3: "Wire Instructions",
  4: "Review",
};

export default function CreateRoundDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateRoundDialogProps) {
  const navigate = useNavigate();
  const { companyName } = useFounderAuth();
  const { createRound, countRoundsOfType, hasOpenRound } = useRounds();
  
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1: Round config
  const [roundType, setRoundType] = useState<RoundType>("s");
  const [instrumentType, setInstrumentType] = useState<"safe" | "note" | "equity">("safe");
  const [targetRaise, setTargetRaise] = useState("");
  
  // Step 2: Investment terms
  const [valuationCap, setValuationCap] = useState("");
  const [discountRate, setDiscountRate] = useState("");
  const [minimumTicket, setMinimumTicket] = useState("");
  const [proRataEnabled, setProRataEnabled] = useState(false);
  const [mfnEnabled, setMfnEnabled] = useState(false);
  
  // Step 3: Wire instructions
  const [wireBankName, setWireBankName] = useState("");
  const [wireAccountName, setWireAccountName] = useState("");
  const [wireAccountNumber, setWireAccountNumber] = useState("");
  const [wireRoutingNumber, setWireRoutingNumber] = useState("");
  const [wireSwiftCode, setWireSwiftCode] = useState("");
  const [wireBankAddress, setWireBankAddress] = useState("");
  const [wireReference, setWireReference] = useState("");

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const existingCount = countRoundsOfType(roundType);
  const roundNumber = existingCount + 1;
  const publicCode = roundNumber > 1 ? `${roundType}${roundNumber}` : roundType;
  const roundLabel = ROUND_TYPE_LABELS[roundType];
  const displayName = roundNumber > 1 ? `${roundLabel} ${roundNumber}` : roundLabel;

  const resetForm = () => {
    setStep(1);
    setRoundType("s");
    setInstrumentType("safe");
    setTargetRaise("");
    setValuationCap("");
    setDiscountRate("");
    setMinimumTicket("");
    setProRataEnabled(false);
    setMfnEnabled(false);
    setWireBankName("");
    setWireAccountName("");
    setWireAccountNumber("");
    setWireRoutingNumber("");
    setWireSwiftCode("");
    setWireBankAddress("");
    setWireReference("");
  };

  const handleCreate = async () => {
    if (hasOpenRound || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const slug = slugify(displayName);
      
      // Create the round
      const newRound = await createRound.mutateAsync({
        name: displayName,
        slug,
        instrument_type: instrumentType,
        target_raise: targetRaise ? parseFloat(targetRaise) : undefined,
        round_type: roundType,
      });

      // Update round_terms with all the details
      if (newRound?.id) {
        await supabase
          .from("round_terms")
          .update({
            valuation_cap: valuationCap ? parseFloat(valuationCap) : null,
            discount_rate: discountRate ? parseFloat(discountRate) : null,
            minimum_ticket: minimumTicket ? parseFloat(minimumTicket) : null,
            pro_rata_enabled: proRataEnabled,
            mfn_enabled: mfnEnabled,
            wire_bank_name: wireBankName || null,
            wire_account_name: wireAccountName || null,
            wire_account_number: wireAccountNumber || null,
            wire_routing_number: wireRoutingNumber || null,
            wire_swift_code: wireSwiftCode || null,
            wire_bank_address: wireBankAddress || null,
            wire_reference: wireReference || null,
          })
          .eq("round_id", newRound.id);
      }

      onOpenChange(false);
      resetForm();
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/${slug}/memo`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const canProceedStep1 = roundType && instrumentType;
  const canProceedStep2 = true; // Terms are optional but recommended
  const canProceedStep3 = true; // Wire instructions optional

  const instrumentLabel = instrumentType === 'safe' ? 'SAFE' : 
                          instrumentType === 'note' ? 'Convertible Note' : 
                          'Equity';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Open New Round</DialogTitle>
          <DialogDescription>
            Step {step} of 4: {STEP_LABELS[step]}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-between px-2 py-3">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div key={s} className="flex items-center">
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  s < step && "bg-primary text-primary-foreground",
                  s === step && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                  s > step && "bg-muted text-muted-foreground"
                )}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 4 && (
                <div className={cn(
                  "w-12 h-0.5 mx-1",
                  s < step ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Round Type */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Round type *</Label>
              <Select value={roundType} onValueChange={(v: RoundType) => setRoundType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROUND_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {ROUND_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground space-y-1">
                {roundNumber > 1 && (
                  <p>This will be your <strong>{displayName}</strong></p>
                )}
                <p>URL code: <span className="font-mono">{publicCode}</span></p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Instrument type *</Label>
              <Select value={instrumentType} onValueChange={(v: "safe" | "note" | "equity") => setInstrumentType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="safe">SAFE</SelectItem>
                  <SelectItem value="note">Convertible Note</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">Target raise (optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="target"
                  type="number"
                  placeholder="1,000,000"
                  value={targetRaise}
                  onChange={(e) => setTargetRaise(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Investment Terms */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valuation Cap</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={valuationCap}
                    onChange={(e) => setValuationCap(e.target.value)}
                    placeholder="10,000,000"
                    className="pl-7"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Discount Rate</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={discountRate}
                    onChange={(e) => setDiscountRate(e.target.value)}
                    placeholder="20"
                    className="pr-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Minimum Investment</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={minimumTicket}
                  onChange={(e) => setMinimumTicket(e.target.value)}
                  placeholder="25,000"
                  className="pl-7"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Pro-Rata Rights</Label>
                  <p className="text-xs text-muted-foreground">Allow investors to maintain ownership %</p>
                </div>
                <Switch
                  checked={proRataEnabled}
                  onCheckedChange={setProRataEnabled}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>MFN Clause</Label>
                  <p className="text-xs text-muted-foreground">Most Favored Nation provisions</p>
                </div>
                <Switch
                  checked={mfnEnabled}
                  onCheckedChange={setMfnEnabled}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Wire Instructions */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Add your wire transfer details for investor payments
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={wireBankName}
                  onChange={(e) => setWireBankName(e.target.value)}
                  placeholder="First National Bank"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input
                  value={wireAccountName}
                  onChange={(e) => setWireAccountName(e.target.value)}
                  placeholder="Acme Inc."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  value={wireAccountNumber}
                  onChange={(e) => setWireAccountNumber(e.target.value)}
                  placeholder="1234567890"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Routing Number (ABA)</Label>
                <Input
                  value={wireRoutingNumber}
                  onChange={(e) => setWireRoutingNumber(e.target.value)}
                  placeholder="021000021"
                />
              </div>
              
              <div className="space-y-2">
                <Label>SWIFT/BIC Code</Label>
                <Input
                  value={wireSwiftCode}
                  onChange={(e) => setWireSwiftCode(e.target.value)}
                  placeholder="CHASUS33"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Reference / Memo</Label>
                <Input
                  value={wireReference}
                  onChange={(e) => setWireReference(e.target.value)}
                  placeholder="Investment - [Investor]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bank Address</Label>
              <Textarea
                value={wireBankAddress}
                onChange={(e) => setWireBankAddress(e.target.value)}
                placeholder="123 Bank Street, New York, NY 10001"
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <h4 className="font-medium mb-2">Round Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Round:</div>
                  <div>{displayName}</div>
                  <div className="text-muted-foreground">Instrument:</div>
                  <div>{instrumentLabel}</div>
                  {targetRaise && (
                    <>
                      <div className="text-muted-foreground">Target:</div>
                      <div>${parseFloat(targetRaise).toLocaleString()}</div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Investment Terms</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Valuation Cap:</div>
                  <div>{valuationCap ? `$${parseFloat(valuationCap).toLocaleString()}` : "Not set"}</div>
                  <div className="text-muted-foreground">Discount:</div>
                  <div>{discountRate ? `${discountRate}%` : "Not set"}</div>
                  <div className="text-muted-foreground">Min Investment:</div>
                  <div>{minimumTicket ? `$${parseFloat(minimumTicket).toLocaleString()}` : "Not set"}</div>
                  <div className="text-muted-foreground">Pro-Rata:</div>
                  <div>{proRataEnabled ? "Yes" : "No"}</div>
                  <div className="text-muted-foreground">MFN:</div>
                  <div>{mfnEnabled ? "Yes" : "No"}</div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Wire Instructions</h4>
                {wireBankName ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Bank:</div>
                    <div>{wireBankName}</div>
                    {wireAccountName && (
                      <>
                        <div className="text-muted-foreground">Account:</div>
                        <div>{wireAccountName}</div>
                      </>
                    )}
                    {wireAccountNumber && (
                      <>
                        <div className="text-muted-foreground">Account #:</div>
                        <div>••••{wireAccountNumber.slice(-4)}</div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not configured</p>
                )}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              You can update these settings anytime from Rounds Overview after creating the round.
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={() => step === 1 ? handleClose() : setStep((step - 1) as Step)}
          >
            {step === 1 ? "Cancel" : (
              <>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </>
            )}
          </Button>
          
          {step < 4 ? (
            <Button 
              onClick={() => setStep((step + 1) as Step)}
              disabled={step === 1 && !canProceedStep1}
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleCreate} 
              disabled={isSubmitting || hasOpenRound}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Open Round
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
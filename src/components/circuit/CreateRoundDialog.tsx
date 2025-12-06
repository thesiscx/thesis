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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRounds, ROUND_TYPES, ROUND_TYPE_LABELS, RoundType, getRoundCode } from "@/hooks/useRounds";

interface CreateRoundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateRoundDialog({
  open,
  onOpenChange,
}: CreateRoundDialogProps) {
  const navigate = useNavigate();
  const { createRound, countRoundsOfType, hasOpenRound } = useRounds();
  
  const [roundType, setRoundType] = useState<RoundType>("s");
  const [instrumentType, setInstrumentType] = useState<"safe" | "note" | "equity">("safe");
  const [targetRaise, setTargetRaise] = useState("");

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  // Calculate what the round number will be
  const existingCount = countRoundsOfType(roundType);
  const roundNumber = existingCount + 1;
  const publicCode = roundNumber > 1 ? `${roundType}${roundNumber}` : roundType;

  const handleCreate = async () => {
    if (hasOpenRound) return;
    
    const roundLabel = ROUND_TYPE_LABELS[roundType];
    const displayName = roundNumber > 1 ? `${roundLabel} ${roundNumber}` : roundLabel;
    const slug = slugify(displayName);
    
    await createRound.mutateAsync({
      name: displayName,
      slug,
      instrument_type: instrumentType,
      target_raise: targetRaise ? parseFloat(targetRaise) : undefined,
      round_type: roundType,
    });

    onOpenChange(false);
    navigate(`/circuit/${slug}/memo/global`);
    
    // Reset form
    setRoundType("s");
    setInstrumentType("safe");
    setTargetRaise("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Open New Round</DialogTitle>
          <DialogDescription>
            Configure your new fundraising round
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
                <p>This will be your <strong>{ROUND_TYPE_LABELS[roundType]} #{roundNumber}</strong></p>
              )}
              <p>URL code: <span className="font-mono">{publicCode}</span></p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Instrument type</Label>
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

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={createRound.isPending || hasOpenRound}
          >
            {createRound.isPending ? "Opening..." : "Open Round"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

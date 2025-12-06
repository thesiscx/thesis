import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, PauseCircle, RefreshCw, GitMerge, HelpCircle, Users, FileText, FolderOpen } from "lucide-react";

interface RoundStats {
  investorCount: number;
  memoCount: number;
  docketCount: number;
}

interface CloseRoundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundName: string;
  roundStats?: RoundStats;
  onConfirm: (reason: string, notes: string) => Promise<void>;
}

const CLOSURE_REASONS = [
  {
    value: "raised_funding",
    label: "Successfully raised funding",
    description: "The round closed with investment secured",
    icon: CheckCircle,
  },
  {
    value: "paused",
    label: "Paused fundraising",
    description: "Taking a break from active fundraising",
    icon: PauseCircle,
  },
  {
    value: "changed_plans",
    label: "Changed plans / pivoted",
    description: "Company direction or strategy has shifted",
    icon: RefreshCw,
  },
  {
    value: "merged",
    label: "Merged into another round",
    description: "Consolidated with a different fundraising effort",
    icon: GitMerge,
  },
  {
    value: "other",
    label: "Other",
    description: "A different reason not listed above",
    icon: HelpCircle,
  },
];

export default function CloseRoundDialog({
  open,
  onOpenChange,
  roundName,
  roundStats,
  onConfirm,
}: CloseRoundDialogProps) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!reason) return;
    setIsSubmitting(true);
    try {
      await onConfirm(reason, notes);
      setReason("");
      setNotes("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
      setNotes("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Close {roundName}</DialogTitle>
          <DialogDescription>
            Closing this round marks it as complete. You can reopen it later if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Round Summary */}
          {roundStats && (
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{roundStats.investorCount}</span>
                <span className="text-muted-foreground">investors</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{roundStats.memoCount}</span>
                <span className="text-muted-foreground">memos</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{roundStats.docketCount}</span>
                <span className="text-muted-foreground">dockets</span>
              </div>
            </div>
          )}

          {/* Closure Reason */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Why are you closing this round?</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
              {CLOSURE_REASONS.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      reason === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value={option.value} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{option.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details for your records..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!reason || isSubmitting}
          >
            {isSubmitting ? "Closing..." : "Close Round"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
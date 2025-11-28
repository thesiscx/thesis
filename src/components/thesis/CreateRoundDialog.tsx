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
import { useRounds } from "@/hooks/useRounds";

interface CreateRoundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateRoundDialog({
  open,
  onOpenChange,
}: CreateRoundDialogProps) {
  const navigate = useNavigate();
  const { createRound } = useRounds();
  
  const [name, setName] = useState("");
  const [instrumentType, setInstrumentType] = useState<"safe" | "note">("safe");
  const [targetRaise, setTargetRaise] = useState("");

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    const slug = slugify(name);
    
    await createRound.mutateAsync({
      name: name.trim(),
      slug,
      instrument_type: instrumentType,
      target_raise: targetRaise ? parseFloat(targetRaise) : undefined,
    });

    onOpenChange(false);
    navigate(`/thesis/${slug}/memo/global`);
    
    // Reset form
    setName("");
    setInstrumentType("safe");
    setTargetRaise("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create your raise</DialogTitle>
          <DialogDescription>
            Set up a new fundraising round
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Round name</Label>
            <Input
              id="name"
              placeholder="e.g., Seed, Pre-seed, Series A"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {name && (
              <p className="text-xs text-muted-foreground">
                URL: /thesis/{slugify(name)}/...
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Instrument type</Label>
            <Select value={instrumentType} onValueChange={(v: "safe" | "note") => setInstrumentType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="safe">SAFE</SelectItem>
                <SelectItem value="note">Convertible Note</SelectItem>
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
            disabled={!name.trim() || createRound.isPending}
          >
            {createRound.isPending ? "Creating..." : "Create round"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

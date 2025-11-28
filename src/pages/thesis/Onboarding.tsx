import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function Onboarding() {
  const navigate = useNavigate();
  const { rounds, isLoading: roundsLoading, createRound } = useRounds();
  const { user, isLoading: authLoading } = useFounderAuth();
  
  const [name, setName] = useState("");
  const [instrumentType, setInstrumentType] = useState<"safe" | "note">("safe");
  const [targetRaise, setTargetRaise] = useState("");

  // Redirect to first round if user already has rounds
  useEffect(() => {
    if (!roundsLoading && rounds.length > 0) {
      const firstRound = rounds[0];
      navigate(`/thesis/${firstRound.slug}/memo/global`, { replace: true });
    }
  }, [rounds, roundsLoading, navigate]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

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

    navigate(`/thesis/${slug}/memo/global`);
  };

  if (authLoading || roundsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Skeleton className="w-96 h-96" />
      </div>
    );
  }

  // Don't render form if user has rounds (will redirect)
  if (rounds.length > 0) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-heading text-3xl font-bold">Welcome to Thesis</h1>
          <p className="text-muted-foreground">
            Let's set up your first fundraising round
          </p>
        </div>

        <div className="space-y-6 bg-card border border-border rounded-lg p-6">
          <div className="space-y-2">
            <Label htmlFor="name">Round name</Label>
            <Input
              id="name"
              placeholder="e.g., Seed, Pre-seed, Series A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {name && (
              <p className="text-xs text-muted-foreground">
                Your memo will be at: /thesis/{slugify(name)}/memo/global
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

          <Button 
            className="w-full" 
            onClick={handleCreate}
            disabled={!name.trim() || createRound.isPending}
          >
            {createRound.isPending ? "Creating..." : "Create your raise"}
          </Button>
        </div>
      </div>
    </div>
  );
}

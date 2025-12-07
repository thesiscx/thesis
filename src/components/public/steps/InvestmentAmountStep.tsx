import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, AlertCircle } from "lucide-react";

interface InvestmentAmountStepProps {
  initialAmount: number;
  minimumTicket: number | null;
  onContinue: (amount: number) => void;
  onBack: () => void;
}

export default function InvestmentAmountStep({ 
  initialAmount, 
  minimumTicket, 
  onContinue, 
  onBack 
}: InvestmentAmountStepProps) {
  const [amount, setAmount] = useState<string>(initialAmount > 0 ? initialAmount.toString() : '');
  const [error, setError] = useState<string | null>(null);

  const formatDisplayAmount = (value: string) => {
    const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('en-US').format(num);
  };

  const parseAmount = (value: string): number => {
    return parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    setAmount(rawValue);
    setError(null);
  };

  const handleSubmit = () => {
    const numericAmount = parseAmount(amount);
    
    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid investment amount');
      return;
    }

    if (minimumTicket && numericAmount < minimumTicket) {
      setError(`Minimum investment is ${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(minimumTicket)}`);
      return;
    }

    onContinue(numericAmount);
  };

  const suggestedAmounts = [25000, 50000, 100000, 250000];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          Investment Amount
        </h1>
        <p className="text-muted-foreground mt-2">
          Enter the amount you would like to invest in this round.
        </p>
      </div>

      <div className="space-y-6">
        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Investment Amount (USD)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="amount"
              type="text"
              value={formatDisplayAmount(amount)}
              onChange={handleChange}
              placeholder="0"
              className="pl-7 text-lg font-medium h-12"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}
          {minimumTicket && !error && (
            <p className="text-sm text-muted-foreground">
              Minimum investment: {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
              }).format(minimumTicket)}
            </p>
          )}
        </div>

        {/* Quick Amount Buttons */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Quick select</Label>
          <div className="grid grid-cols-4 gap-2">
            {suggestedAmounts.map((suggestedAmount) => (
              <Button
                key={suggestedAmount}
                variant={parseAmount(amount) === suggestedAmount ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setAmount(suggestedAmount.toString());
                  setError(null);
                }}
                className="text-xs"
              >
                ${suggestedAmount >= 1000 ? `${suggestedAmount / 1000}K` : suggestedAmount}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleSubmit} className="flex-1">
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
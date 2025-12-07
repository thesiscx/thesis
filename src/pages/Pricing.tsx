import { Link } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="text-3xl font-bold mb-4">Pricing</h1>
        <p className="text-muted-foreground mb-12">
          Simple, transparent pricing for founders.
        </p>
        
        <div className="border border-border rounded-lg p-6">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-xl font-semibold">Full Access</h2>
            <div className="text-right">
              <div>
                <span className="text-2xl font-bold">$50</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <p className="text-xs text-muted-foreground">or $500/year</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Everything you need to run your raise, end to end.
          </p>
          <ul className="space-y-3">
            {[
              "AI-automated investor pipeline",
              "AI-generated investment memo",
              "Custom subdomain publishing",
              "Branded investor links",
              "Unlimited investor dockets",
              "End-to-end contract execution",
              "E-signature collection",
              "Official shareholder register"
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">
          Questions? Reach out at hello@circuit.run
        </p>
      </div>
    </div>
  );
}
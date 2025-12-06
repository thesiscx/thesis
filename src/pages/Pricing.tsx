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
        
        <div className="space-y-8">
          {/* Free Tier */}
          <div className="border border-border rounded-lg p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xl font-semibold">Starter</h2>
              <div className="text-right">
                <span className="text-2xl font-bold">$0</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Everything you need to get started with your raise.
            </p>
            <ul className="space-y-3">
              {[
                "1 active fundraising round",
                "Investment memo editor",
                "Unlimited investor variants",
                "Share links with access keys",
                "Basic analytics"
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Tier */}
          <div className="border border-primary/50 rounded-lg p-6 relative">
            <div className="absolute -top-3 left-4 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
              Coming Soon
            </div>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xl font-semibold">Pro</h2>
              <div className="text-right">
                <span className="text-2xl font-bold">$49</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              For founders running serious fundraising campaigns.
            </p>
            <ul className="space-y-3">
              {[
                "Unlimited fundraising rounds",
                "AI-powered memo drafting",
                "SAFE agreement generation",
                "E-signature collection",
                "Wire tracking & cap table sync",
                "Advanced investor analytics",
                "Custom subdomain publishing",
                "Priority support"
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Enterprise */}
          <div className="border border-border rounded-lg p-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xl font-semibold">Enterprise</h2>
              <div className="text-right">
                <span className="text-lg font-medium text-muted-foreground">Custom</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              For funds and accelerators managing multiple portfolio companies.
            </p>
            <ul className="space-y-3">
              {[
                "Multi-company workspace",
                "Dedicated account manager",
                "Custom integrations",
                "SSO & advanced security",
                "SLA & premium support"
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">
          Questions? Reach out at hello@circuit.run
        </p>
      </div>
    </div>
  );
}
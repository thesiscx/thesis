import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function About() {
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

        <h1 className="text-3xl font-bold mb-4">About Circuit</h1>
        <p className="text-muted-foreground mb-12">Fundraising without friction.</p>

        <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>
            Circuit is an invisible agent and automated fundraising platform built for founders who want speed and
            clarity in one place. It replaces scattered emails and improvised workflows with a single environment that
            shows where every investor stands, maintains your materials, and closes your round—automatically.
          </p>

          <p>
            Circuit pulls your pipeline directly from Gmail, giving you a real-time, AI-curated view of every investor
            conversation, touchpoint, and lead. Momentum is visible instantly, with zero manual entry.
          </p>

          <p>
            Circuit also drafts and updates your investment memo. Publish through your branded subdomain and share
            secure dockets with investor-specific access keys.
          </p>

          <p>
            Execution is built directly into the docket. Investors review the agreement, enter their details and amount,
            and sign digitally. Circuit applies your pre-authorized counter-signature, issues wire instructions, and
            tracks incoming funds. Once confirmed, the investment finalizes and the investor is added to your
            shareholder register.
          </p>

          <p>Circuit is fundraising without friction. Automated pipeline. Automated memo. Automated execution.</p>

          <p className="font-medium text-foreground">Raise Clarity.</p>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">Questions? Reach out at contact@circuit.cx</p>
      </div>
    </div>
  );
}

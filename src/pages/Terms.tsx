import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
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

        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Last updated: January 1, 2025</p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-sm leading-relaxed">
              By accessing or using Thesis ("Service"), you agree to be bound by these Terms of Service. If you do not
              agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p className="text-sm leading-relaxed">
              Thesis provides a platform for founders to manage their fundraising process, including creating
              investment memos, managing investor relationships, and executing investment agreements. The Service is
              provided "as is" and we reserve the right to modify or discontinue features at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
            <p className="text-sm leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities
              that occur under your account. You must provide accurate and complete information when creating an account
              and keep this information up to date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. User Content</h2>
            <p className="text-sm leading-relaxed">
              You retain ownership of all content you submit to the Service. By submitting content, you grant Thesis a
              non-exclusive, worldwide license to use, store, and process your content solely for the purpose of
              providing the Service. You are solely responsible for the accuracy and legality of all content you submit.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Prohibited Conduct</h2>
            <p className="text-sm leading-relaxed">
              You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to gain unauthorized access to
              any part of the Service; (c) interfere with or disrupt the Service; (d) transmit any viruses or malicious
              code; (e) impersonate any person or entity; or (f) violate any applicable laws or regulations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Investment Disclaimers</h2>
            <p className="text-sm leading-relaxed">
              Thesis is not a registered broker-dealer, investment adviser, or funding portal. The Service facilitates
              document creation and communication but does not provide investment advice, recommendations, or
              endorsements. All investment decisions are made solely between founders and investors.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed">
              To the maximum extent permitted by law, Thesis shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages arising from your use of the Service. Our total liability shall not
              exceed the amount paid by you, if any, for accessing the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Termination</h2>
            <p className="text-sm leading-relaxed">
              We may terminate or suspend your access to the Service at any time, with or without cause, and with or
              without notice. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Governing Law</h2>
            <p className="text-sm leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware,
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
            <p className="text-sm leading-relaxed">
              For questions about these Terms, please contact us at contact@thesis.run.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

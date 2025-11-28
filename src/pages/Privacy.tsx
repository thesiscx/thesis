import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          to="/auth"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Last updated: January 1, 2025</p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p className="text-sm leading-relaxed">
              We collect information you provide directly, including: account information (name, email), company information (name, website, description), investment documents and memos you create, and files you upload to the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
            <p className="text-sm leading-relaxed">
              We use your information to: provide and improve the Service, personalize your experience, communicate with you about the Service, analyze usage patterns, and ensure the security of your account and data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Information Sharing</h2>
            <p className="text-sm leading-relaxed">
              We do not sell your personal information. We may share information with: service providers who assist in operating the platform, when required by law, or with your explicit consent. Investor-facing content is only shared with parties you explicitly authorize via share links or access keys.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Data Security</h2>
            <p className="text-sm leading-relaxed">
              We implement industry-standard security measures to protect your data, including encryption in transit and at rest, secure authentication, and regular security audits. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Data Retention</h2>
            <p className="text-sm leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time by contacting us.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Cookies and Analytics</h2>
            <p className="text-sm leading-relaxed">
              We use cookies and similar technologies to maintain your session, remember preferences, and analyze how the Service is used. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Third-Party Services</h2>
            <p className="text-sm leading-relaxed">
              The Service may integrate with third-party services (such as authentication providers). Your use of these services is governed by their respective privacy policies. We encourage you to review those policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Your Rights</h2>
            <p className="text-sm leading-relaxed">
              You have the right to: access your personal data, correct inaccurate data, request deletion of your data, export your data in a portable format, and opt out of marketing communications.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Children's Privacy</h2>
            <p className="text-sm leading-relaxed">
              The Service is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Changes to This Policy</h2>
            <p className="text-sm leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy and updating the "Last updated" date.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Contact</h2>
            <p className="text-sm leading-relaxed">
              For questions about this Privacy Policy, please contact us at privacy@thesis.app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

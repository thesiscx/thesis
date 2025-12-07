import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, FileSignature, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface SignAgreementStepProps {
  documentHtml: string;
  investorName: string;
  companyName: string;
  onSign: (signature: string) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function SignAgreementStep({ 
  documentHtml, 
  investorName,
  companyName,
  onSign, 
  onBack,
  isSubmitting 
}: SignAgreementStepProps) {
  const [signature, setSignature] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const documentRef = useRef<HTMLDivElement>(null);

  const handleSign = async () => {
    if (!signature.trim()) {
      setError('Please type your name to sign');
      return;
    }
    if (!agreedToTerms) {
      setError('Please agree to the terms');
      return;
    }
    
    setError(null);
    await onSign(signature);
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      // Dynamic import of html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Create a temporary container with the document
      const container = document.createElement('div');
      container.innerHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { 
                font-family: 'Times New Roman', Times, serif; 
                padding: 40px; 
                max-width: 800px; 
                margin: 0 auto; 
                line-height: 1.6;
                color: #333;
              }
              h1, h2, h3 { font-family: inherit; }
            </style>
          </head>
          <body>
            ${documentHtml}
          </body>
        </html>
      `;
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `SAFE-Agreement-${companyName.replace(/\s+/g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      await html2pdf().set(opt).from(container).save();
      toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          Review & Sign
        </h1>
        <p className="text-muted-foreground mt-2">
          Review the agreement below and sign to confirm your investment.
        </p>
      </div>

      {/* Document Preview */}
      <div className="border border-border rounded-lg overflow-hidden bg-white">
        <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">SAFE Agreement</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDownloadPdf} 
            className="gap-2"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </Button>
        </div>
        <ScrollArea className="h-[350px]">
          <div 
            ref={documentRef}
            className="p-6 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: documentHtml }}
          />
        </ScrollArea>
      </div>

      {/* Signature Section */}
      <div className="bg-muted/30 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 text-foreground">
          <FileSignature className="w-5 h-5" />
          <h2 className="font-medium">Electronic Signature</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          By typing your name below, you acknowledge that this constitutes your legal signature 
          and that you agree to the terms of this SAFE agreement pursuant to the Electronic 
          Signatures in Global and National Commerce Act (E-Sign Act) and the Uniform Electronic 
          Transactions Act (UETA).
        </p>

        <div className="space-y-2">
          <Label htmlFor="signature">Type your full legal name to sign</Label>
          <Input
            id="signature"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder={investorName}
            className="font-serif text-lg italic bg-background"
          />
          {signature && (
            <p className="text-sm text-muted-foreground">
              Signed as: <span className="font-serif italic">{signature}</span>
            </p>
          )}
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="agree"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
          />
          <Label htmlFor="agree" className="text-sm text-muted-foreground font-normal leading-relaxed cursor-pointer">
            I have read and agree to the terms of this SAFE agreement. I understand that this 
            constitutes a legally binding agreement and that my electronic signature has the 
            same legal effect as a handwritten signature.
          </Label>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={isSubmitting}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleSign} className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing...
            </>
          ) : (
            <>
              <FileSignature className="w-4 h-4 mr-2" />
              Sign Agreement
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

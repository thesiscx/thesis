import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvestorDetails {
  name: string;
  email: string;
  address: string;
  entityType: 'individual' | 'entity';
  entityName: string;
}

interface RoundTerms {
  valuation_cap: number | null;
  discount_rate: number | null;
  company_name: string | null;
  pro_rata_enabled: boolean | null;
  mfn_enabled: boolean | null;
}

interface GenerateRequest {
  investorDetails: InvestorDetails;
  amount: number;
  companyName: string;
  roundTerms: RoundTerms;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { investorDetails, amount, companyName, roundTerms }: GenerateRequest = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const investorName = investorDetails.entityType === 'entity' 
      ? investorDetails.entityName 
      : investorDetails.name;

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);

    const formattedValuationCap = roundTerms.valuation_cap 
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
        }).format(roundTerms.valuation_cap)
      : 'N/A';

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Use AI to generate a professional SAFE document
    const prompt = `Generate a professional Y Combinator Post-Money SAFE agreement with Valuation Cap. Use this exact format and fill in the details:

INVESTOR DETAILS:
- Investor Name: ${investorName}
- Investor Address: ${investorDetails.address || 'To be provided'}
- Investor Email: ${investorDetails.email}
- Entity Type: ${investorDetails.entityType === 'entity' ? 'Corporation/Entity' : 'Individual'}

COMPANY DETAILS:
- Company Name: ${companyName}
- Valuation Cap: ${formattedValuationCap}
- Discount Rate: ${roundTerms.discount_rate ? `${roundTerms.discount_rate}%` : 'None'}
- Pro-Rata Rights: ${roundTerms.pro_rata_enabled ? 'Yes' : 'No'}
- MFN: ${roundTerms.mfn_enabled ? 'Yes' : 'No'}

INVESTMENT:
- Purchase Amount: ${formattedAmount}
- Date: ${currentDate}

Generate ONLY the HTML content (no markdown, no code blocks) for a complete SAFE agreement including:
1. Header with "SAFE (Simple Agreement for Future Equity)"
2. Securities disclaimer
3. The main agreement paragraph with all parties and amounts
4. Section 1: Events (Equity Financing, Liquidity Event, Dissolution)
5. Section 2: Definitions (all standard SAFE definitions)
6. Section 3: Company Representations
7. Section 4: Investor Representations  
8. Section 5: Miscellaneous
9. Signature blocks for both Company and Investor

Use clean HTML with inline styles. Make it look professional and legally formatted. The valuation cap should be prominently featured in the conversion terms.`;

    console.log("Calling Lovable AI to generate SAFE document...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a legal document generator specializing in startup investment agreements. Generate clean, professional HTML for legal documents. Output ONLY valid HTML, no markdown or code blocks." 
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        // Fallback to template-based generation
        return new Response(JSON.stringify({ 
          documentHtml: generateFallbackDocument({ investorDetails, amount, companyName, roundTerms, currentDate, formattedAmount, formattedValuationCap, investorName })
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate document with AI");
    }

    const data = await response.json();
    let documentHtml = data.choices?.[0]?.message?.content || '';

    // Clean up any markdown code blocks if present
    documentHtml = documentHtml.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

    console.log("SAFE document generated successfully");

    return new Response(JSON.stringify({ documentHtml }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating SAFE document:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Fallback template-based generation if AI fails
function generateFallbackDocument({
  investorDetails,
  amount,
  companyName,
  roundTerms,
  currentDate,
  formattedAmount,
  formattedValuationCap,
  investorName,
}: {
  investorDetails: InvestorDetails;
  amount: number;
  companyName: string;
  roundTerms: RoundTerms;
  currentDate: string;
  formattedAmount: string;
  formattedValuationCap: string;
  investorName: string;
}): string {
  return `
    <div style="font-family: 'Times New Roman', Times, serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; color: #333;">
      <h1 style="text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 8px; letter-spacing: 2px;">
        SAFE
      </h1>
      <h2 style="text-align: center; font-size: 16px; color: #666; margin-bottom: 32px; font-weight: normal;">
        (Simple Agreement for Future Equity)
      </h2>
      
      <p style="margin-bottom: 20px; text-align: justify; font-size: 11px; text-transform: uppercase; color: #666;">
        THIS INSTRUMENT AND ANY SECURITIES ISSUABLE PURSUANT HERETO HAVE NOT BEEN REGISTERED 
        UNDER THE SECURITIES ACT OF 1933, AS AMENDED (THE "SECURITIES ACT"), OR UNDER THE 
        SECURITIES LAWS OF CERTAIN STATES. THESE SECURITIES MAY NOT BE OFFERED, SOLD OR 
        OTHERWISE TRANSFERRED, PLEDGED OR HYPOTHECATED EXCEPT AS PERMITTED UNDER THE ACT AND 
        APPLICABLE STATE SECURITIES LAWS PURSUANT TO AN EFFECTIVE REGISTRATION STATEMENT OR AN 
        EXEMPTION THEREFROM.
      </p>
      
      <p style="margin-bottom: 24px; text-align: justify;">
        <strong>${companyName}</strong>, a Delaware corporation (the "Company"), hereby certifies that in exchange for 
        the payment by <strong>${investorName}</strong> (the "Investor") of <strong>${formattedAmount}</strong> 
        (the "Purchase Amount") on or about ${currentDate}, the Company issues to the Investor 
        the right to certain shares of the Company's Capital Stock, subject to the terms 
        described below.
      </p>

      <p style="margin-bottom: 24px; text-align: justify;">
        The "Valuation Cap" is <strong>${formattedValuationCap}</strong>.
        ${roundTerms.discount_rate ? `The "Discount Rate" is <strong>${100 - roundTerms.discount_rate}%</strong>.` : ''}
      </p>

      <h3 style="font-size: 16px; font-weight: bold; margin-top: 32px; margin-bottom: 16px;">
        1. Events
      </h3>
      
      <p style="margin-bottom: 16px; text-align: justify; margin-left: 20px;">
        <strong>(a) Equity Financing.</strong> If there is an Equity Financing before the 
        termination of this Safe, on the initial closing of such Equity Financing, this Safe 
        will automatically convert into the number of shares of Safe Preferred Stock equal to 
        the Purchase Amount divided by the Conversion Price.
      </p>

      <p style="margin-bottom: 16px; text-align: justify; margin-left: 40px;">
        In connection with the automatic conversion of this Safe into shares of Safe Preferred Stock, 
        the Investor will execute and deliver to the Company all of the transaction documents related 
        to the Equity Financing.
      </p>

      <p style="margin-bottom: 16px; text-align: justify; margin-left: 20px;">
        <strong>(b) Liquidity Event.</strong> If there is a Liquidity Event before the 
        termination of this Safe, this Safe will automatically be entitled to receive a portion 
        of Proceeds, due and payable to the Investor immediately prior to, or concurrent with, 
        the consummation of such Liquidity Event, equal to the greater of (i) the Purchase Amount 
        (the "Cash-Out Amount") or (ii) the amount payable on the number of shares of Common Stock 
        equal to the Purchase Amount divided by the Liquidity Price.
      </p>

      <p style="margin-bottom: 16px; text-align: justify; margin-left: 20px;">
        <strong>(c) Dissolution Event.</strong> If there is a Dissolution Event before the 
        termination of this Safe, the Investor will automatically be entitled to receive a portion 
        of Proceeds equal to the Cash-Out Amount, due and payable to the Investor immediately prior 
        to the consummation of the Dissolution Event.
      </p>

      <h3 style="font-size: 16px; font-weight: bold; margin-top: 32px; margin-bottom: 16px;">
        2. Definitions
      </h3>
      
      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        "<strong>Capital Stock</strong>" means the capital stock of the Company, including, without limitation, 
        the "Common Stock" and the "Preferred Stock."
      </p>

      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        "<strong>Conversion Price</strong>" means the either: (1) the Safe Price or (2) the Discount Price, 
        whichever calculation results in a greater number of shares of Safe Preferred Stock.
      </p>

      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        "<strong>Equity Financing</strong>" means a bona fide transaction or series of transactions with the 
        principal purpose of raising capital, pursuant to which the Company issues and sells Preferred Stock 
        at a fixed valuation, including but not limited to, a pre-money or post-money valuation.
      </p>

      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        "<strong>Liquidity Price</strong>" means the price per share equal to the Valuation Cap divided by 
        the Liquidity Capitalization.
      </p>

      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        "<strong>Safe Price</strong>" means the price per share equal to the Valuation Cap divided by the 
        Company Capitalization.
      </p>

      <h3 style="font-size: 16px; font-weight: bold; margin-top: 32px; margin-bottom: 16px;">
        3. Company Representations
      </h3>
      
      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        (a) The Company is a corporation duly organized, validly existing and in good standing under the 
        laws of its state of incorporation, and has the power and authority to own, lease and operate 
        its properties and carry on its business as now conducted.
      </p>

      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        (b) The execution, delivery and performance by the Company of this Safe is within the power of 
        the Company and has been duly authorized by all necessary actions on the part of the Company.
      </p>

      <h3 style="font-size: 16px; font-weight: bold; margin-top: 32px; margin-bottom: 16px;">
        4. Investor Representations
      </h3>
      
      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        (a) The Investor has full legal capacity, power and authority to execute and deliver this Safe 
        and to perform its obligations hereunder.
      </p>

      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        (b) The Investor is an accredited investor as such term is defined in Rule 501 of Regulation D 
        under the Securities Act.
      </p>

      <h3 style="font-size: 16px; font-weight: bold; margin-top: 32px; margin-bottom: 16px;">
        5. Miscellaneous
      </h3>
      
      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        (a) Any provision of this Safe may be amended, waived or modified by written consent of the 
        Company and either (i) the Investor or (ii) the majority-in-interest of all then-outstanding Safes.
      </p>

      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        (b) This Safe and all rights and obligations hereunder shall be governed by and construed in 
        accordance with the laws of the State of Delaware.
      </p>

      ${roundTerms.pro_rata_enabled ? `
      <h3 style="font-size: 16px; font-weight: bold; margin-top: 32px; margin-bottom: 16px;">
        Pro-Rata Rights
      </h3>
      <p style="margin-bottom: 12px; text-align: justify; margin-left: 20px;">
        The Investor shall have a pro-rata right to participate in subsequent Equity Financings to maintain 
        their ownership percentage in the Company, subject to customary exceptions.
      </p>
      ` : ''}

      <div style="margin-top: 60px; padding-top: 32px; border-top: 2px solid #333;">
        <p style="font-weight: bold; margin-bottom: 24px; text-align: center;">
          IN WITNESS WHEREOF, the undersigned have caused this Safe to be duly executed and delivered.
        </p>
        
        <div style="display: flex; gap: 60px; margin-top: 40px;">
          <div style="flex: 1;">
            <p style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">COMPANY:</p>
            <p style="margin-bottom: 4px;">${companyName}</p>
            <div style="border-bottom: 1px solid #000; margin-top: 48px; margin-bottom: 4px;"></div>
            <p style="font-size: 12px; color: #666;">By: ________________________________</p>
            <p style="font-size: 12px; color: #666; margin-top: 4px;">Title: Authorized Signatory</p>
            <p style="font-size: 12px; color: #666; margin-top: 4px;">Date: ________________</p>
          </div>
          
          <div style="flex: 1;">
            <p style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">INVESTOR:</p>
            <p style="margin-bottom: 4px;">${investorName}</p>
            <p style="font-size: 12px; color: #666; margin-bottom: 4px;">${investorDetails.address || ''}</p>
            <div style="border-bottom: 1px solid #000; margin-top: 32px; margin-bottom: 4px;"></div>
            <p style="font-size: 12px; color: #666;">By: ${investorDetails.name}</p>
            <p style="font-size: 12px; color: #666; margin-top: 4px;">Date: ${currentDate}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

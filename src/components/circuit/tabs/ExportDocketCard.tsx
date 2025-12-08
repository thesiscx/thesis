import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileArchive, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusLine, StatusState } from "./StatusLine";
import { supabase } from "@/integrations/supabase/client";
import { useFounderAuth } from "@/contexts/FounderAuthContext";
import JSZip from "jszip";
import html2pdf from "html2pdf.js";

interface ExportDocketCardProps {
  roundId?: string;
  roundSlug?: string;
}

export function ExportDocketCard({ roundId }: ExportDocketCardProps) {
  const { user } = useFounderAuth();
  const [status, setStatus] = useState<StatusState>("idle");
  const [statusText, setStatusText] = useState("Ready to export");
  const [selectedDocketId, setSelectedDocketId] = useState<string>("");
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [isExportingSingle, setIsExportingSingle] = useState(false);

  // Fetch dockets for this round
  const { data: dockets = [] } = useQuery({
    queryKey: ["dockets", roundId],
    queryFn: async () => {
      if (!roundId) return [];
      const { data, error } = await supabase
        .from("dockets")
        .select("*, investors(name, email, entity_name, entity_type, address)")
        .eq("round_id", roundId)
        .eq("is_global", false)
        .order("docket_number", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!roundId,
  });

  // Fetch round terms
  const { data: roundTerms } = useQuery({
    queryKey: ["round-terms", roundId],
    queryFn: async () => {
      if (!roundId) return null;
      const { data, error } = await supabase
        .from("round_terms")
        .select("*")
        .eq("round_id", roundId)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!roundId,
  });

  // Fetch company profile
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const generateCoverSheetHtml = (docket: any) => {
    const investor = docket.investors;
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1a1a1a; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: 700; }
          .docket-id { font-size: 14px; background: #f0f0f0; padding: 6px 12px; border-radius: 4px; }
          .title { font-size: 28px; font-weight: 600; margin-bottom: 8px; }
          .subtitle { font-size: 14px; color: #666; margin-bottom: 40px; }
          .section { margin-bottom: 32px; }
          .section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #666; margin-bottom: 12px; letter-spacing: 0.5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .info-item { }
          .info-label { font-size: 11px; color: #888; margin-bottom: 2px; }
          .info-value { font-size: 14px; font-weight: 500; }
          .status-timeline { margin-top: 40px; }
          .status-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #eee; }
          .status-dot { width: 10px; height: 10px; border-radius: 50%; background: #ddd; }
          .status-dot.active { background: #22c55e; }
          .status-dot.current { background: #3b82f6; }
          .status-label { font-size: 13px; flex: 1; }
          .status-date { font-size: 12px; color: #888; }
          .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; font-size: 11px; color: #888; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Circuit</div>
          <div class="docket-id">${docket.docket_id || 'N/A'}</div>
        </div>
        
        <div class="title">${profile?.company_name || 'Company'} Investment Docket</div>
        <div class="subtitle">Cover Sheet • Generated ${new Date().toLocaleDateString()}</div>
        
        <div class="section">
          <div class="section-title">Investor Details</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Name</div>
              <div class="info-value">${investor?.name || docket.investor_name || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${investor?.email || docket.investor_email || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Entity Type</div>
              <div class="info-value">${investor?.entity_type || docket.investor_entity_type || 'Individual'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Entity Name</div>
              <div class="info-value">${investor?.entity_name || docket.investor_entity_name || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Investment Details</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Investment Amount</div>
              <div class="info-value">${docket.amount ? formatCurrency(docket.amount) : 'Not specified'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Instrument Type</div>
              <div class="info-value">SAFE</div>
            </div>
            <div class="info-item">
              <div class="info-label">Valuation Cap</div>
              <div class="info-value">${roundTerms?.valuation_cap ? formatCurrency(roundTerms.valuation_cap) : 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Discount Rate</div>
              <div class="info-value">${roundTerms?.discount_rate ? `${roundTerms.discount_rate}%` : 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Pro Rata Rights</div>
              <div class="info-value">${roundTerms?.pro_rata_enabled ? 'Yes' : 'No'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">MFN</div>
              <div class="info-value">${roundTerms?.mfn_enabled ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
        
        <div class="section status-timeline">
          <div class="section-title">Deal Status</div>
          ${['Drafted', 'Viewed', 'Signed', 'Executed', 'Funded'].map(stage => {
            const statusOrder = ['Drafted', 'Viewed', 'Signed', 'Executed', 'Funded'];
            const currentIndex = statusOrder.indexOf(docket.status);
            const stageIndex = statusOrder.indexOf(stage);
            const isActive = stageIndex <= currentIndex;
            const isCurrent = stage === docket.status;
            return `
              <div class="status-item">
                <div class="status-dot ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}"></div>
                <div class="status-label">${stage}</div>
                <div class="status-date">${isCurrent ? new Date(docket.updated_at).toLocaleDateString() : ''}</div>
              </div>
            `;
          }).join('')}
        </div>
        
        <div class="footer">
          Generated by Circuit • ${new Date().toISOString()}
        </div>
      </body>
      </html>
    `;
  };

  const handleExportAll = async () => {
    if (dockets.length === 0) return;
    
    setIsExportingAll(true);
    setStatus("loading");
    setStatusText("Generating export package...");
    
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < dockets.length; i++) {
        const docket = dockets[i];
        const folderName = docket.docket_id || `docket-${i + 1}`;
        const folder = zip.folder(folderName);
        
        if (!folder) continue;
        
        setStatusText(`Processing ${folderName}... (${i + 1}/${dockets.length})`);
        
        // Generate cover sheet PDF
        const coverSheetHtml = generateCoverSheetHtml(docket);
        const coverSheetElement = document.createElement("div");
        coverSheetElement.innerHTML = coverSheetHtml;
        document.body.appendChild(coverSheetElement);
        
        try {
          const coverPdf = await html2pdf()
            .from(coverSheetElement)
            .set({
              margin: 0,
              filename: "cover-sheet.pdf",
              image: { type: "jpeg", quality: 0.98 },
              html2canvas: { scale: 2 },
              jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
            })
            .outputPdf("blob");
          
          folder.file("cover-sheet.pdf", coverPdf);
        } finally {
          document.body.removeChild(coverSheetElement);
        }
      }
      
      setStatusText("Creating ZIP file...");
      const content = await zip.generateAsync({ type: "blob" });
      
      // Download
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dockets-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setStatus("success");
      setStatusText(`Exported ${dockets.length} dockets`);
    } catch (err) {
      console.error("Export failed:", err);
      setStatus("error");
      setStatusText("Export failed");
    } finally {
      setIsExportingAll(false);
      setTimeout(() => {
        setStatus("idle");
        setStatusText("Ready to export");
      }, 3000);
    }
  };

  const handleExportSingle = async () => {
    if (!selectedDocketId) return;
    
    const docket = dockets.find(d => d.id === selectedDocketId);
    if (!docket) return;
    
    setIsExportingSingle(true);
    setStatus("loading");
    setStatusText("Generating cover sheet...");
    
    try {
      const coverSheetHtml = generateCoverSheetHtml(docket);
      const coverSheetElement = document.createElement("div");
      coverSheetElement.innerHTML = coverSheetHtml;
      document.body.appendChild(coverSheetElement);
      
      try {
        await html2pdf()
          .from(coverSheetElement)
          .set({
            margin: 0,
            filename: `${docket.docket_id || 'docket'}-cover-sheet.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
          })
          .save();
        
        setStatus("success");
        setStatusText("Cover sheet downloaded");
      } finally {
        document.body.removeChild(coverSheetElement);
      }
    } catch (err) {
      console.error("Export failed:", err);
      setStatus("error");
      setStatusText("Export failed");
    } finally {
      setIsExportingSingle(false);
      setTimeout(() => {
        setStatus("idle");
        setStatusText("Ready to export");
      }, 3000);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-transparent overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Download className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Export Dockets</span>
        </div>
        
        <div className="p-4 space-y-6">
          {/* Export All Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileArchive className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Export All</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Download all dockets as a ZIP file with cover sheets
            </p>
            <Button
              size="sm"
              onClick={handleExportAll}
              disabled={dockets.length === 0 || isExportingAll}
              className="w-full"
            >
              {isExportingAll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileArchive className="w-4 h-4 mr-2" />
                  Export All ({dockets.length})
                </>
              )}
            </Button>
          </div>
          
          <div className="border-t border-border" />
          
          {/* Export Individual Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Export Individual</span>
            </div>
            
            <Select value={selectedDocketId} onValueChange={setSelectedDocketId}>
              <SelectTrigger className="bg-transparent">
                <SelectValue placeholder="Select a docket" />
              </SelectTrigger>
              <SelectContent>
                {dockets.map((docket) => (
                  <SelectItem key={docket.id} value={docket.id}>
                    {docket.docket_id} • {docket.investors?.name || docket.investor_name || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportSingle}
              disabled={!selectedDocketId || isExportingSingle}
              className="w-full"
            >
              {isExportingSingle ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Cover Sheet
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      <StatusLine 
        status={status} 
        idleText={statusText}
        loadingText={statusText}
        successText={statusText}
        errorText={statusText}
      />
    </>
  );
}

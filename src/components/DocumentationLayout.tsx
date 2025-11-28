import { useNavigate } from "react-router-dom";
import { LogOut, Download, Loader2, Check } from "lucide-react";
import { useStakeholderAuth } from "@/contexts/StakeholderAuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import robomartLogo from "@/assets/robomart-icon.png";
import JSZip from "jszip";

interface TocItem {
  id: string;
  label: string;
  level: number;
}

interface DocumentationLayoutProps {
  children: React.ReactNode;
  tocItems: TocItem[];
}

interface DownloadFile {
  name: string;
  status: "pending" | "downloading" | "done" | "error";
}

interface DownloadProgress {
  isOpen: boolean;
  stage: "idle" | "fetching" | "downloading" | "zipping" | "complete";
  files: DownloadFile[];
  currentIndex: number;
}

export default function DocumentationLayout({ children, tocItems }: DocumentationLayoutProps) {
  const navigate = useNavigate();
  const { stakeholderSession, clearStakeholderSession } = useStakeholderAuth();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    isOpen: false,
    stage: "idle",
    files: [],
    currentIndex: -1,
  });
  const mainRef = useRef<HTMLElement>(null);
  const isScrollingRef = useRef(false);

  // Auto-scroll progress panel to current downloading item
  useEffect(() => {
    if (downloadProgress.isOpen && downloadProgress.currentIndex >= 0) {
      const currentItem = document.getElementById(`download-item-${downloadProgress.currentIndex}`);
      if (currentItem) {
        currentItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [downloadProgress.currentIndex, downloadProgress.isOpen]);

  // Set initial active section
  useEffect(() => {
    if (tocItems.length > 0 && !activeSection) {
      setActiveSection(tocItems[0].id);
    }
  }, [tocItems, activeSection]);

  // Scroll spy using IntersectionObserver
  useEffect(() => {
    if (tocItems.length === 0) return;

    const observers: IntersectionObserver[] = [];
    const visibleSections = new Set<string>();

    tocItems.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        const observer = new IntersectionObserver(
          (entries) => {
            // Skip updates during click-initiated scrolls
            if (isScrollingRef.current) return;
            
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                visibleSections.add(id);
              } else {
                visibleSections.delete(id);
              }

              // Find the first visible section in document order
              const firstVisible = tocItems.find((s) => visibleSections.has(s.id));
              if (firstVisible) {
                setActiveSection(firstVisible.id);
              }
            });
          },
          { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
        );
        observer.observe(element);
        observers.push(observer);
      }
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, [tocItems]);

  const handleSignOut = () => {
    clearStakeholderSession();
    navigate("/login");
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id); // Immediately update active section on click
    isScrollingRef.current = true; // Disable scroll spy during click scroll
    
    const element = document.getElementById(id);
    if (element) {
      // Offset for fixed header (56px) + TOC top padding (40px) to align with TOC start
      const headerOffset = 96;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
    
    // Re-enable scroll spy after scroll completes
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 800);
  };

  const handleDownloadPackage = async () => {
    setIsDownloading(true);
    setDownloadProgress({ isOpen: true, stage: "fetching", files: [], currentIndex: -1 });

    try {
      // Get the access key from stakeholder session
      const sessionData = localStorage.getItem("stakeholder_session");
      const accessKey = sessionData ? JSON.parse(sessionData).accessKey : null;

      if (!accessKey) {
        throw new Error("No access key found. Please log in again.");
      }

      // Call edge function to get signed URLs
      const { data, error } = await supabase.functions.invoke("get-document-urls", {
        body: { accessKey },
      });

      if (error) throw error;

      if (!data.files || data.files.length === 0) {
        setDownloadProgress((prev) => ({ ...prev, isOpen: false, stage: "idle" }));
        toast({
          title: "No documents available",
          description: "There are no documents in the package yet.",
          variant: "destructive",
        });
        return;
      }

      // Initialize files list with pending status
      const filesList: DownloadFile[] = data.files.map((f: { name: string }) => ({
        name: f.name,
        status: "pending" as const,
      }));
      setDownloadProgress((prev) => ({ ...prev, stage: "downloading", files: filesList }));

      // Create ZIP using signed URLs
      const zip = new JSZip();

      for (let i = 0; i < data.files.length; i++) {
        const file = data.files[i];

        // Update current file to downloading
        setDownloadProgress((prev) => ({
          ...prev,
          currentIndex: i,
          files: prev.files.map((f, idx) => (idx === i ? { ...f, status: "downloading" } : f)),
        }));

        try {
          const response = await fetch(file.url);
          if (!response.ok) {
            throw new Error(`Failed to download`);
          }
          const blob = await response.blob();
          zip.file(file.name, blob);

          // Mark as done
          setDownloadProgress((prev) => ({
            ...prev,
            files: prev.files.map((f, idx) => (idx === i ? { ...f, status: "done" } : f)),
          }));
        } catch {
          // Mark as error but continue
          setDownloadProgress((prev) => ({
            ...prev,
            files: prev.files.map((f, idx) => (idx === i ? { ...f, status: "error" } : f)),
          }));
        }
      }

      // Update to zipping stage
      setDownloadProgress((prev) => ({ ...prev, stage: "zipping" }));

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "robomart-nhtsa-petition-documents.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Mark complete
      setDownloadProgress((prev) => ({ ...prev, stage: "complete" }));

      toast({
        title: "Download complete",
        description: `Downloaded ${data.files.length} document(s) as ZIP`,
      });
    } catch (error: any) {
      console.error("Download error:", error);
      setDownloadProgress((prev) => ({ ...prev, isOpen: false, stage: "idle" }));
      toast({
        title: "Download failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const getStageLabel = () => {
    switch (downloadProgress.stage) {
      case "fetching":
        return "Fetching document list...";
      case "downloading":
        return `Downloading ${downloadProgress.currentIndex + 1}/${downloadProgress.files.length}`;
      case "zipping":
        return "Creating ZIP...";
      case "complete":
        return "Complete!";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 px-6 border-b border-border flex items-center justify-between bg-background sticky top-0 z-50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              if (tocItems.length > 0) {
                setActiveSection(tocItems[0].id);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
          >
            <img src={robomartLogo} alt="Robomart" className="h-5 w-auto" />
            <span className="text-sm font-medium">Robomart Part 555 Petition</span>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{stakeholderSession?.name}</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Exit
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1">
        {/* Left sidebar - TOC */}
        <aside className="w-72 sticky top-14 h-[calc(100vh-3.5rem)] flex flex-col">
          <div className="flex-1 pt-10 px-6 pb-6 overflow-y-auto">
            {tocItems.length > 0 ? (
              <nav className="space-y-1">
                {tocItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full text-left text-sm py-1 transition-colors ${
                      activeSection === item.id
                        ? "text-foreground font-medium"
                        : "text-muted-foreground/80 hover:text-foreground"
                    }`}
                    style={{ paddingLeft: `${(item.level - 1) * 12 + 12}px` }}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            ) : (
              <p className="text-sm text-muted-foreground italic px-3">No headings available</p>
            )}
          </div>

          {/* Download Package Box */}
          <div className="p-6">
            {/* Progress Panel - opens above button */}
            {downloadProgress.isOpen && (
              <div className="mb-3 p-3 bg-muted/50 rounded-lg border border-border animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{getStageLabel()}</span>
                  {downloadProgress.stage === "complete" && (
                    <button
                      onClick={() => setDownloadProgress({ isOpen: false, stage: "idle", files: [], currentIndex: -1 })}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Close
                    </button>
                  )}
                </div>
                {downloadProgress.files.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {downloadProgress.files.map((file, idx) => (
                      <div
                        key={idx}
                        id={`download-item-${idx}`}
                        className={`flex items-center gap-2 text-xs ${
                          file.status === "pending"
                            ? "text-muted-foreground/50"
                            : file.status === "error"
                              ? "text-destructive"
                              : "text-foreground"
                        }`}
                      >
                        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                          {file.status === "done" && <Check className="w-3 h-3 text-green-600" />}
                          {file.status === "downloading" && <Loader2 className="w-3 h-3 animate-spin" />}
                          {file.status === "pending" && <span className="text-muted-foreground/40">○</span>}
                          {file.status === "error" && <span className="text-destructive">✕</span>}
                        </div>
                        <span className="truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {downloadProgress.stage === "zipping" && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Creating ZIP archive...</span>
                  </div>
                )}
                {downloadProgress.stage === "complete" && (
                  <div className="flex items-center gap-2 text-xs text-green-600 mt-2">
                    <Check className="w-3 h-3" />
                    <span>Download complete!</span>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <h4 className="text-sm font-medium mb-2">Document Package</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Download all supporting documents as individual files
              </p>
              <Button size="sm" className="w-full" onClick={handleDownloadPackage} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download Package
              </Button>
            </div>
          </div>
        </aside>

        {/* Content area - generous padding */}
        <main className="flex-1 pl-[7.5rem] pr-48 pt-2 pb-10 overflow-y-auto">
          <div className="max-w-4xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

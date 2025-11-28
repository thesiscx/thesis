import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle2, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function DocumentMigration() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadFiles = async (files: FileList) => {
    setIsUploading(true);
    setProgress(0);
    setUploadedFiles([]);

    const fileArray = Array.from(files);
    let successCount = 0;
    let failCount = 0;
    const uploaded: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      // Only accept PDF files
      if (file.type !== 'application/pdf') {
        failCount++;
        continue;
      }

      try {
        // Upload to storage bucket with upsert:true to replace existing
        const { error } = await supabase.storage
          .from('documents')
          .upload(file.name, file, {
            contentType: 'application/pdf',
            upsert: true, // This replaces files with the same name
          });

        if (error) throw error;

        successCount++;
        uploaded.push(file.name);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        failCount++;
      }

      setProgress(((i + 1) / fileArray.length) * 100);
    }

    setIsUploading(false);
    setUploadedFiles(uploaded);

    toast({
      title: "Upload Complete",
      description: `${successCount} file(s) uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ''}.`,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>Document Upload Tool</CardTitle>
          <CardDescription>
            Upload PDF documents to secure storage. Files with the same name will be replaced.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClick}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              ${isUploading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            {isUploading ? (
              <div className="space-y-3">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                <p className="text-sm font-medium">Uploading... {Math.round(progress)}%</p>
                <Progress value={progress} className="w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    Drag and drop PDF files here, or click to select
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only PDF files are accepted. Files with duplicate names will be replaced.
                  </p>
                </div>
              </div>
            )}
          </div>

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <p>Successfully uploaded:</p>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {uploadedFiles.map((filename, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span>{filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

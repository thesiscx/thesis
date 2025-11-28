import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle2, FileText, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface StoredDocument {
  id: string;
  name: string;
  file_path: string;
  size: number | null;
  uploaded_at: string | null;
}

export function DocumentsTab() {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: storedDocuments = [], isLoading: isLoadingDocs } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, file_path, size, uploaded_at')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
  });

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
      
      if (file.type !== 'application/pdf') {
        failCount++;
        continue;
      }

      try {
        // Upload to storage bucket
        const { error: storageError } = await supabase.storage
          .from('documents')
          .upload(file.name, file, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (storageError) throw storageError;

        // Sync to database table
        const { error: dbError } = await supabase
          .from('documents')
          .upsert({
            name: file.name,
            file_path: file.name,
            display_name: file.name.replace('.pdf', ''),
            category: 'general',
            mime_type: 'application/pdf',
            size: file.size,
            is_public: false,
          }, {
            onConflict: 'file_path'
          });

        if (dbError) {
          console.error('Database sync error:', dbError);
        }

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

    // Invalidate caches
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['adminStats'] });
  };

  const deleteDocument = async (doc: StoredDocument) => {
    setDeletingFile(doc.id);
    try {
      // Delete from storage bucket
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database table
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) {
        console.error('Database delete error:', dbError);
      }

      toast({
        title: "Deleted",
        description: `${doc.name} has been removed.`,
      });

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document.",
        variant: "destructive",
      });
    } finally {
      setDeletingFile(null);
    }
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Upload Tool</CardTitle>
        <CardDescription>
          Upload PDF documents to secure storage. Files with the same name will be replaced.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {uploadedFiles.map((filename, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>{filename}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stored Documents Section */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-3">Stored Documents</h3>
          {isLoadingDocs ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading documents...</span>
            </div>
          ) : storedDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {storedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm truncate">{doc.name}</span>
                    {doc.size && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({formatFileSize(doc.size)})
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDocument(doc)}
                    disabled={deletingFile === doc.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    {deletingFile === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

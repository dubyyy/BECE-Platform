"use client"
import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToastProvider, useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";

interface UploadProgress {
  progress: number;
  phase: string;
  message: string;
}

interface UploadErrorDetail {
  row: number;
  error: string;
}

interface UploadCompleteData {
  phase: 'complete';
  message: string;
  totalProcessed?: number;
  errors?: UploadErrorDetail[];
}

const ResultFormContent = () => {
  const { addToast } = useToast();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    phase: '',
    message: '',
  });

  const validateAndSetFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      addToast({
        variant: "error",
        title: "Invalid File",
        description: "Please upload a CSV file.",
        duration: 4000,
      });
      return;
    }
    setCsvFile(file);
    addToast({
      variant: "success",
      title: "File Selected",
      description: `${file.name} ready for upload.`,
      duration: 3000,
    });
  }, [addToast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  }, [validateAndSetFile]);

  const handleCSVUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!csvFile) {
      addToast({
        variant: "error",
        title: "No File Selected",
        description: "Please select a CSV file to upload.",
        duration: 4000,
      });
      return;
    }

    setIsUploadingCSV(true);
    setUploadProgress({ progress: 0, phase: 'starting', message: 'Preparing upload...' });

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      // Use streaming for progress updates
      const response = await fetch('/api/results/bulk', {
        method: 'POST',
        headers: {
          'Accept': 'text/event-stream',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload CSV');
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Stream not available');
      }

      let finalData: UploadCompleteData | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as unknown;
              const typed = data as Partial<UploadProgress> & Partial<UploadCompleteData>;
              
              setUploadProgress({
                progress: typed.progress || 0,
                phase: typed.phase || '',
                message: typed.message || '',
              });

              if (typed.phase === 'complete' && typeof typed.message === 'string') {
                finalData = typed as UploadCompleteData;
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      if (finalData) {
        // Show success toast
        addToast({
          variant: "success",
          title: "Upload Successful!",
          description: `${finalData.message}. Total processed: ${finalData.totalProcessed}${finalData.errors ? `, Errors: ${finalData.errors.length}` : ''}`,
          duration: 7000,
        });

        // Show errors if any
        if (finalData.errors && finalData.errors.length > 0) {
          const errorDetails = finalData.errors.slice(0, 5).map((err) => 
            `Row ${err.row}: ${err.error}`
          ).join('\n');
          
          addToast({
            variant: "error",
            title: "Some Records Failed",
            description: errorDetails + (finalData.errors.length > 5 ? `\n...and ${finalData.errors.length - 5} more errors` : ''),
            duration: 10000,
          });
        }
      }

      // Reset file input
      setCsvFile(null);
      const fileInput = document.getElementById('csv-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      addToast({
        variant: "error",
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'Failed to upload CSV. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsUploadingCSV(false);
      setUploadProgress({ progress: 0, phase: '', message: '' });
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Upload Examination Results</h1>
          <p className="text-muted-foreground">Bulk upload student examination results via CSV</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Bulk Upload via CSV
            </CardTitle>
            <CardDescription>
              Upload a CSV file with student results. The file must include the following columns:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* CSV Format Info */}
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Required CSV Format:</h3>
                <code className="text-xs block overflow-x-auto whitespace-pre-wrap">
                  SESSIONYR, FNAME, MNAME, LNAME, DATEOFBIRTH, SEXCD, INSTITUTIONCD, SCHOOLCOBE/SCHOOLCODE, LGACD, EXAMINATIONNO, ENG, ENGGRD, MTH, MTHGRD, BST, BSTGRD, RGS, RGSGRD, HST, HSTGRD, ARB, ARBGRD, CCA, CCAGRD, FRE, FREGRD, NVS, NVSGRD, LLG, LLGGRD, PVS, PVSGRD, BUS, BUSGRD, REMARK, ACCESS PIN, rgsType
                </code>
              </div>

              <form onSubmit={handleCSVUpload} className="space-y-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragOver
                      ? 'border-primary bg-primary/10'
                      : csvFile
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                  onClick={() => document.getElementById('csv-file')?.click()}
                >
                  <input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2">
                    {csvFile ? (
                      <>
                        <FileSpreadsheet className="h-12 w-12 text-green-500" />
                        <p className="font-medium text-green-600">{csvFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Click or drop another file to replace
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className={`h-12 w-12 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="font-medium">
                          {isDragOver ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          or click to browse
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full md:w-auto px-12"
                    disabled={!csvFile || isUploadingCSV}
                  >
                    {isUploadingCSV ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload CSV
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Loading Overlay with Progress */}
              {isUploadingCSV && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                  <div className="bg-card border rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="relative">
                        <Loader2 className="h-16 w-16 animate-spin text-primary" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">
                            {uploadProgress.progress}%
                          </span>
                        </div>
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-semibold">
                          {uploadProgress.phase === 'validating' && 'Validating Records'}
                          {uploadProgress.phase === 'inserting' && 'Saving to Database'}
                          {uploadProgress.phase === 'complete' && 'Upload Complete!'}
                          {(!uploadProgress.phase || uploadProgress.phase === 'starting') && 'Processing CSV File'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {uploadProgress.message || 'Please wait while we process your examination results...'}
                        </p>
                      </div>
                      <div className="w-full space-y-2">
                        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all duration-300 ease-out"
                            style={{ width: `${uploadProgress.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {uploadProgress.phase === 'validating' && 'Phase 1/2: Validation'}
                            {uploadProgress.phase === 'inserting' && 'Phase 2/2: Database Insert'}
                            {uploadProgress.phase === 'complete' && 'Completed'}
                            {(!uploadProgress.phase || uploadProgress.phase === 'starting') && 'Starting...'}
                          </span>
                          <span>{uploadProgress.progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Instructions:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Ensure your CSV file follows the exact format shown above</li>
                  <li>All examination numbers must be unique</li>
                  <li>Required fields: SESSIONYR, EXAMINATIONNO, and at least one name field</li>
                  <li>The system will skip duplicate examination numbers</li>
                  <li>Any errors will be reported after upload</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ResultForm = () => {
  return (
    <ToastProvider>
      <ResultFormContent />
    </ToastProvider>
  );
};

export default ResultForm;
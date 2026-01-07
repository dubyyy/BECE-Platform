"use client"
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ToastProvider, useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";

const ResultFormContent = () => {
  const { addToast } = useToast();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
    }
  };

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

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch('/api/results/bulk', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload CSV');
      }

      // Show success toast
      addToast({
        variant: "success",
        title: "Upload Successful!",
        description: `${data.message}. Total processed: ${data.totalProcessed}${data.errors ? `, Errors: ${data.errors.length}` : ''}`,
        duration: 7000,
      });

      // Show errors if any
      if (data.errors && data.errors.length > 0) {
        const errorDetails = data.errors.slice(0, 5).map((err: any) => 
          `Row ${err.row}: ${err.error}`
        ).join('\n');
        
        addToast({
          variant: "error",
          title: "Some Records Failed",
          description: errorDetails + (data.errors.length > 5 ? `\n...and ${data.errors.length - 5} more errors` : ''),
          duration: 10000,
        });
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
                <code className="text-xs block overflow-x-auto">
                  SESSIONYR, FNAME, MNAME, LNAME, DATEOFBIRTH, SEXCD, INSTITUTIONCD, SCHOOLCODE, LGACD, EXAMINATIONNO, ENG, ENGGRD, ARIT, ARITGRD, GP, GPGRD, RGS, RGSGRD, RGSTYPE, REMARK, ACCCESS_PIN
                </code>
              </div>

              <form onSubmit={handleCSVUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">Select CSV File</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    {csvFile && (
                      <span className="text-sm text-muted-foreground">
                        {csvFile.name}
                      </span>
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

              {/* Loading Overlay */}
              {isUploadingCSV && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                  <div className="bg-card border rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
                    <div className="flex flex-col items-center space-y-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-semibold">Processing CSV File</h3>
                        <p className="text-sm text-muted-foreground">
                          Please wait while we upload and process your examination results...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          This may take a few moments depending on file size
                        </p>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div className="bg-primary h-full animate-pulse" style={{ width: '100%' }} />
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
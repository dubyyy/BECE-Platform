"use client"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Printer, Download } from "lucide-react";
import Link from 'next/link';
import { useState } from "react";

const PrimaryResult = () => {
  const [formData, setFormData] = useState({
    accessPin: "",
    examNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResultData(null);

    try {
      const response = await fetch(
        `/api/results?accessPin=${encodeURIComponent(formData.accessPin)}&examNumber=${encodeURIComponent(formData.examNumber)}`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch result');
        console.error("Error:", data);
        return;
      }

      console.log("✅ Result fetched successfully!");
      setResultData(data);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMsg);
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!resultData) return;
    
    setDownloadingPDF(true);
    try {
      const response = await fetch(
        `/api/results/pdf?accessPin=${encodeURIComponent(formData.accessPin)}&examNumber=${encodeURIComponent(formData.examNumber)}`
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to generate PDF');
        return;
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Result_${resultData.examinationNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to download PDF';
      setError(errorMsg);
      console.error("PDF Download Error:", err);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const formatPrintedDate = (date: Date) => {
    const d = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return d.replace(/\s/g, '-');
  };

  const handlePrint = (withPassport: boolean = true) => {
    if (!resultData) return;

    console.log('DEBUG: resultData.dateOfBirth =', resultData.dateOfBirth);
    const candidateName = [resultData.fName, resultData.mName, resultData.lName].filter(Boolean).join(' ');
    const year = resultData.sessionYr || 'N/A';
    const printedDate = formatPrintedDate(new Date());
    const dateOfBirth = resultData.dateOfBirth 
      ? new Date(resultData.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A';
    const logoUrl = `${window.location.origin}/delta-logo.png`;
    const passportUrl = withPassport ? (resultData.passport || '') : '';
    const religiousSubject = resultData.rgstype === 'IRS' 
      ? 'ISLAMIC RELIGIOUS STUDIES' 
      : resultData.rgstype === 'CRS' 
      ? 'CHRISTIAN RELIGIOUS STUDIES'
      : resultData.rgstype === '1'
      ? 'CHRISTIAN RELIGIOUS STUDIES'
      : resultData.rgstype === '2'
      ? 'ISLAMIC RELIGIOUS STUDIES'
      : 'RELIGIOUS STUDIES';
    
    // Build subjects array dynamically - only include subjects with grades
    const allSubjects = [
      { subject: 'ENGLISH STUDIES', grade: resultData.engGrd },
      { subject: 'MATHEMATICS', grade: resultData.mthGrd || resultData.aritGrd },
      { subject: 'BASIC SCIENCE & TECHNOLOGY', grade: resultData.bstGrd },
      { subject: 'GENERAL PAPER', grade: resultData.gpGrd },
      { subject: religiousSubject, grade: resultData.rgsGrd },
      { subject: 'HISTORY', grade: resultData.hstGrd },
      { subject: 'ARABIC', grade: resultData.arbGrd },
      { subject: 'CULTURAL & CREATIVE ARTS', grade: resultData.ccaGrd },
      { subject: 'FRENCH', grade: resultData.freGrd },
      { subject: 'NATIONAL VALUES', grade: resultData.nvsGrd },
      { subject: 'LANGUAGE (VERNACULAR)', grade: resultData.llgGrd },
      { subject: 'PRE-VOCATIONAL STUDIES', grade: resultData.pvsGrd },
      { subject: 'BUSINESS STUDIES', grade: resultData.busGrd },
    ];
    const subjects = allSubjects.filter(s => s.grade && s.grade !== 'N/A');

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Primary Result</title>
  <style>
    @page { size: A4; margin: 12mm; }
    html, body { height: 100%; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; }
    .paper { max-width: 760px; margin: 0 auto; }
    .outer { border: 1px dotted #000; padding: 10px; }
    .inner { border: 1px solid #000; padding: 12px; }
    .center { text-align: center; }
    .title1 { font-weight: 700; font-size: 14px; letter-spacing: 0.3px; }
    .title2 { font-weight: 700; font-size: 12px; margin-top: 6px; }
    .title3 { font-weight: 700; font-size: 12px; }
    .subtitle { font-weight: 700; font-size: 12px; margin-top: 2px; }
    .logoWrap { margin: 10px 0 6px; display: flex; justify-content: center; }
    .logo { width: 74px; height: 74px; object-fit: contain; }
    .metaRow { display: flex; justify-content: space-between; gap: 16px; font-size: 12px; margin: 8px 0; padding: 6px 0; border-top: 1px dotted #999; border-bottom: 1px dotted #999; }
    .infoTable { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
    .infoTable td { padding: 6px 8px; border-bottom: 1px dotted #999; vertical-align: top; }
    .infoTable tr:last-child td { border-bottom: 0; }
    .passportPhoto { width: 100px; height: 120px; object-fit: cover; border: 1px solid #000; }
    .infoSection { display: flex; gap: 10px; align-items: flex-start; }
    .sectionBox { border: 1px solid #000; margin-top: 10px; }
    .sectionInner { padding: 8px; }
    .gradesTable { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 2px; }
    .gradesTable th { text-align: left; padding: 6px 8px; border-bottom: 1px solid #000; }
    .gradesTable td { padding: 6px 8px; border-bottom: 1px dotted #999; }
    .gradesTable tr:last-child td { border-bottom: 0; }
    .remark { font-size: 12px; margin-top: 10px; padding-top: 8px; border-top: 1px dotted #999; }
    .actions { display: flex; justify-content: center; gap: 10px; margin-top: 12px; padding-top: 8px; border-top: 1px dotted #999; }
    .btn { font-size: 12px; padding: 4px 14px; border: 1px solid #000; background: #f3f3f3; cursor: pointer; }
    .footer { margin-top: 10px; padding-top: 8px; border-top: 1px dotted #999; text-align: center; font-size: 12px; }
    .footerSmall { font-size: 11px; margin-top: 2px; }
    @media print {
      .actions { display: none !important; }
      .paper { max-width: none; }
    }
  </style>
</head>
<body>
  <div class="paper">
    <div class="outer">
      <div class="inner">
        <div class="center">
          <div class="title1">FEDERAL REPUBLIC OF NIGERIA</div>
          <div class="logoWrap"><img class="logo" src="${logoUrl}" alt="Logo" /></div>
          <div class="title2">Ministry of secondary education</div>
          <div class="subtitle">Cognitive/Placement Certification Result</div>
        </div>

        <div class="metaRow">
          <div>Year: ${year}</div>
          <div>Date Printed: ${printedDate}</div>
        </div>

        <div class="sectionBox">
          <div class="sectionInner">
            <div class="infoSection">
              ${passportUrl ? `<img class="passportPhoto" src="${passportUrl}" alt="Passport" />` : ''}
              <table class="infoTable" style="flex: 1;">
                <tr>
                  <td>Candidate Name: ${candidateName || 'N/A'} Sex: ${resultData.sexCd || 'N/A'}</td>
                </tr>
                ${withPassport ? `<tr>
                  <td>Date of Birth: ${dateOfBirth}</td>
                </tr>` : ''}
                <tr>
                  <td>School : ${resultData.schoolName || 'N/A'}</td>
                </tr>
                <tr>
                  <td>Local Government Area: ${resultData.lgaCd || 'N/A'}</td>
                </tr>
                <tr>
                  <td>Examination Number: ${resultData.examinationNo || 'N/A'}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>

        <div class="sectionBox">
          <div class="sectionInner">
            <table class="gradesTable">
              <thead>
                <tr>
                  <th style="width:70%">Subject(s)</th>
                  <th style="width:30%">Grade</th>
                </tr>
              </thead>
              <tbody>
                ${subjects
                  .map(
                    (s) => `\n                <tr><td>${s.subject}</td><td>${s.grade}</td></tr>`
                  )
                  .join('')}
              </tbody>
            </table>

            <div class="remark">Remark: ${resultData.remark || 'N/A'}</div>
          </div>
        </div>

        <div class="actions">
          <button class="btn" onclick="window.close()">Close</button>
          <button class="btn" onclick="window.print()">Print</button>
        </div>

        <div class="footer">
          <div>Ministry of secondary education</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    
    const printWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      setError('Popup blocked. Please allow popups to print.');
      URL.revokeObjectURL(blobUrl);
      return;
    }

    printWindow.onload = () => {
      URL.revokeObjectURL(blobUrl);
    };
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
   
      
      <main className="flex-1 container mx-auto px-4 py-6 md:py-10 xl:px-8 2xl:px-12">
        <div className="max-w-2xl xl:max-w-3xl 2xl:max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-4">
            <ArrowLeft className="h-4 w-4" />
            Return to Services
          </Link>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Secondary Examination Result Verification</CardTitle>
              <CardDescription>
                Enter the required credentials to retrieve official examination results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3">
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <Label htmlFor="accessPin" className="text-sm font-medium">Access Pin <span className="text-destructive">*</span></Label>
                  <Input
                    id="accessPin"
                    placeholder="Enter access pin"
                    type="text"
                    value={formData.accessPin}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="examNumber" className="text-sm font-medium">Examination Number <span className="text-destructive">*</span></Label>
                  <Input
                    id="examNumber"
                    placeholder="Enter examination number"
                    type="text"
                    value={formData.examNumber}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "RETRIEVING RESULT..." : "VERIFY RESULT"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Result Display Card */}
          {resultData && (
            <Card className="mt-6">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg">Official Examination Result</CardTitle>
                <CardDescription>
                  Candidate: {[resultData.fName, resultData.mName, resultData.lName].filter(Boolean).join(' ')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                {/* Passport Photo */}
                {resultData.passport && (
                  <div className="flex justify-center">
                    <img 
                      src={resultData.passport} 
                      alt="Candidate Photograph" 
                      className="w-28 h-36 object-cover border border-border"
                    />
                  </div>
                )}

                {/* Personal Information */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Candidate Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="border-b border-border pb-2">
                      <p className="text-xs text-muted-foreground uppercase">Session Year</p>
                      <p className="font-medium">{resultData.sessionYr}</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-xs text-muted-foreground uppercase">Candidate Name</p>
                      <p className="font-medium">{[resultData.fName, resultData.mName, resultData.lName].filter(Boolean).join(' ')}</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-xs text-muted-foreground uppercase">Sex</p>
                      <p className="font-medium">{resultData.sexCd || 'N/A'}</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-xs text-muted-foreground uppercase">Date of Birth</p>
                      <p className="font-medium">{resultData.dateOfBirth ? new Date(resultData.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-xs text-muted-foreground uppercase">Access Pin</p>
                      <p className="font-medium">{resultData.accessPin || 'N/A'}</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-xs text-muted-foreground uppercase">Examination Number</p>
                      <p className="font-medium">{resultData.examinationNo}</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-xs text-muted-foreground uppercase">Institution Code</p>
                      <p className="font-medium">{resultData.institutionCd || 'N/A'}</p>
                    </div>
                    <div className="border-b border-border pb-2">
                      <p className="text-xs text-muted-foreground uppercase">Local Government Area</p>
                      <p className="font-medium">{resultData.lgaCd || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2 border-b border-border pb-2">
                      <p className="text-xs text-muted-foreground uppercase">School</p>
                      <p className="font-medium">{resultData.schoolName || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Grades */}
                <div className="pt-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Subject Results</h3>
                  <table className="w-full text-sm border border-border">
                    <thead>
                      <tr className="bg-muted">
                        <th className="text-left px-3 py-2 border-b border-border font-semibold">Subject</th>
                        <th className="text-center px-3 py-2 border-b border-border font-semibold w-24">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultData.engGrd && (
                        <tr>
                          <td className="px-3 py-2 border-b border-border">English Studies</td>
                          <td className="px-3 py-2 border-b border-border text-center font-semibold">{resultData.engGrd}</td>
                        </tr>
                      )}
                      {(resultData.mthGrd || resultData.aritGrd) && (
                        <tr>
                          <td className="px-3 py-2 border-b border-border">Mathematics</td>
                          <td className="px-3 py-2 border-b border-border text-center font-semibold">{resultData.mthGrd || resultData.aritGrd}</td>
                        </tr>
                      )}
                      {resultData.bstGrd && (
                        <tr>
                          <td className="px-3 py-2 border-b border-border">Basic Science & Technology</td>
                          <td className="px-3 py-2 border-b border-border text-center font-semibold">{resultData.bstGrd}</td>
                        </tr>
                      )}
                      {resultData.gpGrd && (
                        <tr>
                          <td className="px-3 py-2 border-b border-border">General Paper</td>
                          <td className="px-3 py-2 border-b border-border text-center font-semibold">{resultData.gpGrd}</td>
                        </tr>
                      )}
                      {resultData.rgsGrd && (
                        <tr>
                          <td className="px-3 py-2 border-b border-border">
                            {resultData.rgstype === 'IRS' || resultData.rgstype === '2'
                              ? 'Islamic Religious Studies' 
                              : resultData.rgstype === 'CRS' || resultData.rgstype === '1'
                              ? 'Christian Religious Studies'
                              : 'Religious Studies'}
                          </td>
                          <td className="px-3 py-2 border-b border-border text-center font-semibold">{resultData.rgsGrd}</td>
                        </tr>
                      )}
                      {resultData.hstGrd && (
                        <tr>
                          <td className="px-3 py-2 border-b border-border">History</td>
                          <td className="px-3 py-2 border-b border-border text-center font-semibold">{resultData.hstGrd}</td>
                        </tr>
                      )}
                      {resultData.arbGrd && (
                        <tr>
                          <td className="px-3 py-2 border-b border-border">Arabic</td>
                          <td className="px-3 py-2 border-b border-border text-center font-semibold">{resultData.arbGrd}</td>
                        </tr>
                      )}
                      {resultData.ccaGrd && (
                        <tr>
                          <td className="px-3 py-2 border-b border-border">Cultural & Creative Arts</td>
                          <td className="px-3 py-2 border-b border-border text-center font-semibold">{resultData.ccaGrd}</td>
                        </tr>
                      )}
                      {resultData.freGrd && (
                        <tr>
                          <td className="px-3 py-2 border-b border-border">French</td>
                          <td className="px-3 py-2 border-b border-border text-center font-semibold">{resultData.freGrd}</td>
                        </tr>
                      )}
                      {resultData.nvsGrd && (
                        <tr>
                          <td className="px-3 py-2 border-b border-border">National Values</td>
                          <td className="px-3 py-2 border-b border-border text-center font-semibold">{resultData.nvsGrd}</td>
                        </tr>
                      )}
                      {resultData.llgGrd && (
                        <tr>
                          <td className="px-3 py-2 border-b border-border">Language (Vernacular)</td>
                          <td className="px-3 py-2 border-b border-border text-center font-semibold">{resultData.llgGrd}</td>
                        </tr>
                      )}
                      {resultData.pvsGrd && (
                        <tr>
                          <td className="px-3 py-2 border-b border-border">Pre-Vocational Studies</td>
                          <td className="px-3 py-2 border-b border-border text-center font-semibold">{resultData.pvsGrd}</td>
                        </tr>
                      )}
                      {resultData.busGrd && (
                        <tr>
                          <td className="px-3 py-2 border-b border-border">Business Studies</td>
                          <td className="px-3 py-2 border-b border-border text-center font-semibold">{resultData.busGrd}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Remark */}
                {resultData.remark && (
                  <div className="pt-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Official Remark</h3>
                    <p className="font-semibold text-base px-3 py-2 bg-accent border border-border inline-block">
                      {resultData.remark}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="border-t border-border pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button 
                      onClick={() => handlePrint(true)} 
                      variant="outline"
                      className="w-full"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      PRINT RESULT
                    </Button>
                    <Button 
                      onClick={() => handlePrint(false)} 
                      variant="outline"
                      className="w-full"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      PRINT WITHOUT PASSPORT
                    </Button>
                    <Button 
                      onClick={handleDownloadPDF} 
                      className="w-full"
                      disabled={downloadingPDF}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloadingPDF ? "GENERATING..." : "DOWNLOAD PDF"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default PrimaryResult;

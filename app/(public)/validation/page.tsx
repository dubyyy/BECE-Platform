"use client"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Edit, Printer, Search, Trash2, Check } from "lucide-react";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts } from 'pdf-lib';
import schoolsData from '@/data.json';

type RegistrationSource = "student" | "post";

interface CAScore {
  year1: string;
  year2: string;
  year3: string;
}

interface CAScores {
  [subjectCode: string]: CAScore;
}

interface Registration {
  id: string;
  studentNumber: string;
  firstname: string;
  othername: string;
  lastname: string;
  dateOfBirth?: string;
  gender: string;
  schoolType: string;
  passport: string | null;
  englishTerm1: string;
  englishTerm2: string;
  englishTerm3: string;
  arithmeticTerm1: string;
  arithmeticTerm2: string;
  arithmeticTerm3: string;
  generalTerm1: string;
  generalTerm2: string;
  generalTerm3: string;
  religiousType: string;
  religiousTerm1: string;
  religiousTerm2: string;
  religiousTerm3: string;
  createdAt: string;
  source: RegistrationSource;
  studentSubjects?: string[];
  caScores?: CAScores;
}

// LGA options
const LGAS = [
  { name: "ANIOCHA-NORTH", code: "1420256700" },
  { name: "ANIOCHA-SOUTH", code: "660742704" },
  { name: "BOMADI", code: "99763601" },
  { name: "BURUTU", code: "1830665512" },
  { name: "ETHIOPE-EAST", code: "88169935" },
  { name: "ETHIOPE-WEST", code: "87907773" },
  { name: "IKA NORTH-EAST", code: "2077558841" },
  { name: "IKA-SOUTH", code: "1918656250" },
  { name: "ISOKO-NORTH", code: "1583401849" },
  { name: "ISOKO-SOUTH", code: "1159914347" },
  { name: "NDOKWA-EAST", code: "90249440" },
  { name: "NDOKWA-WEST", code: "1784211236" },
  { name: "OKPE", code: "653025957" },
  { name: "OSHIMILI-NORTH", code: "1865127727" },
  { name: "OSHIMILI-SOUTH", code: "1561094353" },
  { name: "PATANI", code: "1313680994" },
  { name: "SAPELE", code: "1776329831" },
  { name: "UDU", code: "435624852" },
  { name: "UGHELLI-NORTH", code: "1118545377" },
  { name: "UGHELLI-SOUTH", code: "803769815" },
  { name: "UKWUANI", code: "1916789388" },
  { name: "UVWIE", code: "1835037667" },
  { name: "WARRI-NORTH", code: "580987670" },
  { name: "WARRI-SOUTH", code: "1031892114" },
  { name: "WARRI-SOUTH-WEST", code: "1563044454" },
];

// Subject list with codes
const SUBJECTS = [
  { code: "ENG", name: "English Language" },
  { code: "MTH", name: "Mathematics" },
  { code: "BST", name: "Basic Science and Technology" },
  { code: "RGS", name: "Religious Studies" },
  { code: "HST", name: "Historical Studies" },
  { code: "ARB", name: "Arabic Studies" },
  { code: "CCA", name: "Cultural and Creative Arts" },
  { code: "FRE", name: "French" },
  { code: "NVS", name: "National Values" },
  { code: "PVS", name: "Pre Vocational Studies" },
  { code: "BUS", name: "Business Studies" },
];

function formatLgaLabel(name: string) {
  return name
    .toLowerCase()
    .split(/[-\s]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const Validation = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [lgaCode, setLgaCode] = useState<string>("");
  const [schoolCode, setSchoolCode] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isSignupMode, setIsSignupMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");
  const [authenticatedSchool, setAuthenticatedSchool] = useState<string>("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isFetchingData, setIsFetchingData] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string>("");
  const [editingStudent, setEditingStudent] = useState<Registration | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<Registration | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [printType, setPrintType] = useState<string>("name");
  const [registrationModel, setRegistrationModel] = useState<string>("all");
  const [editModalSubjects, setEditModalSubjects] = useState<string[]>([]);
  const [editModalCaScores, setEditModalCaScores] = useState<CAScores>({});
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Check for existing JWT token on component mount
  useEffect(() => {
    const token = localStorage.getItem('schoolToken');
    const schoolData = localStorage.getItem('schoolData');
    
    if (token && schoolData) {
      try {
        const school = JSON.parse(schoolData);
        setIsLoggedIn(true);
        setAuthenticatedSchool(school.schoolName);
        setLgaCode(school.lgaCode);
        setSchoolCode(school.schoolCode);
      } catch (error) {
        console.error('Error parsing school data:', error);
        localStorage.removeItem('schoolToken');
        localStorage.removeItem('schoolData');
      }
    }
  }, []);

  // Fetch registrations when logged in
  useEffect(() => {
    const fetchRegistrations = async () => {
      if (!isLoggedIn) {
        setRegistrations([]);
        return;
      }

      setIsFetchingData(true);
      setFetchError("");

      try {
        const token = localStorage.getItem('schoolToken');
        if (!token) {
          setFetchError('Authentication token not found. Please login again.');
          return;
        }

        const [studentRes, postRes] = await Promise.all([
          fetch('/api/school/registrations', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }),
          fetch('/api/school/post-registrations', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }),
        ]);

        const [studentData, postData] = await Promise.all([
          studentRes.json(),
          postRes.json(),
        ]);

        if (!studentRes.ok) {
          setFetchError(studentData.error || 'Failed to fetch registrations');
          return;
        }

        if (!postRes.ok) {
          setFetchError(postData.error || 'Failed to fetch post-registrations');
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parseCAScores = (caScores: any) => {
          if (!caScores) return {};
          if (typeof caScores === 'string') {
            try {
              return JSON.parse(caScores);
            } catch {
              return {};
            }
          }
          return caScores;
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const studentRegs: Registration[] = (studentData.registrations || []).map((r: any) => ({
          ...r,
          othername: r.othername ?? "",
          religiousType: r.religiousType ?? "",
          source: "student" as const,
          studentSubjects: r.studentSubjects || [],
          caScores: parseCAScores(r.caScores),
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const postRegs: Registration[] = (postData.registrations || []).map((r: any) => ({
          ...r,
          othername: r.othername ?? "",
          religiousType: r.religiousType ?? "",
          source: "post" as const,
          studentSubjects: r.studentSubjects || [],
          caScores: parseCAScores(r.caScores),
        }));

        const combined = [...studentRegs, ...postRegs].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setRegistrations(combined);
      } catch (error) {
        console.error('Fetch error:', error);
        setFetchError('An error occurred while fetching data. Please try again.');
      } finally {
        setIsFetchingData(false);
      }
    };

    fetchRegistrations();
  }, [isLoggedIn]);

  // Helper: format date input as DD/MM/YYYY with auto-slashes
  const handleDateInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  };

  // Convert DD/MM/YYYY to YYYY-MM-DD for API
  const ddmmyyyyToIso = (val: string): string => {
    const parts = val.split('/');
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return val;
  };

  // Convert ISO date string to DD/MM/YYYY for display
  const isoToDdmmyyyy = (val: string): string => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const handleEdit = (student: Registration) => {
    setEditingStudent(student);
    setEditFormData({
      ...student,
      dateOfBirth: student.dateOfBirth ? isoToDdmmyyyy(student.dateOfBirth) : '',
    });
    setEditModalSubjects(student.studentSubjects || []);
    setEditModalCaScores(student.caScores || {});
    setIsEditModalOpen(true);
    setEditError("");
  };

  // Handle edit modal subject toggle
  const handleEditModalSubjectToggle = (code: string) => {
    setEditModalSubjects(prev => {
      if (prev.includes(code)) {
        // Remove subject and its CA scores
        setEditModalCaScores(scores => {
          const newScores = { ...scores };
          delete newScores[code];
          return newScores;
        });
        return prev.filter(c => c !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  // Handle delete student
  const handleDeleteStudent = async (student: Registration) => {
    if (!confirm('Are you sure you want to delete this student registration? This action cannot be undone.')) return;
    
    setIsDeleting(student.id);
    try {
      const token = localStorage.getItem('schoolToken');
      if (!token) {
        setFetchError('Authentication token not found. Please login again.');
        return;
      }

      const endpoint = student.source === 'post' ? '/api/school/post-registrations' : '/api/school/registrations';
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ id: student.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error || 'Failed to delete registration');
        return;
      }

      // Remove from local state
      setRegistrations(prev => prev.filter(r => !(r.id === student.id && r.source === student.source)));
    } catch (e) {
      console.error('Delete error:', e);
      setFetchError('An error occurred while deleting. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingStudent(null);
    setEditFormData(null);
    setEditError("");
  };

  const handleEditFormChange = (field: keyof Registration, value: string) => {
    if (editFormData) {
      setEditFormData({
        ...editFormData,
        [field]: value
      });
    }
  };

  const handleEditPassportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setEditFormData(prev => (prev ? { ...prev, passport: result } : prev));
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePassport = () => {
    setEditFormData(prev => (prev ? { ...prev, passport: null } : prev));
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;

    setIsSavingEdit(true);
    setEditError("");

    try {
      const token = localStorage.getItem('schoolToken');
      if (!token) {
        setEditError('Authentication token not found. Please login again.');
        setIsSavingEdit(false);
        return;
      }

      console.log('Updating student:', editFormData.id);
      console.log('Request data:', editFormData);

      // Prepare the update payload with dynamic caScores and studentSubjects
      const updatePayload = {
        firstname: editFormData.firstname,
        othername: editFormData.othername,
        lastname: editFormData.lastname,
        dateOfBirth: editFormData.dateOfBirth ? ddmmyyyyToIso(editFormData.dateOfBirth) : editFormData.dateOfBirth,
        gender: editFormData.gender,
        schoolType: editFormData.schoolType,
        passport: editFormData.passport,
        caScores: editModalCaScores,
        studentSubjects: editModalSubjects,
        religious: editModalSubjects.includes('RGS') ? { type: editFormData.religiousType } : undefined,
      };

      const endpoint = editFormData.source === "post" 
        ? '/api/school/post-registrations' 
        : '/api/school/registrations';
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editFormData.id,
          update: updatePayload,
        }),
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        const errorMessage = data.error || `Failed to update student (Status: ${response.status}). Please try again.`;
        setEditError(errorMessage);
        setIsSavingEdit(false);
        return;
      }

      // Update the local registrations state with new caScores and studentSubjects
      const updatedStudent = {
        ...editFormData,
        caScores: editModalCaScores,
        studentSubjects: editModalSubjects,
      };
      setRegistrations(prevRegs => 
        prevRegs.map(reg => (reg.id === editFormData.id && reg.source === editFormData.source) ? updatedStudent : reg)
      );

      console.log('Student updated successfully');
      handleCloseEditModal();
    } catch (error) {
      console.error('Edit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while updating student.';
      setEditError(`Network error: ${errorMessage}. Please check your connection and try again.`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Helper function to draw standardized header for all PDFs
  const drawStandardHeader = (
    page: PDFPage,
    boldFont: PDFFont,
    regularFont: PDFFont,
    pageWidth: number,
    pageHeight: number,
    margin: number
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schoolData = (schoolsData as any[]).find(
      (s) =>
        (s.lCode === lgaCode || s.lgaCode === lgaCode) &&
        s.schCode === schoolCode
    );

    const headerLgaCode = (schoolData?.lgaCode ? String(schoolData.lgaCode) : lgaCode) || '';

    const lgaName =
      LGAS.find((lga) => lga.code === (schoolData?.lCode || lgaCode))?.name ||
      'ANIOCHA-NORTH';
    
    // Center text helper
    const centerText = (text: string, size: number, y: number, font: PDFFont) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: (pageWidth - textWidth) / 2,
        y,
        size,
        font,
        color: rgb(0, 0, 0),
      });
    };

    // Starting Y position for header
    let currentY = pageHeight - margin;

    // Line 1: Ministry header
    centerText('MINISTRY OF SECONDARY EDUCATION', 14, currentY, boldFont);
    currentY -= 25;

    // Line 2: LGA and School information
    const line2 = `LGA: ${headerLgaCode} :: ${lgaName} SCHOOL CODE: ${schoolCode} : ${authenticatedSchool.toUpperCase()}`;
    centerText(line2, 10, currentY, boldFont);
    currentY -= 25;

    // Line 3: Examination title
    const currentYear = 2025;
    const nextYear = 2026;
    const examTitle = `${currentYear}/${nextYear} Basic Education Certificate Examination`;
    centerText(examTitle, 11, currentY, boldFont);
    
    // Return the Y position after the header for content to continue
    return currentY - 30;
  };

  const handlePrintName = async () => {
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const sortedRegs = [...registrations].sort((a, b) =>
        a.studentNumber.localeCompare(b.studentNumber, undefined, { numeric: true, sensitivity: 'base' })
      );

      // Page dimensions
      const pageWidth = 595; // A4 width in points
      const pageHeight = 842; // A4 height in points
      const margin = 50;
      const tableWidth = pageWidth - 2 * margin;
      
      // Column widths
      const colSN = 40;
      const colExamNo = 90;
      const colSex = 40;
      const colDOB = 70;
      const colNames = tableWidth - colSN - colExamNo - colSex - colDOB;

      // Table settings
      const rowHeight = 20;
      const headerHeight = 25;
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      
      // Draw standardized header
      let currentY = drawStandardHeader(page, timesRomanBoldFont, timesRomanFont, pageWidth, pageHeight, margin);

      // Function to check if new page is needed
      const checkNewPage = () => {
        if (currentY < margin + rowHeight) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = drawStandardHeader(page, timesRomanBoldFont, timesRomanFont, pageWidth, pageHeight, margin);
          drawTableHeader();
        }
      };

      // Function to draw table header
      const drawTableHeader = () => {
        // Header background
        page.drawRectangle({
          x: margin,
          y: currentY - headerHeight,
          width: tableWidth,
          height: headerHeight,
          color: rgb(0.95, 0.95, 0.95),
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Draw column borders
        page.drawLine({
          start: { x: margin + colSN, y: currentY },
          end: { x: margin + colSN, y: currentY - headerHeight },
          thickness: 1,
        });
        page.drawLine({
          start: { x: margin + colSN + colExamNo, y: currentY },
          end: { x: margin + colSN + colExamNo, y: currentY - headerHeight },
          thickness: 1,
        });
        page.drawLine({
          start: { x: margin + colSN + colExamNo + colNames, y: currentY },
          end: { x: margin + colSN + colExamNo + colNames, y: currentY - headerHeight },
          thickness: 1,
        });
        page.drawLine({
          start: { x: margin + colSN + colExamNo + colNames + colSex, y: currentY },
          end: { x: margin + colSN + colExamNo + colNames + colSex, y: currentY - headerHeight },
          thickness: 1,
        });

        // Header text
        page.drawText('S/N', {
          x: margin + 10,
          y: currentY - 17,
          size: 11,
          font: timesRomanBoldFont,
        });
        page.drawText('EXAM NO.', {
          x: margin + colSN + 5,
          y: currentY - 17,
          size: 11,
          font: timesRomanBoldFont,
        });
        page.drawText('NAMES', {
          x: margin + colSN + colExamNo + 5,
          y: currentY - 17,
          size: 11,
          font: timesRomanBoldFont,
        });
        page.drawText('SEX', {
          x: margin + colSN + colExamNo + colNames + 10,
          y: currentY - 17,
          size: 11,
          font: timesRomanBoldFont,
        });
        page.drawText('DOB', {
          x: margin + colSN + colExamNo + colNames + colSex + 5,
          y: currentY - 17,
          size: 11,
          font: timesRomanBoldFont,
        });

        currentY -= headerHeight;
      };

      // Draw initial header
      drawTableHeader();

      // Draw table rows
      sortedRegs.forEach((student, index) => {
        checkNewPage();

        // Row background (alternating)
        if (index % 2 === 0) {
          page.drawRectangle({
            x: margin,
            y: currentY - rowHeight,
            width: tableWidth,
            height: rowHeight,
            color: rgb(0.98, 0.98, 0.98),
          });
        }

        // Row border
        page.drawRectangle({
          x: margin,
          y: currentY - rowHeight,
          width: tableWidth,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Draw column borders
        page.drawLine({
          start: { x: margin + colSN, y: currentY },
          end: { x: margin + colSN, y: currentY - rowHeight },
          thickness: 1,
        });
        page.drawLine({
          start: { x: margin + colSN + colExamNo, y: currentY },
          end: { x: margin + colSN + colExamNo, y: currentY - rowHeight },
          thickness: 1,
        });
        page.drawLine({
          start: { x: margin + colSN + colExamNo + colNames, y: currentY },
          end: { x: margin + colSN + colExamNo + colNames, y: currentY - rowHeight },
          thickness: 1,
        });
        page.drawLine({
          start: { x: margin + colSN + colExamNo + colNames + colSex, y: currentY },
          end: { x: margin + colSN + colExamNo + colNames + colSex, y: currentY - rowHeight },
          thickness: 1,
        });

        // Full name
        const fullName = `${student.lastname.toUpperCase()}, ${student.firstname.toUpperCase()}${student.othername ? ' ' + student.othername.toUpperCase() : ''}`;
        
        // Row text
        page.drawText(`${index + 1}`, {
          x: margin + 10,
          y: currentY - 14,
          size: 10,
          font: timesRomanFont,
        });
        page.drawText(student.studentNumber, {
          x: margin + colSN + 5,
          y: currentY - 14,
          size: 10,
          font: timesRomanFont,
        });
        
        // Truncate name if too long
        const maxNameWidth = colNames - 10;
        let nameToDisplay = fullName;
        let nameWidth = timesRomanFont.widthOfTextAtSize(nameToDisplay, 10);
        
        while (nameWidth > maxNameWidth && nameToDisplay.length > 0) {
          nameToDisplay = nameToDisplay.slice(0, -1);
          nameWidth = timesRomanFont.widthOfTextAtSize(nameToDisplay + '...', 10);
        }
        
        if (nameToDisplay !== fullName) {
          nameToDisplay += '...';
        }
        
        page.drawText(nameToDisplay, {
          x: margin + colSN + colExamNo + 5,
          y: currentY - 14,
          size: 10,
          font: timesRomanFont,
        });
        
        page.drawText(student.gender.charAt(0).toUpperCase(), {
          x: margin + colSN + colExamNo + colNames + 15,
          y: currentY - 14,
          size: 10,
          font: timesRomanFont,
        });
        
        // Format and display date of birth
        const dob = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).replace(/\//g, '/') : '';
        page.drawText(dob, {
          x: margin + colSN + colExamNo + colNames + colSex + 5,
          y: currentY - 14,
          size: 9,
          font: timesRomanFont,
        });

        currentY -= rowHeight;
      });

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      
      // Create a blob and download
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student-names-${authenticatedSchool.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrintCA = async () => {
    try {
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const sortedRegs = [...registrations].sort((a, b) =>
        a.studentNumber.localeCompare(b.studentNumber, undefined, { numeric: true, sensitivity: 'base' })
      );

      // Page dimensions (Landscape)
      const pageWidth = 842;
      const pageHeight = 595;
      const margin = 20;
      const tableWidth = pageWidth - 2 * margin;
      
      // Column widths for 12 subjects × 3 years = 36 score columns + student info
      const colSN = 20;
      const colExamNo = 50;
      const colNames = 120;
      const colSex = 20;
      const infoWidth = colSN + colExamNo + colNames + colSex;
      const remainingWidth = tableWidth - infoWidth;
      const colScore = remainingWidth / (SUBJECTS.length * 3); // Width per score column
      
      const rowHeight = 16;
      const headerHeight = 30;
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      
      let currentY = drawStandardHeader(page, timesRomanBoldFont, timesRomanFont, pageWidth, pageHeight, margin);

      const checkNewPage = () => {
        if (currentY < margin + rowHeight + 50) { // Extra space for legend
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = drawStandardHeader(page, timesRomanBoldFont, timesRomanFont, pageWidth, pageHeight, margin);
          drawTableHeader();
        }
      };

      const drawTableHeader = () => {
        // Header background
        page.drawRectangle({
          x: margin,
          y: currentY - headerHeight,
          width: tableWidth,
          height: headerHeight,
          color: rgb(0.95, 0.95, 0.95),
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Draw all column borders
        let xPos = margin + colSN;
        page.drawLine({ start: { x: xPos, y: currentY }, end: { x: xPos, y: currentY - headerHeight }, thickness: 1 });
        xPos += colExamNo;
        page.drawLine({ start: { x: xPos, y: currentY }, end: { x: xPos, y: currentY - headerHeight }, thickness: 1 });
        xPos += colNames;
        page.drawLine({ start: { x: xPos, y: currentY }, end: { x: xPos, y: currentY - headerHeight }, thickness: 1 });
        xPos += colSex;
        page.drawLine({ start: { x: xPos, y: currentY }, end: { x: xPos, y: currentY - headerHeight }, thickness: 1 });

        // Draw borders for each score column (36 columns total)
        for (let i = 0; i < SUBJECTS.length * 3; i++) {
          xPos += colScore;
          page.drawLine({ start: { x: xPos, y: currentY }, end: { x: xPos, y: currentY - headerHeight }, thickness: 0.5 });
        }

        // Header text - info columns
        const infoHeaders = ['S/N', 'EXAM NO', 'NAMES', 'SEX'];
        const infoWidths = [colSN, colExamNo, colNames, colSex];
        let headerX = margin;
        infoHeaders.forEach((header, i) => {
          const textWidth = timesRomanBoldFont.widthOfTextAtSize(header, 5);
          const xOffset = (infoWidths[i] - textWidth) / 2;
          page.drawText(header, { x: headerX + xOffset, y: currentY - 18, size: 5, font: timesRomanBoldFont });
          headerX += infoWidths[i];
        });

        // Subject score column headers: ENG1, ENG2, ENG3, MTH1, MTH2, MTH3, etc.
        SUBJECTS.forEach((subject) => {
          ['1', '2', '3'].forEach((year) => {
            const label = `${subject.code}${year}`;
            const labelWidth = timesRomanBoldFont.widthOfTextAtSize(label, 4);
            const xOffset = (colScore - labelWidth) / 2;
            page.drawText(label, {
              x: headerX + xOffset,
              y: currentY - 18,
              size: 4,
              font: timesRomanBoldFont,
            });
            headerX += colScore;
          });
        });

        currentY -= headerHeight;
      };

      drawTableHeader();

      // Draw table rows
      sortedRegs.forEach((student, index) => {
        checkNewPage();

        if (index % 2 === 0) {
          page.drawRectangle({
            x: margin,
            y: currentY - rowHeight,
            width: tableWidth,
            height: rowHeight,
            color: rgb(0.98, 0.98, 0.98),
          });
        }

        page.drawRectangle({
          x: margin,
          y: currentY - rowHeight,
          width: tableWidth,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Draw column borders
        let xPos = margin + colSN;
        page.drawLine({ start: { x: xPos, y: currentY }, end: { x: xPos, y: currentY - rowHeight }, thickness: 1 });
        xPos += colExamNo;
        page.drawLine({ start: { x: xPos, y: currentY }, end: { x: xPos, y: currentY - rowHeight }, thickness: 1 });
        xPos += colNames;
        page.drawLine({ start: { x: xPos, y: currentY }, end: { x: xPos, y: currentY - rowHeight }, thickness: 1 });
        xPos += colSex;
        page.drawLine({ start: { x: xPos, y: currentY }, end: { x: xPos, y: currentY - rowHeight }, thickness: 1 });
        
        // Draw borders for each score column
        for (let i = 0; i < SUBJECTS.length * 3; i++) {
          xPos += colScore;
          page.drawLine({ start: { x: xPos, y: currentY }, end: { x: xPos, y: currentY - rowHeight }, thickness: 0.5 });
        }

        const truncateText = (text: string, maxWidth: number, fontSize: number) => {
          let displayText = text;
          let textWidth = timesRomanFont.widthOfTextAtSize(displayText, fontSize);
          while (textWidth > maxWidth && displayText.length > 0) {
            displayText = displayText.slice(0, -1);
            textWidth = timesRomanFont.widthOfTextAtSize(displayText + '..', fontSize);
          }
          if (displayText !== text && displayText.length > 0) displayText += '..';
          return displayText;
        };
        
        const drawCenteredText = (text: string, x: number, colWidth: number, y: number, size: number) => {
          const textWidth = timesRomanFont.widthOfTextAtSize(text, size);
          const xOffset = (colWidth - textWidth) / 2;
          page.drawText(text, { x: x + xOffset, y, size, font: timesRomanFont });
        };
        
        const fullName = `${student.lastname.toUpperCase()}, ${student.firstname.toUpperCase()}${student.othername ? ' ' + student.othername.toUpperCase() : ''}`;
        const caScores = student.caScores || {};
        
        let dataX = margin;
        // S/N
        drawCenteredText(String(index + 1), dataX, colSN, currentY - 11, 5);
        dataX += colSN;
        // Exam No
        drawCenteredText(student.studentNumber, dataX, colExamNo, currentY - 11, 5);
        dataX += colExamNo;
        // Names
        page.drawText(truncateText(fullName, colNames - 2, 5), { x: dataX + 1, y: currentY - 11, size: 5, font: timesRomanFont });
        dataX += colNames;
        // Sex
        drawCenteredText(student.gender.charAt(0).toUpperCase(), dataX, colSex, currentY - 11, 5);
        dataX += colSex;
        
        // Subject scores from caScores
        SUBJECTS.forEach(subject => {
          const scores = caScores[subject.code] || { year1: '', year2: '', year3: '' };
          drawCenteredText(scores.year1 || '-', dataX, colScore, currentY - 11, 5);
          dataX += colScore;
          drawCenteredText(scores.year2 || '-', dataX, colScore, currentY - 11, 5);
          dataX += colScore;
          drawCenteredText(scores.year3 || '-', dataX, colScore, currentY - 11, 5);
          dataX += colScore;
        });

        currentY -= rowHeight;
      });

      // Add subject legend at the bottom
      const legendY = margin + 45;
      page.drawText('SUBJECT KEY:', { x: margin, y: legendY, size: 6, font: timesRomanBoldFont });
      
      const legendColWidth = tableWidth / 6;
      SUBJECTS.forEach((subject, index) => {
        const col = index % 6;
        const row = Math.floor(index / 6);
        const x = margin + col * legendColWidth;
        const y = legendY - 10 - (row * 10);
        page.drawText(`${subject.code} = ${subject.name}`, { x, y, size: 5, font: timesRomanFont });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student-ca-${authenticatedSchool.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrintPhotoAlbum = async () => {
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const sortedRegs = [...registrations].sort((a, b) =>
        a.studentNumber.localeCompare(b.studentNumber, undefined, { numeric: true, sensitivity: 'base' })
      );

      // Page dimensions
      const pageWidth = 595; // A4 width in points
      const pageHeight = 842; // A4 height in points
      const margin = 40;
      const contentWidth = pageWidth - 2 * margin;
      
      // Grid settings - 3 columns x 4 rows per page
      const cols = 3;
      const rows = 4;
      const photosPerPage = cols * rows;
      const photoWidth = 120;
      const photoHeight = 140;
      const spacing = 20; // eslint-disable-line @typescript-eslint/no-unused-vars
      const nameHeight = 30;
      const cellWidth = contentWidth / cols;
      
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let photoCount = 0;
      let pageNumber = 1; // eslint-disable-line @typescript-eslint/no-unused-vars
      
      // Draw standardized header and adjust cell height based on remaining space
      let headerEndY = drawStandardHeader(page, timesRomanBoldFont, timesRomanFont, pageWidth, pageHeight, margin);
      const availableHeight = headerEndY - margin;
      const cellHeight = availableHeight / rows;

      // Add page title function for subsequent pages
      const addPageWithHeader = () => {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        pageNumber++;
        headerEndY = drawStandardHeader(page, timesRomanBoldFont, timesRomanFont, pageWidth, pageHeight, margin);
      };

      // Process each student
      for (let i = 0; i < sortedRegs.length; i++) {
        const student = sortedRegs[i];
        
        // Calculate position in grid
        const posInPage = photoCount % photosPerPage;
        const col = posInPage % cols;
        const row = Math.floor(posInPage / cols);
        
        // Check if we need a new page
        if (photoCount > 0 && posInPage === 0) {
          addPageWithHeader();
        }
        
        // Calculate cell position
        const cellX = margin + col * cellWidth;
        const cellY = headerEndY - (row + 1) * cellHeight;
        
        // Center photo in cell
        const photoX = cellX + (cellWidth - photoWidth) / 2;
        const photoY = cellY + (cellHeight - photoHeight - nameHeight) / 2 + nameHeight;
        
        // Draw photo border/placeholder
        page.drawRectangle({
          x: photoX,
          y: photoY,
          width: photoWidth,
          height: photoHeight,
          borderColor: rgb(0.7, 0.7, 0.7),
          borderWidth: 1,
        });
        
        // Embed and draw the passport photo if available
        if (student.passport) {
          try {
            // Fetch the image
            const imageBytes = await fetch(student.passport).then(res => res.arrayBuffer());
            
            let image;
            // Determine image type and embed accordingly
            if (student.passport.toLowerCase().includes('.png') || student.passport.startsWith('data:image/png')) {
              image = await pdfDoc.embedPng(imageBytes);
            } else {
              image = await pdfDoc.embedJpg(imageBytes);
            }
            
            // Calculate dimensions to fit within the box while maintaining aspect ratio
            const imgAspectRatio = image.width / image.height;
            const boxAspectRatio = photoWidth / photoHeight;
            
            let drawWidth = photoWidth;
            let drawHeight = photoHeight;
            let drawX = photoX;
            let drawY = photoY;
            
            if (imgAspectRatio > boxAspectRatio) {
              // Image is wider than box
              drawHeight = photoWidth / imgAspectRatio;
              drawY = photoY + (photoHeight - drawHeight) / 2;
            } else {
              // Image is taller than box
              drawWidth = photoHeight * imgAspectRatio;
              drawX = photoX + (photoWidth - drawWidth) / 2;
            }
            
            page.drawImage(image, {
              x: drawX,
              y: drawY,
              width: drawWidth,
              height: drawHeight,
            });
          } catch (error) {
            console.error(`Error loading image for student ${student.studentNumber}:`, error);
            // Draw "No Photo" text if image fails to load
            page.drawText('No Photo', {
              x: photoX + photoWidth / 2 - 25,
              y: photoY + photoHeight / 2,
              size: 10,
              font: timesRomanFont,
              color: rgb(0.5, 0.5, 0.5),
            });
          }
        } else {
          // Draw "No Photo" text
          page.drawText('No Photo', {
            x: photoX + photoWidth / 2 - 25,
            y: photoY + photoHeight / 2,
            size: 10,
            font: timesRomanFont,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
        
        // Draw student information below photo
        const fullName = `${student.lastname.toUpperCase()}, ${student.firstname.toUpperCase()}${student.othername ? ' ' + student.othername.toUpperCase() : ''}`;
        const nameY = photoY - 15;
        
        // Truncate name if too long
        const maxNameWidth = photoWidth;
        let nameToDisplay = fullName;
        let nameWidth = timesRomanBoldFont.widthOfTextAtSize(nameToDisplay, 9);
        
        while (nameWidth > maxNameWidth && nameToDisplay.length > 0) {
          nameToDisplay = nameToDisplay.slice(0, -1);
          nameWidth = timesRomanBoldFont.widthOfTextAtSize(nameToDisplay + '...', 9);
        }
        
        if (nameToDisplay !== fullName) {
          nameToDisplay += '...';
        }
        
        // Center the name text
        const nameTextWidth = timesRomanBoldFont.widthOfTextAtSize(nameToDisplay, 9);
        const nameX = photoX + (photoWidth - nameTextWidth) / 2;
        
        page.drawText(nameToDisplay, {
          x: nameX,
          y: nameY,
          size: 9,
          font: timesRomanBoldFont,
        });
        
        // Draw exam number
        const examNoText = student.studentNumber;
        const examNoWidth = timesRomanFont.widthOfTextAtSize(examNoText, 8);
        const examNoX = photoX + (photoWidth - examNoWidth) / 2;
        
        page.drawText(examNoText, {
          x: examNoX,
          y: nameY - 12,
          size: 8,
          font: timesRomanFont,
          color: rgb(0.4, 0.4, 0.4),
        });
        
        photoCount++;
      }

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      
      // Create a blob and download
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student-photo-album-${authenticatedSchool.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating photo album PDF:', error);
      alert('Failed to generate photo album PDF. Please try again.');
    }
  };

  const handlePrintNameNoDOB = async () => {
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const sortedRegs = [...registrations].sort((a, b) =>
        a.studentNumber.localeCompare(b.studentNumber, undefined, { numeric: true, sensitivity: 'base' })
      );

      // Page dimensions
      const pageWidth = 595; // A4 width in points
      const pageHeight = 842; // A4 height in points
      const margin = 50;
      const tableWidth = pageWidth - 2 * margin;
      
      // Column widths (without DOB)
      const colSN = 40;
      const colExamNo = 90;
      const colSex = 40;
      const colNames = tableWidth - colSN - colExamNo - colSex;

      // Table settings
      const rowHeight = 20;
      const headerHeight = 25;
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      
      // Draw standardized header
      let currentY = drawStandardHeader(page, timesRomanBoldFont, timesRomanFont, pageWidth, pageHeight, margin);

      // Function to check if new page is needed
      const checkNewPage = () => {
        if (currentY < margin + rowHeight) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = drawStandardHeader(page, timesRomanBoldFont, timesRomanFont, pageWidth, pageHeight, margin);
          drawTableHeader();
        }
      };

      // Function to draw table header
      const drawTableHeader = () => {
        // Header background
        page.drawRectangle({
          x: margin,
          y: currentY - headerHeight,
          width: tableWidth,
          height: headerHeight,
          color: rgb(0.95, 0.95, 0.95),
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Draw column borders
        page.drawLine({
          start: { x: margin + colSN, y: currentY },
          end: { x: margin + colSN, y: currentY - headerHeight },
          thickness: 1,
        });
        page.drawLine({
          start: { x: margin + colSN + colExamNo, y: currentY },
          end: { x: margin + colSN + colExamNo, y: currentY - headerHeight },
          thickness: 1,
        });
        page.drawLine({
          start: { x: margin + colSN + colExamNo + colNames, y: currentY },
          end: { x: margin + colSN + colExamNo + colNames, y: currentY - headerHeight },
          thickness: 1,
        });

        // Header text
        page.drawText('S/N', {
          x: margin + 10,
          y: currentY - 17,
          size: 11,
          font: timesRomanBoldFont,
        });
        page.drawText('EXAM NO.', {
          x: margin + colSN + 5,
          y: currentY - 17,
          size: 11,
          font: timesRomanBoldFont,
        });
        page.drawText('NAMES', {
          x: margin + colSN + colExamNo + 5,
          y: currentY - 17,
          size: 11,
          font: timesRomanBoldFont,
        });
        page.drawText('SEX', {
          x: margin + colSN + colExamNo + colNames + 10,
          y: currentY - 17,
          size: 11,
          font: timesRomanBoldFont,
        });

        currentY -= headerHeight;
      };

      // Draw initial header
      drawTableHeader();

      // Draw table rows
      sortedRegs.forEach((student, index) => {
        checkNewPage();

        // Row background (alternating)
        if (index % 2 === 0) {
          page.drawRectangle({
            x: margin,
            y: currentY - rowHeight,
            width: tableWidth,
            height: rowHeight,
            color: rgb(0.98, 0.98, 0.98),
          });
        }

        // Row border
        page.drawRectangle({
          x: margin,
          y: currentY - rowHeight,
          width: tableWidth,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Draw column borders
        page.drawLine({
          start: { x: margin + colSN, y: currentY },
          end: { x: margin + colSN, y: currentY - rowHeight },
          thickness: 1,
        });
        page.drawLine({
          start: { x: margin + colSN + colExamNo, y: currentY },
          end: { x: margin + colSN + colExamNo, y: currentY - rowHeight },
          thickness: 1,
        });
        page.drawLine({
          start: { x: margin + colSN + colExamNo + colNames, y: currentY },
          end: { x: margin + colSN + colExamNo + colNames, y: currentY - rowHeight },
          thickness: 1,
        });

        // Full name
        const fullName = `${student.lastname.toUpperCase()}, ${student.firstname.toUpperCase()}${student.othername ? ' ' + student.othername.toUpperCase() : ''}`;
        
        // Row text
        page.drawText(`${index + 1}`, {
          x: margin + 10,
          y: currentY - 14,
          size: 10,
          font: timesRomanFont,
        });
        page.drawText(student.studentNumber, {
          x: margin + colSN + 5,
          y: currentY - 14,
          size: 10,
          font: timesRomanFont,
        });
        
        // Truncate name if too long
        const maxNameWidth = colNames - 10;
        let nameToDisplay = fullName;
        let nameWidth = timesRomanFont.widthOfTextAtSize(nameToDisplay, 10);
        
        while (nameWidth > maxNameWidth && nameToDisplay.length > 0) {
          nameToDisplay = nameToDisplay.slice(0, -1);
          nameWidth = timesRomanFont.widthOfTextAtSize(nameToDisplay + '...', 10);
        }
        
        if (nameToDisplay !== fullName) {
          nameToDisplay += '...';
        }
        
        page.drawText(nameToDisplay, {
          x: margin + colSN + colExamNo + 5,
          y: currentY - 14,
          size: 10,
          font: timesRomanFont,
        });
        
        page.drawText(student.gender.charAt(0).toUpperCase(), {
          x: margin + colSN + colExamNo + colNames + 15,
          y: currentY - 14,
          size: 10,
          font: timesRomanFont,
        });

        currentY -= rowHeight;
      });

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      
      // Create a blob and download
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student-names-no-dob-${authenticatedSchool.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrintSubjects = async () => {
    try {
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

      // Get unique subjects offered by the school
      const schoolSubjectCodes = [...new Set(
        registrations.flatMap(r => r.studentSubjects || [])
      )];
      const schoolSubjects = SUBJECTS.filter(s => schoolSubjectCodes.includes(s.code));

      // Page dimensions (Portrait)
      const pageWidth = 595;
      const pageHeight = 842;
      const margin = 40;
      const tableWidth = pageWidth - 2 * margin;

      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      
      let currentY = drawStandardHeader(page, timesRomanBoldFont, timesRomanFont, pageWidth, pageHeight, margin);

      // Title
      currentY -= 20;
      page.drawText('SUBJECTS OFFERED BY SCHOOL', {
        x: margin,
        y: currentY,
        size: 14,
        font: timesRomanBoldFont,
      });
      currentY -= 30;

      // Column widths
      const colSN = 40;
      const colCode = 80;
      const colName = tableWidth - colSN - colCode; // eslint-disable-line @typescript-eslint/no-unused-vars
      const rowHeight = 25;
      const headerHeight = 30;

      // Draw table header
      page.drawRectangle({
        x: margin,
        y: currentY - headerHeight,
        width: tableWidth,
        height: headerHeight,
        color: rgb(0.95, 0.95, 0.95),
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      // Header column borders
      page.drawLine({ start: { x: margin + colSN, y: currentY }, end: { x: margin + colSN, y: currentY - headerHeight }, thickness: 1 });
      page.drawLine({ start: { x: margin + colSN + colCode, y: currentY }, end: { x: margin + colSN + colCode, y: currentY - headerHeight }, thickness: 1 });

      // Header text
      page.drawText('S/N', { x: margin + 10, y: currentY - 20, size: 10, font: timesRomanBoldFont });
      page.drawText('CODE', { x: margin + colSN + 20, y: currentY - 20, size: 10, font: timesRomanBoldFont });
      page.drawText('SUBJECT NAME', { x: margin + colSN + colCode + 10, y: currentY - 20, size: 10, font: timesRomanBoldFont });

      currentY -= headerHeight;

      // Draw subject rows
      schoolSubjects.forEach((subject, index) => {
        if (index % 2 === 0) {
          page.drawRectangle({
            x: margin,
            y: currentY - rowHeight,
            width: tableWidth,
            height: rowHeight,
            color: rgb(0.98, 0.98, 0.98),
          });
        }

        page.drawRectangle({
          x: margin,
          y: currentY - rowHeight,
          width: tableWidth,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Column borders
        page.drawLine({ start: { x: margin + colSN, y: currentY }, end: { x: margin + colSN, y: currentY - rowHeight }, thickness: 1 });
        page.drawLine({ start: { x: margin + colSN + colCode, y: currentY }, end: { x: margin + colSN + colCode, y: currentY - rowHeight }, thickness: 1 });

        // Row data
        page.drawText(String(index + 1), { x: margin + 15, y: currentY - 17, size: 10, font: timesRomanFont });
        page.drawText(subject.code, { x: margin + colSN + 20, y: currentY - 17, size: 10, font: timesRomanBoldFont });
        page.drawText(subject.name, { x: margin + colSN + colCode + 10, y: currentY - 17, size: 10, font: timesRomanFont });

        currentY -= rowHeight;
      });

      // Total subjects count
      currentY -= 20;
      page.drawText(`Total Subjects: ${schoolSubjects.length}`, {
        x: margin,
        y: currentY,
        size: 11,
        font: timesRomanBoldFont,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `school-subjects-${authenticatedSchool.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    if (printType === "name") {
      handlePrintName();
    } else if (printType === "name-no-dob") {
      handlePrintNameNoDOB();
    } else if (printType === "ca") {
      handlePrintCA();
    } else if (printType === "photo") {
      handlePrintPhotoAlbum();
    } else if (printType === "subjects") {
      handlePrintSubjects();
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/school/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lgaCode, schoolCode, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoginError(data.error || 'Signup failed. Please try again.');
        return;
      }

      // Store JWT token and school data
      localStorage.setItem('schoolToken', data.token);
      localStorage.setItem('schoolData', JSON.stringify(data.school));
      
      // Auto login after signup
      setIsLoggedIn(true);
      setAuthenticatedSchool(data.school.schoolName);
    } catch (error) {
      console.error('Signup error:', error);
      setLoginError('An error occurred during signup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/school/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lgaCode, schoolCode, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoginError(data.error || 'Login failed. Please try again.');
        return;
      }

      // Store JWT token and school data
      localStorage.setItem('schoolToken', data.token);
      localStorage.setItem('schoolData', JSON.stringify(data.school));
      
      // Login successful
      setIsLoggedIn(true);
      setAuthenticatedSchool(data.school.schoolName);
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 xl:px-8 2xl:px-12">
        <div className="max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto">
          <Link href="/portal" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {isLoggedIn ? "Student Registrations" : (isSignupMode ? "School Signup" : "School Login")}
                  </CardTitle>
                  <CardDescription>
                    {isLoggedIn 
                      ? <>All registered students for <strong>{authenticatedSchool}</strong></>
                      : (isSignupMode 
                        ? "Create an account to access student registration data"
                        : "Please login with your LGA and school code to view student registrations")}
                  </CardDescription>
                </div>
                {isLoggedIn && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsLoggedIn(false);
                      setLgaCode("");
                      setSchoolCode("");
                      setAuthenticatedSchool("");
                      setLoginError("");
                      setPassword("");
                      localStorage.removeItem('schoolToken');
                      localStorage.removeItem('schoolData');
                    }}
                  >
                    Logout
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!isLoggedIn ? (
                // Login/Signup Form
                <form className="space-y-6" onSubmit={isSignupMode ? handleSignup : handleLogin}>
                  {loginError && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      {loginError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="lga">Local Government Area (LGA)</Label>
                    <Select value={lgaCode} onValueChange={setLgaCode} required>
                      <SelectTrigger id="lga">
                        <SelectValue placeholder="Select your LGA" />
                      </SelectTrigger>
                      <SelectContent>
                        {LGAS.map((item) => (
                          <SelectItem key={item.code} value={item.code}>
                            {formatLgaLabel(item.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schoolCode">School Code</Label>
                    <Input
                      id="schoolCode"
                      name="schoolCode"
                      type="text"
                      placeholder="Enter your school code"
                      value={schoolCode}
                      onChange={(e) => setSchoolCode(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder={isSignupMode ? "Create a password (minimum 6 characters)" : "Enter your password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (isSignupMode ? "Signing up..." : "Logging in...") : (isSignupMode ? "Sign Up" : "Login")}
                  </Button>

                  <div className="text-center text-sm">
                    <span className="text-muted-foreground">
                      {isSignupMode ? "Already have an account? " : "Don't have an account? "}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignupMode(!isSignupMode);
                        setLoginError("");
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      {isSignupMode ? "Login here" : "Sign up here"}
                    </button>
                  </div>
                </form>
              ) : (
                // Student Registrations Table
                <div>
                {/* School Subjects Section */}
                {(() => {
                  const schoolSubjectCodes = [...new Set(
                    registrations.flatMap(r => r.studentSubjects || [])
                  )];
                  const schoolSubjects = SUBJECTS.filter(s => schoolSubjectCodes.includes(s.code));
                  
                  if (schoolSubjects.length === 0) return null;
                  
                  return (
                    <div className="mb-6 p-4 bg-accent/50 rounded-lg border border-border">
                      <h3 className="font-semibold text-lg mb-3">
                        Subjects Offered by Your School
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {schoolSubjects.map((subject) => (
                          <span
                            key={subject.code}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium"
                          >
                            <span>{subject.name}</span>
                            <span className="text-xs opacity-70">({subject.code})</span>
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        Total: {schoolSubjects.length} subject{schoolSubjects.length !== 1 ? 's' : ''} registered
                      </p>
                    </div>
                  );
                })()}
                
                {isFetchingData ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading registrations...</span>
                  </div>
                ) : fetchError ? (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {fetchError}
                  </div>
                ) : registrations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No registrations found. Students registered in the school-registration or post-registration pages will appear here.
                  </div>
                ) : (
                  <div>
                    {(() => {
                      const filteredRegistrations = registrations.filter((student) => {
                        if (registrationModel !== "all") {
                          if (registrationModel === "post" && student.source !== "post") return false;
                          if (registrationModel === "student" && student.source !== "student") return false;
                        }
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        const fullName = `${student.lastname}, ${student.firstname}${student.othername ? ' ' + student.othername : ''}`.toLowerCase();
                        return (
                          student.studentNumber.toLowerCase().includes(query) ||
                          fullName.includes(query) ||
                          student.gender.toLowerCase().includes(query) ||
                          student.schoolType.toLowerCase().includes(query) ||
                          student.religiousType.toLowerCase().includes(query)
                        );
                      });
                      const sortedRegistrations = [...filteredRegistrations].sort((a, b) =>
                        a.studentNumber.localeCompare(b.studentNumber, undefined, { numeric: true, sensitivity: 'base' })
                      );

                      return (
                        <>
                          <div className="flex flex-col md:flex-row gap-4 mb-4">
                            <div className="flex-1 relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search by student number, name, gender, or school type..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                            <Select value={registrationModel} onValueChange={setRegistrationModel}>
                              <SelectTrigger className="w-[240px]">
                                <SelectValue placeholder="Select model" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Models</SelectItem>
                                <SelectItem value="student">StudentRegistration</SelectItem>
                                <SelectItem value="post">PostRegistration</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Select value={printType} onValueChange={setPrintType}>
                                <SelectTrigger className="w-[280px]">
                                  <SelectValue placeholder="Select print type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="name">Print Student Names List with DOB</SelectItem>
                                  <SelectItem value="name-no-dob">Print Student Names List</SelectItem>
                                  <SelectItem value="ca">Print Continuous Assessment Scores</SelectItem>
                                  <SelectItem value="photo">Print Student Photos</SelectItem>
                                  <SelectItem value="subjects">Print Subjects</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button 
                                onClick={handlePrint}
                                variant="outline"
                                className="gap-2 whitespace-nowrap"
                              >
                                <Printer className="h-4 w-4" />
                                Print
                              </Button>
                            </div>
                          </div>
                          
                          {searchQuery && (
                            <div className="mb-3 text-sm text-muted-foreground">
                              {filteredRegistrations.length === 0 ? (
                                <span>No results found for &ldquo;{searchQuery}&rdquo;</span>
                              ) : (
                                <span>Showing {filteredRegistrations.length} of {registrations.length} student{filteredRegistrations.length !== 1 ? 's' : ''}</span>
                              )}
                            </div>
                          )}

                          {filteredRegistrations.length === 0 && searchQuery ? (
                            <div className="text-center py-8 text-muted-foreground">
                              No students match your search. Try adjusting your search terms.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Passport</TableHead>
                                    <TableHead>Model</TableHead>
                                    <TableHead>Student Number</TableHead>
                                    <TableHead>Full Name</TableHead>
                                    <TableHead>Date of Birth</TableHead>
                                    <TableHead>Gender</TableHead>
                                    <TableHead>School Type</TableHead>
                                    <TableHead>CA Scores (Y1/Y2/Y3)</TableHead>
                                    <TableHead>Date Added</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sortedRegistrations.map((student) => (
                            <TableRow key={student.id}>
                              <TableCell>
                                {student.passport ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img 
                                    src={student.passport} 
                                    alt={`${student.lastname}, ${student.firstname}${student.othername ? ' ' + student.othername : ''}`}
                                    className="w-12 h-12 object-cover rounded-md border border-gray-300"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center text-xs text-gray-500">
                                    No Photo
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                {student.source === "post" ? "PostRegistration" : "StudentRegistration"}
                              </TableCell>
                              <TableCell className="font-medium">{student.studentNumber}</TableCell>
                              <TableCell>
                                {student.lastname}, {student.firstname}{student.othername ? ' ' + student.othername : ''}
                              </TableCell>
                              <TableCell className="text-xs">
                                {student.dateOfBirth ? isoToDdmmyyyy(student.dateOfBirth) : 'N/A'}
                              </TableCell>
                              <TableCell className="capitalize">{student.gender}</TableCell>
                              <TableCell className="capitalize">{student.schoolType}</TableCell>
                              <TableCell>
                                <div className="space-y-1 text-xs max-w-[300px]">
                                  {student.caScores && student.studentSubjects && student.studentSubjects.length > 0 ? (
                                    student.studentSubjects.map((code) => {
                                      const subject = SUBJECTS.find(s => s.code === code);
                                      const scores = student.caScores?.[code];
                                      if (!subject || !scores) return null;
                                      return (
                                        <div key={code} className="flex items-center gap-2">
                                          <span className="font-medium text-muted-foreground w-8">{code}:</span>
                                          <span>{scores.year1 || '-'}/{scores.year2 || '-'}/{scores.year3 || '-'}</span>
                                          {code === 'RGS' && student.religiousType && (
                                            <span className="text-muted-foreground">({student.religiousType === 'islam' ? 'Islamic' : 'Christian'})</span>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="space-y-1">
                                      {student.englishTerm1 && <div><span className="font-medium text-muted-foreground">ENG:</span> {student.englishTerm1}/{student.englishTerm2}/{student.englishTerm3}</div>}
                                      {student.arithmeticTerm1 && <div><span className="font-medium text-muted-foreground">MTH:</span> {student.arithmeticTerm1}/{student.arithmeticTerm2}/{student.arithmeticTerm3}</div>}
                                      {student.generalTerm1 && <div><span className="font-medium text-muted-foreground">GP:</span> {student.generalTerm1}/{student.generalTerm2}/{student.generalTerm3}</div>}
                                      {student.religiousTerm1 && (
                                        <div>
                                          <span className="font-medium text-muted-foreground">RGS:</span> {student.religiousTerm1}/{student.religiousTerm2}/{student.religiousTerm3}
                                          <span className="ml-1 text-muted-foreground">({student.religiousType === 'islam' ? 'Islamic' : 'Christian'})</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs">
                                {new Date(student.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(student)}
                                    className="h-8 w-8 p-0"
                                    title="Edit Student"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteStudent(student)}
                                    className="h-8 w-8 p-0"
                                    title="Delete Student"
                                    disabled={isDeleting === student.id}
                                  >
                                    {isDeleting === student.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Student Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student Registration</DialogTitle>
            <DialogDescription>
              Update student information for {editFormData?.studentNumber}
            </DialogDescription>
          </DialogHeader>
          
          {editError && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {editError}
            </div>
          )}

          {editFormData && (
            <div className="space-y-6">
              {/* Passport Photo Section */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Student Passport</h3>
                {editFormData.passport && (
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={editFormData.passport} 
                      alt={`${editFormData.lastname}, ${editFormData.firstname}${editFormData.othername ? ' ' + editFormData.othername : ''}`}
                      className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 shadow-sm"
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="edit-passport">Replace Passport</Label>
                    <Input
                      id="edit-passport"
                      type="file"
                      accept="image/*"
                      onChange={handleEditPassportChange}
                      className="cursor-pointer"
                    />
                  </div>
                  <div className="flex md:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemovePassport}
                      disabled={isSavingEdit}
                    >
                      Remove Passport
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-lastname">Surname</Label>
                    <Input
                      id="edit-lastname"
                      value={editFormData.lastname}
                      onChange={(e) => handleEditFormChange('lastname', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-firstname">First Name</Label>
                    <Input
                      id="edit-firstname"
                      value={editFormData.firstname}
                      onChange={(e) => handleEditFormChange('firstname', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-othername">Other Name</Label>
                    <Input
                      id="edit-othername"
                      value={editFormData.othername}
                      onChange={(e) => handleEditFormChange('othername', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-dateOfBirth">Date of Birth (DD/MM/YYYY)</Label>
                    <Input
                      id="edit-dateOfBirth"
                      type="text"
                      placeholder="DD/MM/YYYY"
                      maxLength={10}
                      value={editFormData.dateOfBirth || ''}
                      onChange={(e) => handleEditFormChange('dateOfBirth', handleDateInput(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-gender">Gender</Label>
                    <Select value={editFormData.gender} onValueChange={(value) => handleEditFormChange('gender', value)}>
                      <SelectTrigger id="edit-gender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-schoolType">School Type</Label>
                    <Select value={editFormData.schoolType} onValueChange={(value) => handleEditFormChange('schoolType', value)}>
                      <SelectTrigger id="edit-schoolType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary</SelectItem>
                        <SelectItem value="secondary">Secondary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-religiousType">Religious Type</Label>
                    <Select value={editFormData.religiousType || ""} onValueChange={(value) => handleEditFormChange('religiousType', value)}>
                      <SelectTrigger id="edit-religiousType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="christian">Christian</SelectItem>
                        <SelectItem value="islamic">Islamic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Subject Selection Section */}
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <h3 className="font-semibold text-lg">Examination Subjects</h3>
                  <p className="text-sm text-muted-foreground">
                    Select/deselect subjects for this student
                  </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {SUBJECTS.map((subject) => {
                    const isSelected = editModalSubjects.includes(subject.code);
                    return (
                      <div
                        key={subject.code}
                        className={`
                          flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all
                          ${isSelected 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                          }
                        `}
                        onClick={() => handleEditModalSubjectToggle(subject.code)}
                      >
                        <div className={`size-4 shrink-0 rounded-[4px] border flex items-center justify-center ${isSelected ? "bg-primary border-primary text-white" : "border-input"}`}>
                          {isSelected && <Check className="size-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium block truncate">
                            {subject.name}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            ({subject.code})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CA Scores for Selected Subjects */}
              {editModalSubjects.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <h3 className="font-semibold text-lg">Continuous Assessment Scores</h3>
                    <p className="text-sm text-muted-foreground">
                      Update CA scores for {editModalSubjects.length} selected subject{editModalSubjects.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  {editModalSubjects.map((subjectCode) => {
                    const subject = SUBJECTS.find(s => s.code === subjectCode);
                    if (!subject) return null;
                    
                    const scores = editModalCaScores[subjectCode] || { year1: '', year2: '', year3: '' };
                    
                    const updateEditModalScore = (year: 'year1' | 'year2' | 'year3', value: string) => {
                      setEditModalCaScores(prev => ({
                        ...prev,
                        [subjectCode]: {
                          year1: prev[subjectCode]?.year1 || '',
                          year2: prev[subjectCode]?.year2 || '',
                          year3: prev[subjectCode]?.year3 || '',
                          [year]: value,
                        }
                      }));
                    };
                    
                    return (
                      <div key={subjectCode} className="space-y-3">
                        <div className="flex items-center gap-4">
                          <Label className="text-base font-medium">{subject.name}</Label>
                          <span className="text-xs text-muted-foreground font-mono">({subjectCode})</span>
                          {subjectCode === 'RGS' && (
                            <Select 
                              value={editFormData.religiousType || ""} 
                              onValueChange={(value) => handleEditFormChange('religiousType', value)}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="islam">Islamic Studies</SelectItem>
                                <SelectItem value="christian">Christian Religious Studies</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-sm">Year 1</Label>
                            <Input
                              placeholder="1-100"
                              type="number"
                              min="1"
                              max="100"
                              value={scores.year1}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || (Number(val) >= 1 && Number(val) <= 100)) {
                                  updateEditModalScore('year1', val);
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm">Year 2</Label>
                            <Input
                              placeholder="1-100"
                              type="number"
                              min="1"
                              max="100"
                              value={scores.year2}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || (Number(val) >= 1 && Number(val) <= 100)) {
                                  updateEditModalScore('year2', val);
                                }
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm">Year 3</Label>
                            <Input
                              placeholder="1-100"
                              type="number"
                              min="1"
                              max="100"
                              value={scores.year3}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || (Number(val) >= 1 && Number(val) <= 100)) {
                                  updateEditModalScore('year3', val);
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditModal} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Validation;

"use client"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Upload, Edit2, X, Trash2, CheckCircle2, AlertCircle, Printer, Save, AlertTriangle, Check } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import schoolsData from '@/data.json';

interface SchoolData {
  lgaCode: string;
  lCode: string;
  schCode: string;
  progID: string;
  schName: string;
  id: string;
}

// CA Score structure for each subject: { year1, year2, year3 }
interface CAScore {
  year1: string;
  year2: string;
  year3: string;
}

// Dynamic CA scores keyed by subject code
interface CAScores {
  [subjectCode: string]: CAScore;
}

interface Registration {
  id: string | number;
  studentNumber: string;
  lastname: string;
  othername: string;
  firstname: string;
  dateOfBirth?: string;
  gender: string;
  schoolType: string;
  passport: string | null;
  // Legacy fields for backward compatibility
  english?: { year1: string; year2: string; year3: string };
  arithmetic?: { year1: string; year2: string; year3: string };
  general?: { year1: string; year2: string; year3: string };
  religious?: { year1: string; year2: string; year3: string; type: string };
  // New dynamic CA scores
  caScores?: CAScores;
  studentSubjects?: string[];
  isLateRegistration?: boolean;
  isPostRegistration?: boolean; // True if from post-registration
  year?: string;
  prcd?: number;
}

// LGA options: label = name, value = code
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

function formatLgaLabel(name: string) {
  // Convert e.g. "ANIOCHA-NORTH" -> "Aniocha North"
  return name
    .toLowerCase()
    .split(/[-\s]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Subject list with codes for secondary school
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

const SchoolRegistration = () => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  // Per-student subject selection (for current student being registered)
  const [studentSubjects, setStudentSubjects] = useState<string[]>([]);
  const [lgaCode, setLgaCode] = useState<string>("");
  const [schoolCode, setSchoolCode] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [gender, setGender] = useState<string>("");
  const [schoolType, setSchoolType] = useState<string>("");
  const [religiousType, setReligiousType] = useState<string>("");
  const [lastname, setLastname] = useState<string>("");
  const [firstname, setFirstname] = useState<string>("");
  const [othername, setOthername] = useState<string>("");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  // Dynamic CA scores state - keyed by subject code
  const [caScores, setCaScores] = useState<CAScores>({});
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editData, setEditData] = useState<Registration | null>(null);
  const [loginError, setLoginError] = useState<string>("");
  const [authenticatedSchool, setAuthenticatedSchool] = useState<string>("");
  const [studentCounter, setStudentCounter] = useState<number>(1);
  const [password, setPassword] = useState<string>("");
  const [isSignupMode, setIsSignupMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLateRegistrationMode, setIsLateRegistrationMode] = useState<boolean>(false);
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState<boolean>(false);
  const [registrationOpen, setRegistrationOpen] = useState<boolean>(true);
  const [checkingRegistrationStatus, setCheckingRegistrationStatus] = useState<boolean>(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState<boolean>(false);
  const [duplicateNames, setDuplicateNames] = useState<Array<{firstname: string, lastname: string, othername: string, studentNumber: string}>>([]);
  const [pendingRegistration, setPendingRegistration] = useState<Registration | null>(null);

  // Check registration status from server
  const checkRegistrationStatus = async (schoolId: string) => {
    try {
      setCheckingRegistrationStatus(true);
      const response = await fetch(`/api/admin/toggle-registration?schoolId=${schoolId}`);
      if (response.ok) {
        const data = await response.json();
        setRegistrationOpen(data.registrationOpen ?? true);
        // If registration is closed, enable late registration mode
        if (!data.registrationOpen) {
          setIsLateRegistrationMode(true);
        }
      } else if (response.status === 404) {
        console.error('School not found in database. You may need to log out and log in again.');
        // Clear stale data and force re-login
        localStorage.removeItem('schoolToken');
        localStorage.removeItem('schoolData');
        setIsLoggedIn(false);
        setLoginError('Your session is invalid. Please login again.');
      }
    } catch (error) {
      console.error('Error checking registration status:', error);
    } finally {
      setCheckingRegistrationStatus(false);
    }
  };

  // Check for duplicate names before saving
  const checkForDuplicates = async (student: { firstname: string, lastname: string, othername: string }): Promise<boolean> => {
    try {
      const token = localStorage.getItem('schoolToken');
      if (!token) {
        setSaveMessage({ type: 'error', text: 'Authentication token not found. Please login again.' });
        return false;
      }

      const response = await fetch('/api/school/check-duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          students: [{
            firstname: student.firstname,
            lastname: student.lastname,
            othername: student.othername,
          }],
        }),
      });

      if (!response.ok) {
        console.error('Failed to check duplicates');
        return false;
      }

      const data = await response.json();
      if (data.hasDuplicates && data.duplicates.length > 0) {
        setDuplicateNames(data.duplicates);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return false;
    }
  };

  // Toggle subject selection for current student
  const handleSubjectToggle = (code: string) => {
    setStudentSubjects(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code);
      } else {
        return [...prev, code];
      }
    });
    // Remove CA scores for deselected subject (outside setState callback)
    if (studentSubjects.includes(code)) {
      setCaScores(prev => {
        const newScores = { ...prev };
        delete newScores[code];
        return newScores;
      });
    }
  };

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
        // Check registration status for this school
        if (school.id) {
          checkRegistrationStatus(school.id);
        }
      } catch (error) {
        console.error('Error parsing school data:', error);
        localStorage.removeItem('schoolToken');
        localStorage.removeItem('schoolData');
      }
    }
  }, []);

  // Load registrations from server for the authenticated school
  const loadRegistrationsFromServer = async () => {
    try {
      const token = localStorage.getItem('schoolToken');
      if (!token) return;
      
      // Fetch regular registrations
      const res = await fetch('/api/school/registrations', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('Failed to fetch registrations:', data.error || res.statusText);
        
        // Handle auth errors (401, 404) by forcing re-login
        if (res.status === 401 || res.status === 404) {
          console.error('Invalid or expired session. Clearing token...');
          localStorage.removeItem('schoolToken');
          localStorage.removeItem('schoolData');
          setIsLoggedIn(false);
          setLoginError('Your session has expired or is invalid. Please login again.');
        }
        return;
      }
      const data = await res.json();
      const regularRegs: Registration[] = (data.registrations || []).map((r: any) => ({
        id: r.id,
        studentNumber: r.studentNumber,
        lastname: r.lastname,
        othername: r.othername || '',
        firstname: r.firstname,
        dateOfBirth: r.dateOfBirth ? new Date(r.dateOfBirth).toISOString().split('T')[0] : '',
        gender: r.gender,
        schoolType: r.schoolType,
        passport: r.passport || null,
        english: { year1: r.englishYear1, year2: r.englishYear2, year3: r.englishYear3 },
        arithmetic: { year1: r.arithmeticYear1, year2: r.arithmeticYear2, year3: r.arithmeticYear3 },
        general: { year1: r.generalYear1, year2: r.generalYear2, year3: r.generalYear3 },
        religious: { type: r.religiousType, year1: r.religiousYear1, year2: r.religiousYear2, year3: r.religiousYear3 },
        isLateRegistration: r.lateRegistration || false,
        isPostRegistration: false,
        studentSubjects: r.studentSubjects || [],
        caScores: r.caScores || {},
      }));
      
      // Also fetch post-registrations
      let postRegs: Registration[] = [];
      try {
        const postRes = await fetch('/api/school/post-registrations', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (postRes.ok) {
          const postData = await postRes.json();
          postRegs = (postData.registrations || []).map((r: any) => ({
            id: `post-${r.id}`, // Prefix to avoid ID collision
            studentNumber: r.studentNumber,
            lastname: r.lastname,
            othername: r.othername || '',
            firstname: r.firstname,
            dateOfBirth: r.dateOfBirth ? new Date(r.dateOfBirth).toISOString().split('T')[0] : '',
            gender: r.gender,
            schoolType: r.schoolType,
            passport: r.passport || null,
            english: { year1: r.englishYear1, year2: r.englishYear2, year3: r.englishYear3 },
            arithmetic: { year1: r.arithmeticYear1, year2: r.arithmeticYear2, year3: r.arithmeticYear3 },
            general: { year1: r.generalYear1, year2: r.generalYear2, year3: r.generalYear3 },
            religious: { type: r.religiousType, year1: r.religiousYear1, year2: r.religiousYear2, year3: r.religiousYear3 },
            isLateRegistration: r.lateRegistration || false,
            isPostRegistration: true,
            studentSubjects: r.studentSubjects || [],
            caScores: r.caScores || {},
          }));
        }
      } catch (postErr) {
        console.error('Error fetching post-registrations:', postErr);
      }
      
      // Merge both types of registrations
      setRegistrations([...regularRegs, ...postRegs]);
    } catch (e) {
      console.error('Error loading registrations from server:', e);
    }
  };

  // Local caching removed: table is fully server-driven
  useEffect(() => {
    // no-op
  }, [isLoggedIn, lgaCode, schoolCode]);

  // Load registrations and check status when logged in
  useEffect(() => {
    if (isLoggedIn) {
      loadRegistrationsFromServer();
      // Re-check registration status
      const schoolData = localStorage.getItem('schoolData');
      if (schoolData) {
        try {
          const school = JSON.parse(schoolData);
          if (school.id) {
            checkRegistrationStatus(school.id);
          }
        } catch (error) {
          console.error('Error parsing school data:', error);
        }
      }
    }
  }, [isLoggedIn]);

  // Local caching removed: do not persist to localStorage
  useEffect(() => {
    // no-op
  }, [isLoggedIn, lgaCode, schoolCode, registrations, studentCounter]);

  // Print current registrations with standardized header
  // Handle finish registration action
  const handleFinishRegistration = async () => {
    setShowFinishConfirmModal(false);
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const token = localStorage.getItem('schoolToken');
      
      if (!token) {
        setSaveMessage({ type: 'error', text: 'Authentication token not found. Please login again.' });
        return;
      }
      
      // First save current registrations
      const recomputed = recomputeStudentNumbers(lgaCode, schoolCode, registrations);
      const response = await fetch('/api/school/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ registrations: recomputed, override: true }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setSaveMessage({ type: 'error', text: data.error || 'Failed to save registrations' });
        return;
      }
      
      // Clear registrations from display and enable late registration mode
      setRegistrations([]);
      setIsLateRegistrationMode(true);
      
      setSaveMessage({ type: 'success', text: `Registration finalized! ${data.count} student(s) saved. Late registration mode is now active.` });
      
      // Auto-dismiss success message after 7 seconds
      setTimeout(() => {
        setSaveMessage(null);
      }, 7000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveMessage({ type: 'error', text: 'An error occurred while saving. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    if (!isLoggedIn || registrations.length === 0) return;
    const lgaItem = LGAS.find((l) => l.code === lgaCode);
    const lgaName = (lgaItem?.name || '').toUpperCase();
    const school = authenticatedSchool.toUpperCase();
    
    // Find the school data to get the actual lgaCode
    const schools = schoolsData as SchoolData[];
    const schoolData = schools.find((s) => s.lCode === lgaCode && s.schCode === schoolCode);
    const actualLgaCode = schoolData?.lgaCode || '1';
    
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const headerLine1 = 'MINISTRY OF SECONDARY EDUCATION';
    const headerLine2 = `LGA: ${actualLgaCode} :: ${lgaName || 'ANIOCHA-NORTH'} SCHOOL CODE: ${schoolCode || '1'} : ${school}`;
    const headerLine3 = `${currentYear}/${nextYear} BASIC EDUCATION CERTIFICATE EXAMINATION (BECE)`;

    const rowsHtml = registrations
      .slice()
      .sort((a, b) => a.studentNumber.localeCompare(b.studentNumber))
      .map((r, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${r.studentNumber}</td>
          <td>${r.lastname}</td>
          <td>${r.othername || '-'}</td>
          <td>${r.firstname}</td>
          <td style="text-transform: capitalize">${r.gender}</td>
        </tr>`;
    }).join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Registered Students Print</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; color: #000; padding: 24px; }
            .header { text-align: center; margin-bottom: 16px; }
            .header h1 { margin: 0; font-size: 18px; }
            .header h2 { margin: 6px 0 0; font-size: 12px; font-weight: 700; }
            .header h3 { margin: 8px 0 0; font-size: 13px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #000; padding: 6px 8px; font-size: 12px; text-align: left; }
            th { background: #f3f3f3; }
            .meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; }
            @media print { @page { size: A4; margin: 20mm; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${headerLine1}</h1>
            <h2>${headerLine2}</h2>
            <h3>${headerLine3}</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>REG NO.</th>
                <th>EXAM NO.</th>
                <th>LNAME</th>
                <th>MNAME</th>
                <th>FNAME</th>
                <th>SEX</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    // Give the browser a tick to finish rendering before printing
    setTimeout(() => {
      w.print();
      w.close();
    }, 300);
  };

  const saveRegistrationsToServer = async (toSave: Registration[]) => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const token = localStorage.getItem('schoolToken');
      if (!token) {
        setSaveMessage({ type: 'error', text: 'Authentication token not found. Please login again.' });
        return;
      }
      const response = await fetch('/api/school/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ registrations: toSave }),
      });
      const data = await response.json();
      if (!response.ok) {
        const msg: string = data?.error || '';
        // If duplicate student number error, recompute and override
        if (response.status === 400 && msg.toLowerCase().includes('already exist')) {
          try {
            const resGet = await fetch('/api/school/registrations', {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${token}` },
            });
            const getData = await resGet.json();
            const existing: Registration[] = (getData.registrations || []).map((r: any) => ({
              id: r.id,
              studentNumber: r.studentNumber,
              lastname: r.lastname,
              othername: r.othername || '',
              firstname: r.firstname,
              dateOfBirth: r.dateOfBirth ? new Date(r.dateOfBirth).toISOString().split('T')[0] : '',
              gender: r.gender,
              schoolType: r.schoolType,
              passport: r.passport || null,
              english: { year1: r.englishYear1, year2: r.englishYear2, year3: r.englishYear3 },
              arithmetic: { year1: r.arithmeticYear1, year2: r.arithmeticYear2, year3: r.arithmeticYear3 },
              general: { year1: r.generalYear1, year2: r.generalYear2, year3: r.generalYear3 },
              religious: { type: r.religiousType, year1: r.religiousYear1, year2: r.religiousYear2, year3: r.religiousYear3 },
              isLateRegistration: r.lateRegistration || false,
            }));
            // Merge: existing + new toSave (may not be in existing yet)
            const merged = [...existing, ...toSave.map(n => ({...n}))];
            const recomputedAll = recomputeStudentNumbers(lgaCode, schoolCode, merged);
            const resOverride = await fetch('/api/school/registrations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ registrations: recomputedAll, override: true }),
            });
            const overrideData = await resOverride.json();
            if (!resOverride.ok) {
              setSaveMessage({ type: 'error', text: overrideData.error || 'Failed to override registrations' });
              return;
            }
            setSaveMessage({ type: 'success', text: `Database reshuffled and saved ${overrideData.count} registration(s).` });
            await loadRegistrationsFromServer();
            setTimeout(() => setSaveMessage(null), 5000);
            return;
          } catch (err) {
            console.error('Override after duplicate failed:', err);
            setSaveMessage({ type: 'error', text: 'Failed to resolve duplicate by overriding. Please try Save Data.' });
            return;
          }
        }
        setSaveMessage({ type: 'error', text: msg || 'Failed to save registrations' });
        return;
      }
      setSaveMessage({ type: 'success', text: `Successfully saved ${data.count} registration(s) to the database!` });
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveMessage({ type: 'error', text: 'An error occurred while saving. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Generate student number: xfffNNNN format where NNNN is alphabetical rank of unique surnames
  const generateStudentNumber = (
    lgaCode: string,
    schoolCode: string,
    surname: string,
    currentRegs: Registration[]
  ): string => {
    // Find the actual school data to get lgaCode
    const schools = schoolsData as SchoolData[];
    const school = schools.find(
      (s) => s.lCode === lgaCode && s.schCode === schoolCode
    );

    if (!school) return '';

    const normalize = (s: string) => s.trim().toUpperCase();
    const target = normalize(surname);

    // Build a set of unique, normalized surnames including the new one
    const uniqueSurnames = Array.from(
      new Set([
        ...currentRegs.map((r) => normalize(r.lastname)),
        target,
      ])
    ).sort((a, b) => a.localeCompare(b));

    const rank = Math.max(0, uniqueSurnames.indexOf(target)) + 1; // 1-based

    const x = school.lgaCode; // 1-2 digits
    const fff = school.schCode.padStart(3, '0'); // 3 digits (padded)
    const nnnn = rank.toString().padStart(4, '0'); // 4 digits from surname rank

    return `${x}${fff}${nnnn}`;
  };

  // Recompute student numbers for all registrations based on current alphabetical rank of unique surnames
  const recomputeStudentNumbers = (
    lga: string,
    sch: string,
    regs: Registration[]
  ): Registration[] => {
    const schools = schoolsData as SchoolData[];
    const school = schools.find((s) => s.lCode === lga && s.schCode === sch);
    if (!school) return regs;
    const normalize = (s: string) => s.trim().toUpperCase();
    const uniqueSurnames = Array.from(new Set(regs.map((r) => normalize(r.lastname)))).sort((a, b) => a.localeCompare(b));
    const x = school.lgaCode;
    const fff = school.schCode.toString().padStart(3, '0');
    const rankOf = (surname: string) => (uniqueSurnames.indexOf(normalize(surname)) + 1).toString().padStart(4, '0');
    return regs.map((r) => ({
      ...r,
      studentNumber: `${x}${fff}${rankOf(r.lastname)}`,
    }));
  };

  // Generate incremental student number for late registrations
  const generateIncrementalStudentNumber = async (
    lga: string,
    sch: string
  ): Promise<string> => {
    const schools = schoolsData as SchoolData[];
    const school = schools.find((s) => s.lCode === lga && s.schCode === sch);
    if (!school) return '';
    
    const x = school.lgaCode;
    const fff = school.schCode.toString().padStart(3, '0');
    
    // Fetch ALL existing registrations from the database to find the true maximum
    try {
      const token = localStorage.getItem('schoolToken');
      if (!token) return `${x}${fff}0001`;
      
      const response = await fetch('/api/school/registrations', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        console.error('Failed to fetch registrations for number generation');
        return `${x}${fff}0001`;
      }
      
      const data = await response.json();
      const allRegs = data.registrations || [];
      
      // Find the highest existing sequence number (last 4 digits)
      let maxSequence = 0;
      allRegs.forEach((reg: any) => {
        if (reg.studentNumber) {
          // Extract last 4 digits from student number
          const lastFourDigits = reg.studentNumber.slice(-4);
          const sequence = parseInt(lastFourDigits, 10);
          if (!isNaN(sequence) && sequence > maxSequence) {
            maxSequence = sequence;
          }
        }
      });
      
      // Increment by 1 for the new late registration
      const nextSequence = (maxSequence + 1).toString().padStart(4, '0');
      return `${x}${fff}${nextSequence}`;
    } catch (error) {
      console.error('Error generating incremental student number:', error);
      return `${x}${fff}0001`;
    }
  };

  // Process registration after duplicate check or user confirmation
  const processRegistration = async (newRegistration: Registration) => {
    // Handle student number assignment based on registration mode
    // Use late registration mode if either manually enabled OR registration is closed
    if (isLateRegistrationMode || !registrationOpen) {
      // Late registration: Generate incremental student number from database
      const incrementalNumber = await generateIncrementalStudentNumber(lgaCode, schoolCode);
      newRegistration.studentNumber = incrementalNumber;
      
      // Add to registrations without recomputing
      const withNew = [...registrations, newRegistration];
      setRegistrations(withNew);
      
      // Save only the new late registration
      await saveRegistrationsToServer([newRegistration]);
      await loadRegistrationsFromServer();
    } else {
      // Normal registration: Recompute all student numbers alphabetically
      const withNew = [...registrations, newRegistration];
      const recomputed = recomputeStudentNumbers(lgaCode, schoolCode, withNew);
      setRegistrations(recomputed);
      
      // Save only the newly added registration with its final studentNumber
      const savedNew = recomputed.find(r => r.id === newRegistration.id);
      if (savedNew) {
        await saveRegistrationsToServer([savedNew]);
        await loadRegistrationsFromServer();
      }
    }
    
    setStudentCounter(studentCounter + 1);
    
    // Reset form fields
    setSelectedImage(null);
    setGender("");
    setSchoolType("");
    setReligiousType("");
    setLastname("");
    setFirstname("");
    setOthername("");
    setDateOfBirth("");
    // Reset per-student subject selection and CA scores
    setStudentSubjects([]);
    setCaScores({});
  };

  // Helper function to limit score input to 2 digits
  const handleScoreInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const value = input.value;
    if (value.length > 2) {
      input.value = value.slice(0, 2);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
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
        <div className="max-w-2xl xl:max-w-3xl 2xl:max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {isLoggedIn ? "Secondary School Registration" : (isSignupMode ? "School Signup" : "School Login")}
                  </CardTitle>
                  <CardDescription>
                    {isLoggedIn 
                      ? <>Register new students for <strong>{authenticatedSchool}</strong></>
                      : (isSignupMode 
                        ? "Create an account to access the registration system"
                        : "Please login with your LGA and school code to access registration")}
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
                    <select
                      id="lga"
                      value={lgaCode}
                      onChange={(e) => setLgaCode(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="">Select your LGA</option>
                      {LGAS.map((item) => (
                        <option key={item.code} value={item.code}>
                          {formatLgaLabel(item.name)}
                        </option>
                      ))}
                    </select>
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
                // Registration Form
                <>
                {/* Registration Status Banners */}
                {!registrationOpen && (
                  <div className="mb-4 p-4 rounded-lg bg-red-50 border-2 border-red-300 flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold text-red-900 text-lg">Registration Closed by Admin</p>
                      <p className="text-sm text-red-800">
                        All new student registrations will be automatically marked as <strong>LATE</strong>.
                      </p>
                    </div>
                  </div>
                )}
                {isLateRegistrationMode && registrationOpen && (
                  <div className="mb-4 p-4 rounded-lg bg-amber-50 border-2 border-amber-300 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-amber-900">Late Registration Mode Active</p>
                      <p className="text-sm text-amber-800">All new registrations will be marked as late registrations.</p>
                    </div>
                  </div>
                )}
                <form className="space-y-6" onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);

                  // Check if all selected subjects have complete CA scores
                  const allSubjectsHaveScores = studentSubjects.every(code => {
                    const scores = caScores[code];
                    return scores && scores.year1 !== "" && scores.year2 !== "" && scores.year3 !== "";
                  });

                  // Check if RGS is selected and religiousType is set
                  const hasReligiousType = !studentSubjects.includes('RGS') || religiousType !== "";

                  // Ensure all required fields are filled before allowing submission
                  const isFormComplete =
                    lastname.trim() !== "" &&
                    othername.trim() !== "" &&
                    firstname.trim() !== "" &&
                    dateOfBirth.trim() !== "" &&
                    gender !== "" &&
                    schoolType !== "" &&
                    hasReligiousType &&
                    selectedImage !== null &&
                    allSubjectsHaveScores;

                  if (!isFormComplete) {
                    return;
                  }
                  
                  // Prepare new registration (studentNumber will be assigned after recompute or incrementally)
                  const newRegistration: Registration = {
                    id: Date.now(),
                    studentNumber: '',
                    lastname: formData.get('lastname') as string,
                    othername: formData.get('othername') as string,
                    firstname: formData.get('firstname') as string,
                    dateOfBirth: dateOfBirth,
                    gender: gender,
                    schoolType: schoolType,
                    passport: selectedImage,
                    // Store dynamic CA scores and selected subjects
                    caScores: caScores,
                    studentSubjects: studentSubjects,
                    // Keep religiousType for backward compatibility
                    religious: studentSubjects.includes('RGS') ? {
                      year1: caScores['RGS']?.year1 || '-',
                      year2: caScores['RGS']?.year2 || '-',
                      year3: caScores['RGS']?.year3 || '-',
                      type: religiousType,
                    } : undefined,
                    isLateRegistration: isLateRegistrationMode || !registrationOpen,
                  };
                  
                  // Check for duplicate names before proceeding
                  const hasDuplicate = await checkForDuplicates({
                    firstname: newRegistration.firstname,
                    lastname: newRegistration.lastname,
                    othername: newRegistration.othername,
                  });

                  if (hasDuplicate) {
                    // Store the pending registration and show duplicate dialog
                    setPendingRegistration(newRegistration);
                    setShowDuplicateDialog(true);
                    return;
                  }

                  // No duplicate found, proceed with registration
                  await processRegistration(newRegistration);
                  e.currentTarget.reset();
                }}>
                <div className="space-y-2">
                  <Label htmlFor="lastname">Lastname/Surname</Label>
                  <Input
                    id="lastname"
                    name="lastname"
                    placeholder="Enter lastname"
                    type="text"
                    required
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="othername">Other Name/Middlename</Label>
                  <Input
                    id="othername"
                    name="othername"
                    placeholder="Enter other name or middlename"
                    type="text"
                    required
                    value={othername}
                    onChange={(e) => setOthername(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firstname">First Name</Label>
                  <Input
                    id="firstname"
                    name="firstname"
                    placeholder="Enter first name"
                    type="text"
                    required
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolType">School Type</Label>
                  <select
                    id="schoolType"
                    value={schoolType}
                    onChange={(e) => setSchoolType(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select school type</option>
                    <option value="public">Public School</option>
                    <option value="private">Private School</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Upload Passport</Label>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="cursor-pointer"
                        required
                      />
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    {selectedImage && (
                      <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                        <img
                          src={selectedImage}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Examination Subject Selection - Per Student */}
                <div className="space-y-4 pt-6 border-t">
                  <div>
                    <h3 className="text-lg font-semibold">Examination Subjects</h3>
                    <p className="text-sm text-muted-foreground">
                      Select the BECE subjects this student will be registered for
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {SUBJECTS.map((subject) => {
                      const isSelected = studentSubjects.includes(subject.code);
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
                          onClick={() => handleSubjectToggle(subject.code)}
                        >
                          <div className={`size-4 shrink-0 rounded-[4px] border flex items-center justify-center ${isSelected ? "bg-primary border-primary text-white" : "border-input"}`}>
                            {isSelected && <Check className="size-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span 
                              className="text-sm font-medium cursor-pointer block truncate"
                            >
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
                  
                  {studentSubjects.length === 0 && (
                    <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      Please select at least one examination subject for this student.
                    </p>
                  )}
                </div>

                {/* Continuous Assessment Section - Dynamic based on selected subjects */}
                {studentSubjects.length > 0 && (
                <div className="space-y-6 pt-6 border-t">
                  <div>
                    <h3 className="text-lg font-semibold">Continuous Assessment</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter CA scores for the {studentSubjects.length} selected subject{studentSubjects.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  {/* Dynamic Subject CA Inputs */}
                  {studentSubjects.map((subjectCode) => {
                    const subject = SUBJECTS.find(s => s.code === subjectCode);
                    if (!subject) return null;
                    
                    const scores = caScores[subjectCode] || { year1: '', year2: '', year3: '' };
                    
                    const updateScore = (year: 'year1' | 'year2' | 'year3', value: string) => {
                      setCaScores(prev => ({
                        ...prev,
                        [subjectCode]: {
                          ...prev[subjectCode],
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
                          {/* Religious type selector for RGS */}
                          {subjectCode === 'RGS' && (
                            <select
                              value={religiousType}
                              onChange={(e) => setReligiousType(e.target.value)}
                              className="flex h-9 w-[200px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              required
                            >
                              <option value="">Select type</option>
                              <option value="islam">Islamic Studies</option>
                              <option value="christian">Christian Religious Studies</option>
                            </select>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor={`${subjectCode}-year1`} className="text-sm">First Year</Label>
                            <Input
                              id={`${subjectCode}-year1`}
                              name={`${subjectCode}-year1`}
                              placeholder="0-99"
                              type="number"
                              min="0"
                              max="99"
                              onInput={handleScoreInput}
                              required
                              value={scores.year1}
                              onChange={(e) => updateScore('year1', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${subjectCode}-year2`} className="text-sm">Second Year</Label>
                            <Input
                              id={`${subjectCode}-year2`}
                              name={`${subjectCode}-year2`}
                              placeholder="0-99"
                              type="number"
                              min="0"
                              max="99"
                              onInput={handleScoreInput}
                              required
                              value={scores.year2}
                              onChange={(e) => updateScore('year2', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${subjectCode}-year3`} className="text-sm">Third Year</Label>
                            <Input
                              id={`${subjectCode}-year3`}
                              name={`${subjectCode}-year3`}
                              placeholder="0-99"
                              type="number"
                              min="0"
                              max="99"
                              onInput={handleScoreInput}
                              required
                              value={scores.year3}
                              onChange={(e) => updateScore('year3', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    lastname.trim() === "" ||
                    othername.trim() === "" ||
                    firstname.trim() === "" ||
                    gender === "" ||
                    schoolType === "" ||
                    studentSubjects.length === 0 ||
                    (studentSubjects.includes('RGS') && religiousType === "") ||
                    selectedImage === null ||
                    !studentSubjects.every(code => {
                      const scores = caScores[code];
                      return scores && scores.year1 !== "" && scores.year2 !== "" && scores.year3 !== "";
                    })
                  }
                >
                  Submit Registration
                </Button>
              </form>
              </>
              )}
            </CardContent>
          </Card>

          {/* Registered Students Table */}
          {isLoggedIn && registrations.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Registered Students</CardTitle>
                    <CardDescription>
                      {registrations.length} student{registrations.length !== 1 ? 's' : ''} registered
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={handlePrint} disabled={!registrations.length}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {saveMessage && (
                  <div className={`mb-6 overflow-hidden rounded-xl transition-all duration-500 ease-in-out animate-in fade-in slide-in-from-top-4 ${
                    saveMessage.type === 'success' 
                      ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-200/60' 
                      : 'bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 border-2 border-red-200/60'
                  }`}>
                    <div className="relative p-6">
                      {/* Decorative background pattern */}
                      <div className="absolute inset-0 opacity-10">
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
                          saveMessage.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'
                        }`} />
                        <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl ${
                          saveMessage.type === 'success' ? 'bg-teal-400' : 'bg-rose-400'
                        }`} />
                      </div>
                      
                      {/* Content */}
                      <div className="relative flex items-start gap-4">
                        {/* Icon with animated background */}
                        <div className={`shrink-0 relative ${
                          saveMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          <div className={`absolute inset-0 rounded-full blur-md opacity-40 animate-pulse ${
                            saveMessage.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'
                          }`} />
                          <div className={`relative flex items-center justify-center w-12 h-12 rounded-full ${
                            saveMessage.type === 'success' 
                              ? 'bg-emerald-100 ring-4 ring-emerald-200/50' 
                              : 'bg-red-100 ring-4 ring-red-200/50'
                          }`}>
                            {saveMessage.type === 'success' ? (
                              <CheckCircle2 className="h-6 w-6" strokeWidth={2.5} />
                            ) : (
                              <AlertCircle className="h-6 w-6" strokeWidth={2.5} />
                            )}
                          </div>
                        </div>
                        
                        {/* Text content */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold text-xl mb-2 tracking-tight ${
                            saveMessage.type === 'success' ? 'text-emerald-900' : 'text-red-900'
                          }`}>
                            {saveMessage.type === 'success' ? '✨ Successfully Saved!' : '⚠️ Error Occurred'}
                          </h3>
                          <p className={`text-base leading-relaxed ${
                            saveMessage.type === 'success' ? 'text-emerald-800/90' : 'text-red-800/90'
                          }`}>
                            {saveMessage.text}
                          </p>
                          {saveMessage.type === 'success' && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700/80">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="font-medium">All data has been securely stored</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Close button */}
                        <button
                          onClick={() => setSaveMessage(null)}
                          className={`shrink-0 rounded-lg p-2 transition-all duration-200 hover:scale-110 ${
                            saveMessage.type === 'success' 
                              ? 'hover:bg-emerald-200/50 text-emerald-700 hover:text-emerald-800' 
                              : 'hover:bg-red-200/50 text-red-700 hover:text-red-800'
                          }`}
                          aria-label="Close notification"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Photo</TableHead>
                        <TableHead>Student Number</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>School Type</TableHead>
                        <TableHead>CA Scores (Y1/Y2/Y3)</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrations
                        .slice()
                        .sort((a, b) => a.studentNumber.localeCompare(b.studentNumber))
                        .map((reg) => {
                        const isEditing = editingId === reg.id;
                        const currentData = isEditing && editData ? editData : reg;
                        
                        return (
                          <TableRow key={reg.id}>
                            <TableCell>
                              {reg.passport ? (
                                <img
                                  src={reg.passport}
                                  alt="Student"
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xs">
                                  No Photo
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="font-mono text-sm font-semibold">{reg.studentNumber}</div>
                                {reg.isPostRegistration ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                                    POST
                                  </span>
                                ) : reg.isLateRegistration && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                                    LATE
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="space-y-1">
                                  <Input
                                    value={currentData.firstname}
                                    onChange={(e) => setEditData({...currentData, firstname: e.target.value})}
                                    className="h-8"
                                    placeholder="First name"
                                  />
                                  <Input
                                    value={currentData.othername}
                                    onChange={(e) => setEditData({...currentData, othername: e.target.value})}
                                    className="h-8"
                                    placeholder="Other name"
                                  />
                                  <Input
                                    value={currentData.lastname}
                                    onChange={(e) => setEditData({...currentData, lastname: e.target.value})}
                                    className="h-8"
                                    placeholder="Last name"
                                  />
                                </div>
                              ) : (
                                <div className="font-medium">{reg.lastname} {reg.othername} {reg.firstname}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <select
                                  value={currentData.gender}
                                  onChange={(e) => setEditData({...currentData, gender: e.target.value})}
                                  className="h-8 w-[100px] rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                                >
                                  <option value="male">Male</option>
                                  <option value="female">Female</option>
                                </select>
                              ) : (
                                <span className="capitalize">{reg.gender}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <select
                                  value={currentData.schoolType}
                                  onChange={(e) => setEditData({...currentData, schoolType: e.target.value})}
                                  className="h-8 w-[120px] rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                                >
                                  <option value="public">Public</option>
                                  <option value="private">Private</option>
                                </select>
                              ) : (
                                <span className="capitalize">{reg.schoolType}</span>
                              )}
                            </TableCell>
                            {/* Dynamic CA Scores Cell */}
                            <TableCell>
                              <div className="space-y-1 text-xs max-w-[300px]">
                                {reg.caScores && reg.studentSubjects ? (
                                  // New dynamic CA scores display
                                  reg.studentSubjects.map((code) => {
                                    const subject = SUBJECTS.find(s => s.code === code);
                                    const scores = reg.caScores?.[code];
                                    if (!subject || !scores) return null;
                                    return (
                                      <div key={code} className="flex items-center gap-2">
                                        <span className="font-medium text-muted-foreground w-8">{code}:</span>
                                        <span>{scores.year1 || '-'}/{scores.year2 || '-'}/{scores.year3 || '-'}</span>
                                        {code === 'RGS' && reg.religious?.type && (
                                          <span className="text-muted-foreground">({reg.religious.type === 'islam' ? 'Islamic' : 'Christian'})</span>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  // Legacy display for backward compatibility
                                  <div className="space-y-1">
                                    {reg.english && <div><span className="font-medium text-muted-foreground">ENG:</span> {reg.english.year1}/{reg.english.year2}/{reg.english.year3}</div>}
                                    {reg.arithmetic && <div><span className="font-medium text-muted-foreground">MTH:</span> {reg.arithmetic.year1}/{reg.arithmetic.year2}/{reg.arithmetic.year3}</div>}
                                    {reg.general && <div><span className="font-medium text-muted-foreground">GP:</span> {reg.general.year1}/{reg.general.year2}/{reg.general.year3}</div>}
                                    {reg.religious && (
                                      <div>
                                        <span className="font-medium text-muted-foreground">RGS:</span> {reg.religious.year1}/{reg.religious.year2}/{reg.religious.year3}
                                        <span className="ml-1 text-muted-foreground">({reg.religious.type === 'islam' ? 'Islamic' : 'Christian'})</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={async () => {
                                      try {
                                        const token = localStorage.getItem('schoolToken');
                                        if (!token) {
                                          setSaveMessage({ type: 'error', text: 'Authentication token not found. Please login again.' });
                                          return;
                                        }
                                        const update = {
                                          firstname: editData!.firstname,
                                          othername: editData!.othername,
                                          lastname: editData!.lastname,
                                          gender: editData!.gender,
                                          schoolType: editData!.schoolType,
                                          passport: editData!.passport,
                                          caScores: editData!.caScores,
                                          studentSubjects: editData!.studentSubjects,
                                          religious: editData!.religious,
                                        };
                                        const res = await fetch('/api/school/registrations', {
                                          method: 'PATCH',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`,
                                          },
                                          body: JSON.stringify({ id: reg.id, update }),
                                        });
                                        const data = await res.json();
                                        if (!res.ok) {
                                          setSaveMessage({ type: 'error', text: data.error || 'Failed to update registration' });
                                          return;
                                        }
                                        setSaveMessage({ type: 'success', text: 'Registration updated successfully.' });
                                        setEditingId(null);
                                        setEditData(null);
                                        await loadRegistrationsFromServer();
                                        setTimeout(() => setSaveMessage(null), 4000);
                                      } catch (e) {
                                        console.error('Inline update error:', e);
                                        setSaveMessage({ type: 'error', text: 'An error occurred while updating. Please try again.' });
                                      }
                                    }}
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingId(null);
                                      setEditData(null);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingId(reg.id);
                                      setEditData(reg);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={async () => {
                                      if (!confirm('Are you sure you want to delete this student registration?')) return;
                                      try {
                                        const token = localStorage.getItem('schoolToken');
                                        if (!token) {
                                          setSaveMessage({ type: 'error', text: 'Authentication token not found. Please login again.' });
                                          return;
                                        }
                                        const res = await fetch('/api/school/registrations', {
                                          method: 'DELETE',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`,
                                          },
                                          body: JSON.stringify({ id: reg.id }),
                                        });
                                        const data = await res.json();
                                        if (!res.ok) {
                                          setSaveMessage({ type: 'error', text: data.error || 'Failed to delete registration' });
                                          return;
                                        }
                                        setSaveMessage({ type: 'success', text: 'Registration deleted successfully.' });
                                        await loadRegistrationsFromServer();
                                        setTimeout(() => setSaveMessage(null), 4000);
                                      } catch (e) {
                                        console.error('Inline delete error:', e);
                                        setSaveMessage({ type: 'error', text: 'An error occurred while deleting. Please try again.' });
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Duplicate Name Detection Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold text-gray-900">
              Student Already Registered
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-2">
              <p className="text-center text-gray-600">
                This student has already been added to the system:
              </p>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 space-y-2">
                {duplicateNames.map((dup, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-lg font-bold text-red-900">
                      {dup.firstname} {dup.othername} {dup.lastname}
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      Student Number: <span className="font-semibold">{dup.studentNumber}</span>
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-gray-500 italic">
                Would you like to register this student again anyway?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3">
            <AlertDialogCancel 
              onClick={() => {
                setPendingRegistration(null);
                setDuplicateNames([]);
              }}
              className="w-full sm:w-auto"
            >
              No, Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingRegistration) {
                  await processRegistration(pendingRegistration);
                  setPendingRegistration(null);
                  setDuplicateNames([]);
                }
              }}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              Yes, Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default SchoolRegistration;

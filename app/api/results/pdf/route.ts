import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

const GLOBAL_RESULTS_RELEASE_KEY = '__GLOBAL_RESULTS_RELEASE__';

const timingSafeEqualString = (a: string, b: string) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accessPin = searchParams.get('accessPin') ?? searchParams.get('pinCode');
    const examinationNumber = searchParams.get('examNumber');

    // Validate required fields
    if (!accessPin || !examinationNumber) {
      return NextResponse.json(
        { error: 'Access Pin and Examination Number are required.' },
        { status: 400 }
      );
    }

    const masterPin = process.env.MASTER_PIN;
    const isMasterPin =
      typeof masterPin === 'string' &&
      masterPin.length > 0 &&
      timingSafeEqualString(accessPin, masterPin);

    if (!isMasterPin) {
      const globalSetting = await prisma.accessPin.findUnique({
        where: { pin: GLOBAL_RESULTS_RELEASE_KEY },
        select: { isActive: true },
      });

      if (globalSetting && !globalSetting.isActive) {
        return NextResponse.json(
          { error: 'Results access is currently disabled.' },
          { status: 403 }
        );
      }
    }

    // Query database - keep a narrow, explicit shape to avoid `any`
    const where: Prisma.ResultWhereInput = {
      ...(isMasterPin ? {} : { accessPin }),
      examinationNo: examinationNumber,
      ...(isMasterPin ? {} : { blocked: false }),
    };

    const result = (await prisma.result.findFirst({ where })) as unknown as {
      examinationNo: string;
      sessionYr: string | null;
      fName: string | null;
      mName: string | null;
      lName: string | null;
      sexCd: string | null;
      dateOfBirth: Date | string | null;
      schoolName: string | null;
      lgaCd: string | null;
      engGrd: string | null;
      aritGrd: string | null;
      gpGrd: string | null;
      rgsGrd: string | null;
      rgstype: string | null;
      remark: string | null;
    } | null;

    if (!result) {
      const blockedResult = await prisma.result.findFirst({
        where: {
          ...(isMasterPin ? {} : { accessPin }),
          examinationNo: examinationNumber,
          blocked: true,
        },
        select: { id: true },
      });

      if (blockedResult && !isMasterPin) {
        return NextResponse.json(
          { error: 'Access to this result has been disabled contact the Ministry' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'No result found with the provided credentials.' },
        { status: 404 }
      );
    }

    // Fetch passport from StudentRegistration using the same accessPin
    const studentRegistration = await prisma.studentRegistration.findFirst({
      where: {
        accCode: accessPin,
      },
      select: {
        passport: true,
      },
    });

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    
    // Load fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Helper function - center text
    const centerText = (txt: string, size: number, y: number, f = font) => {
      const w = f.widthOfTextAtSize(txt, size);
      page.drawText(txt, { x: (width - w) / 2, y, size, font: f, color: rgb(0, 0, 0) });
    };

    const drawDottedHLine = (
      y: number,
      xStart: number,
      xEnd: number,
      thickness = 0.8,
      color = rgb(0.7, 0.7, 0.7),
      dash = 3,
      gap = 3
    ) => {
      for (let x = xStart; x < xEnd; x += dash + gap) {
        page.drawLine({
          start: { x, y },
          end: { x: Math.min(x + dash, xEnd), y },
          thickness,
          color,
        });
      }
    };

    const drawDottedVLine = (
      x: number,
      yStart: number,
      yEnd: number,
      thickness = 0.8,
      color = rgb(0.7, 0.7, 0.7),
      dash = 3,
      gap = 3
    ) => {
      const top = Math.max(yStart, yEnd);
      const bottom = Math.min(yStart, yEnd);
      for (let y = bottom; y < top; y += dash + gap) {
        page.drawLine({
          start: { x, y },
          end: { x, y: Math.min(y + dash, top) },
          thickness,
          color,
        });
      }
    };

    const drawDottedRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      thickness = 1,
      color = rgb(0, 0, 0)
    ) => {
      drawDottedHLine(y + h, x, x + w, thickness, color, 3, 3);
      drawDottedHLine(y, x, x + w, thickness, color, 3, 3);
      drawDottedVLine(x, y, y + h, thickness, color, 3, 3);
      drawDottedVLine(x + w, y, y + h, thickness, color, 3, 3);
    };

    // Draw outer border
    const margin = 40;
    drawDottedRect(margin, margin, width - 2 * margin, height - 2 * margin, 1, rgb(0, 0, 0));

    const innerInset = 10;
    page.drawRectangle({
      x: margin + innerInset,
      y: margin + innerInset,
      width: width - 2 * margin - 2 * innerInset,
      height: height - 2 * margin - 2 * innerInset,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Starting Y position
    let currentY = height - 60;

    // Header - FEDERAL REPUBLIC OF NIGERIA
    centerText('FEDERAL REPUBLIC OF NIGERIA', 12, currentY, bold);
    currentY -= 25;

    // Try to embed logo
    try {
      const logoPath = path.join(process.cwd(), 'public', 'delta-logo.png');
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const logoDims = logoImage.scale(0.15);
      
      page.drawImage(logoImage, {
        x: (width - logoDims.width) / 2,
        y: currentY - logoDims.height - 5,
        width: logoDims.width,
        height: logoDims.height,
      });
      currentY -= logoDims.height + 15;
    } catch (err) {
      console.error('Failed to load logo:', err);
      currentY -= 20;
    }

    // Ministry title
    centerText('Ministry of secondary education', 11, currentY, bold);
    currentY -= 15;
    centerText('Cognitive/Placement Certification Result', 10, currentY, font);
    currentY -= 25;

    // Dashed line separator
    for (let x = margin + 10; x < width - margin - 10; x += 10) {
      page.drawLine({
        start: { x, y: currentY },
        end: { x: x + 5, y: currentY },
        thickness: 1,
        color: rgb(0.6, 0.6, 0.6),
      });
    }
    currentY -= 20;

    // Helper function for drawing dashed lines
    const drawDashedLine = (y: number) => {
      for (let x = margin + 18; x < width - margin - 18; x += 10) {
        page.drawLine({
          start: { x, y },
          end: { x: x + 5, y },
          thickness: 0.8,
          color: rgb(0.7, 0.7, 0.7),
        });
      }
    };

    const leftMargin = margin + innerInset + 10;
    const lineSpacing = 18;

    // Year and Date Printed (same line, left and right aligned)
    const dateStr = new Date()
      .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      .replace(/\s/g, '-');
    page.drawText(`Year: `, { x: leftMargin, y: currentY, size: 9, font });
    page.drawText(`${result.sessionYr || 'N/A'}`, { x: leftMargin + 30, y: currentY, size: 9, font: bold });
    
    const datePrintedText = `Date Printed: ${dateStr}`;
    const datePrintedWidth = font.widthOfTextAtSize(datePrintedText, 9);
    page.drawText(datePrintedText, { x: width - margin - 15 - datePrintedWidth, y: currentY, size: 9, font });
    currentY -= lineSpacing;
    
    drawDashedLine(currentY);
    currentY -= lineSpacing;

    const infoBoxX = leftMargin;
    const infoBoxW = width - (margin + innerInset + 10) - infoBoxX;
    const infoRowH = 18;
    const infoPad = 8;
    const infoBoxTopY = currentY + 10;
    const infoBoxH = infoPad * 2 + infoRowH * 5;

    // Calculate passport dimensions
    const passportWidth = 80;
    const passportHeight = 100;
    const hasPassport = studentRegistration?.passport;

    page.drawRectangle({
      x: infoBoxX,
      y: infoBoxTopY - infoBoxH,
      width: infoBoxW,
      height: infoBoxH,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Try to embed passport photo if available
    let passportImage = null;
    if (hasPassport && studentRegistration.passport) {
      try {
        console.log('Attempting to fetch passport from:', studentRegistration.passport);
        
        // Check if it's a data URL
        if (studentRegistration.passport.startsWith('data:')) {
          // Extract base64 data from data URL
          const base64Data = studentRegistration.passport.split(',')[1];
          const passportBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          
          // Try to embed as PNG or JPG
          try {
            passportImage = await pdfDoc.embedPng(passportBytes);
          } catch {
            passportImage = await pdfDoc.embedJpg(passportBytes);
          }
        } else {
          // It's a URL - fetch it
          const passportResponse = await fetch(studentRegistration.passport);
          if (!passportResponse.ok) {
            console.error('Failed to fetch passport, status:', passportResponse.status);
          } else {
            const passportBuffer = await passportResponse.arrayBuffer();
            const passportBytes = new Uint8Array(passportBuffer);
            
            // Try to embed as PNG or JPG
            try {
              passportImage = await pdfDoc.embedPng(passportBytes);
            } catch {
              passportImage = await pdfDoc.embedJpg(passportBytes);
            }
          }
        }
        
        // Draw passport photo on the left side of info box
        if (passportImage) {
          console.log('Successfully embedded passport photo');
          page.drawImage(passportImage, {
            x: infoBoxX + 8,
            y: infoBoxTopY - infoBoxH + 8,
            width: passportWidth,
            height: passportHeight,
          });
        } else {
          console.log('Passport image is null after embedding attempt');
        }
      } catch (err) {
        console.error('Failed to embed passport photo:', err);
        console.error('Passport URL was:', studentRegistration.passport);
      }
    } else {
      console.log('No passport available. hasPassport:', hasPassport, 'passport value:', studentRegistration?.passport);
    }

    // Candidate Name and Sex (same line)
    const candidateName = [result.fName, result.mName, result.lName]
      .filter(Boolean)
      .join(' ')
      .toUpperCase();
    
    const textStartX = hasPassport && passportImage ? infoBoxX + passportWidth + 18 : infoBoxX + 8;
    let infoY = infoBoxTopY - infoPad - 12;
    page.drawText(`Candidate Name: `, { x: textStartX, y: infoY, size: 9, font });
    page.drawText(candidateName || 'N/A', { x: textStartX + 95, y: infoY, size: 9, font: bold });
    
    const sexLabelX = infoBoxX + infoBoxW - 80;
    page.drawText(`Sex: `, { x: sexLabelX, y: infoY, size: 9, font });
    page.drawText(result.sexCd || 'N/A', { x: sexLabelX + 25, y: infoY, size: 9, font: bold });

    infoY -= infoRowH;
    drawDottedHLine(infoY + 10, infoBoxX + 6, infoBoxX + infoBoxW - 6);

    // Date of Birth
    const dobStr = result.dateOfBirth 
      ? new Date(result.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A';
    page.drawText(`Date of Birth: `, { x: textStartX, y: infoY, size: 9, font });
    page.drawText(dobStr, { x: textStartX + 80, y: infoY, size: 9, font: bold });

    infoY -= infoRowH;
    drawDottedHLine(infoY + 10, infoBoxX + 6, infoBoxX + infoBoxW - 6);

    // School
    page.drawText(`School : `, { x: textStartX, y: infoY, size: 9, font });
    page.drawText((result.schoolName || 'N/A').toUpperCase(), { x: textStartX + 45, y: infoY, size: 9, font: bold });

    infoY -= infoRowH;
    drawDottedHLine(infoY + 10, infoBoxX + 6, infoBoxX + infoBoxW - 6);

    // Local Government Area
    page.drawText(`Local Government Area: `, { x: textStartX, y: infoY, size: 9, font });
    page.drawText((result.lgaCd || 'N/A').toUpperCase(), { x: textStartX + 130, y: infoY, size: 9, font: bold });

    infoY -= infoRowH;
    drawDottedHLine(infoY + 10, infoBoxX + 6, infoBoxX + infoBoxW - 6);

    // Examination Number
    page.drawText(`Examination Number: `, { x: textStartX, y: infoY, size: 9, font });
    page.drawText(result.examinationNo || 'N/A', { x: textStartX + 115, y: infoY, size: 9, font: bold });

    currentY = infoBoxTopY - infoBoxH - 18;

    // Subject table
    const tableX = infoBoxX;
    const tableWidth = infoBoxW;
    const colWidth = tableWidth * 0.7;
    const headerH = 20;
    const rowH = 20;

    const religiousSubject = result.rgstype === 'IRS' 
      ? 'ISLAMIC RELIGIOUS STUDIES' 
      : result.rgstype === 'CRS' 
      ? 'CHRISTIAN RELIGIOUS STUDIES'
      : 'RELIGIOUS STUDIES';

    const subjects: [string, string | null][] = [
      ["ENGLISH STUDIES", result.engGrd],
      ["MATHEMATICS", result.aritGrd],
      ["GENERAL PAPER", result.gpGrd],
      [religiousSubject, result.rgsGrd],
    ];

    const tableTopY = currentY;
    const tableH = headerH + rowH * subjects.length;
    page.drawRectangle({
      x: tableX,
      y: tableTopY - tableH,
      width: tableWidth,
      height: tableH,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    page.drawText('Subject(s)', { x: tableX + 10, y: tableTopY - 15, size: 9, font: bold });
    page.drawText('Grade', { x: tableX + colWidth + 10, y: tableTopY - 15, size: 9, font: bold });

    page.drawLine({
      start: { x: tableX + colWidth, y: tableTopY },
      end: { x: tableX + colWidth, y: tableTopY - tableH },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    page.drawLine({
      start: { x: tableX, y: tableTopY - headerH },
      end: { x: tableX + tableWidth, y: tableTopY - headerH },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    currentY = tableTopY - headerH;

    // Subject rows
    subjects.forEach(([subject, grade], index) => {
      const y = currentY - rowH;
      page.drawText(subject, { x: tableX + 10, y: y + 5, size: 9, font });
      page.drawText(grade || 'N/A', { x: tableX + colWidth + 10, y: y + 5, size: 9, font: bold });

      if (index < subjects.length - 1) {
        drawDottedHLine(y, tableX + 1, tableX + tableWidth - 1);
      }

      currentY -= rowH;
    });

    currentY -= 20;

    // Remark
    if (result.remark) {
      page.drawText('Remark: ', { x: leftMargin, y: currentY, size: 9, font });
      page.drawText(result.remark, { x: leftMargin + 50, y: currentY, size: 9, font: bold });
      currentY -= 15;

      // Dashed line
      for (let x = margin + 10; x < width - margin - 10; x += 10) {
        page.drawLine({
          start: { x, y: currentY },
          end: { x: x + 5, y: currentY },
          thickness: 0.8,
          color: rgb(0.7, 0.7, 0.7),
        });
      }
    }

    // Footer
    const footerY = margin + 35;
    
    // Dashed line above footer
    for (let x = margin + 10; x < width - margin - 10; x += 10) {
      page.drawLine({
        start: { x, y: footerY + 15 },
        end: { x: x + 5, y: footerY + 15 },
        thickness: 0.8,
        color: rgb(0.6, 0.6, 0.6),
      });
    }
    
    centerText('Ministry of secondary education -', 9, footerY + 2, font);
    centerText('Powered by Ventud Limited', 8, footerY - 10, font);

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    // Return PDF as response
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Result_${result.examinationNo}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

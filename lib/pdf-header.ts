import { PDFPage, PDFFont, rgb } from 'pdf-lib';

export interface PDFHeaderData {
  lgaCode?: string;
  lgaName?: string;
  schoolCode?: string;
  schoolName?: string;
  year?: string;
}

/**
 * Draws the standardized header for all examination PDFs
 * Header format:
 * - MINISTRY OF PRIMRY EDUCATION ASABA DELTA STATE
 * - LGA: X :: LGA_NAME SCHOOL CODE: X : SCHOOL_NAME
 * - YYYY/YYYY+1 Basic Education Certificate Examination
 */
export function drawPDFHeader(
  page: PDFPage,
  boldFont: PDFFont,
  regularFont: PDFFont,
  data: PDFHeaderData
) {
  const { width, height } = page.getSize();
  
  // Helper function to center text
  const centerText = (text: string, size: number, y: number, font: PDFFont) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  };

  // Starting Y position for header
  let currentY = height - 50;

  // Line 1: Ministry header
  centerText('MINISTRY OF PRIMRY EDUCATION ASABA DELTA STATE', 14, currentY, boldFont);
  currentY -= 25;

  // Line 2: LGA and School information
  const lgaCode = data.lgaCode || '1';
  const lgaName = data.lgaName || 'ANIOCHA-NORTH';
  const schoolCode = data.schoolCode || '1';
  const schoolName = data.schoolName || '';
  
  const line2 = `LGA: ${lgaCode} :: ${lgaName} SCHOOL CODE: ${schoolCode} : ${schoolName}`;
  centerText(line2, 10, currentY, boldFont);
  currentY -= 25;

  // Line 3: Examination title
  const currentYear = data.year || new Date().getFullYear().toString();
  const nextYear = (parseInt(currentYear) + 1).toString();
  const examTitle = `${currentYear}/${nextYear} Basic Education Certificate Examination`;
  centerText(examTitle, 11, currentY, boldFont);
  
  // Return the Y position after the header for content to continue
  return currentY - 30;
}

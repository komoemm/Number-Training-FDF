import { TestSession, TypingDetail, TrainingCategory } from '../types';
import { CATEGORY_SLA_CONFIG } from './speedRanking';

/**
 * Generates and downloads a highly-professional, styled PDF Performance Certificate & Report 
 * for trainees who have completed the Japanese Bill Invoicing speed assessment.
 * Dynamically loads the jsPDF engine on-demand so it doesn't inflate the initial application bundle.
 * 
 * @param session The test session results containing speed, accuracy, and details
 * @param level EVALUATION Level computed or retrieved (A, B, C, D)
 * @param rankName Formal evaluation rank name text
 */
export async function generateCertificatePDF(session: TestSession, level: string, rankName: string): Promise<void> {
  const { jsPDF } = await import('jspdf');

  const categoryKey: TrainingCategory = session.category || 'tax_number';
  const categoryConfig = CATEGORY_SLA_CONFIG[categoryKey] || CATEGORY_SLA_CONFIG.tax_number;

  // Initialize standard A4 Portrait document (210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;

  // Color Palette Definitions (Executive Slate / Royal Blue Accent)
  const colors = {
    primary: { r: 54, g: 81, b: 247 },   // Indigo/Royal Blue
    darkSlate: { r: 30, g: 41, b: 59 },   // Slate-800
    grayText: { r: 100, g: 116, b: 139 }, // Slate-500
    lightBg: { r: 248, g: 250, b: 252 },  // Slate-50
    emerald: { r: 16, g: 185, b: 129 },   // Success Emerald
    rose: { r: 239, g: 68, b: 68 },       // Red / Error Rose
    border: { r: 226, g: 232, b: 240 }    // Slate-200
  };

  // --- DRAW PAGE 1: DECORATIVE OFFICIAL CERTIFICATE ---
  
  // 1. External Gold/Indigo Dual Border
  doc.setDrawColor(colors.primary.r, colors.primary.g, colors.primary.b);
  doc.setLineWidth(1.5);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S');

  doc.setDrawColor(212, 175, 55); // Gold Inner Line
  doc.setLineWidth(0.4);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');

  // Decorative corners
  const cornerSize = 4;
  doc.setFillColor(212, 175, 55);
  doc.rect(10, 10, cornerSize, cornerSize, 'F');
  doc.rect(pageWidth - 10 - cornerSize, 10, cornerSize, cornerSize, 'F');
  doc.rect(10, pageHeight - 10 - cornerSize, cornerSize, cornerSize, 'F');
  doc.rect(pageWidth - 10 - cornerSize, pageHeight - 10 - cornerSize, cornerSize, cornerSize, 'F');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(colors.grayText.r, colors.grayText.g, colors.grayText.b);
  
  const categoryLabel = session.category === 'date_number' 
    ? 'DATE NUMBER' 
    : session.category === 'phone_number' 
    ? 'PHONE NUMBER' 
    : 'TAX NUMBER (QIN)';

  const modeText = session.trainingMode === 'hard_180' || session.totalImagesAttempted > 90
    ? `EXTREME ENDURANCE ASSESSMENT [${categoryLabel}] (180 INVOICES)`
    : session.trainingMode === 'normal_90' || session.totalImagesAttempted > 20
    ? `OFFICIAL ENDURANCE ASSESSMENT [${categoryLabel}] (90 INVOICES)`
    : `PRACTICE BENCHMARK DRILL [${categoryLabel}] (20 INVOICES)`;
    
  doc.text(`JAPANESE DATA ENTRY ASSESSMENT | ${modeText}`, pageWidth / 2, 22, { align: 'center' });

  doc.setFontSize(22);
  doc.setTextColor(colors.darkSlate.r, colors.darkSlate.g, colors.darkSlate.b);
  doc.text('CERTIFICATE OF TRANSCRIPTION SPEED', pageWidth / 2, 33, { align: 'center' });

  // Thin separator lines with small gold block
  doc.setDrawColor(colors.border.r, colors.border.g, colors.border.b);
  doc.setLineWidth(0.5);
  doc.line(30, 40, pageWidth - 30, 40);
  doc.setFillColor(212, 175, 55);
  doc.rect(pageWidth / 2 - 3, 39, 6, 2, 'F');

  // Certificate Statement
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(colors.grayText.r, colors.grayText.g, colors.grayText.b);
  doc.text('This document certifies that trainee operator', pageWidth / 2, 51, { align: 'center' });

  // Trainee Operator Name (Big, bold)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
  const formalName = session.userId.charAt(0).toUpperCase() + session.userId.slice(1);
  doc.text(formalName, pageWidth / 2, 63, { align: 'center' });

  // Core explanation
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(colors.grayText.r, colors.grayText.g, colors.grayText.b);
  doc.text(
    'has successfully completed the Japanese Bill Invoice Entry Speed Assessment on this workstation,\nrecording high-accuracy catalog data inputs and registering the following verified SLA results:',
    pageWidth / 2,
    73,
    { align: 'center', lineHeightFactor: 1.4 }
  );

  // --- STATS GRID BOXES (MTRCS) ---
  const gridY = 90;
  const gridW = 58;
  const gridH = 34;

  // Box 1: Average Latency speed
  doc.setFillColor(colors.lightBg.r, colors.lightBg.g, colors.lightBg.b);
  doc.setDrawColor(colors.border.r, colors.border.g, colors.border.b);
  doc.rect(14, gridY, gridW, gridH, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(colors.grayText.r, colors.grayText.g, colors.grayText.b);
  doc.text('AVERAGE DOCUMENT PACE', 14 + gridW/2, gridY + 8, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(colors.darkSlate.r, colors.darkSlate.g, colors.darkSlate.b);
  const avgSecStr = `${(session.averageTimeMs / 1000).toFixed(2)}s`;
  doc.text(avgSecStr, 14 + gridW/2, gridY + 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(colors.grayText.r, colors.grayText.g, colors.grayText.b);
  doc.text(`SLA Target: ${categoryConfig.levels.A.rangeShort} (Level A)`, 14 + gridW/2, gridY + 28, { align: 'center' });

  // Box 2: Entry Accuracy
  doc.setFillColor(colors.lightBg.r, colors.lightBg.g, colors.lightBg.b);
  doc.rect(14 + gridW + 5, gridY, gridW, gridH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(colors.grayText.r, colors.grayText.g, colors.grayText.b);
  doc.text('TYPING ACCURACY RATE', 14 + gridW + 5 + gridW/2, gridY + 8, { align: 'center' });

  const accuracyPercent = session.totalImagesAttempted > 0 
    ? Math.round((session.correctEntries / session.totalImagesAttempted) * 100) 
    : 100;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(accuracyPercent >= 95 ? colors.emerald.r : colors.rose.r, accuracyPercent >= 95 ? colors.emerald.g : colors.rose.g, accuracyPercent >= 95 ? colors.emerald.b : colors.rose.b);
  doc.text(`${accuracyPercent}%`, 14 + gridW + 5 + gridW/2, gridY + 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(colors.grayText.r, colors.grayText.g, colors.grayText.b);
  doc.text(`Correct: ${session.correctEntries}/${session.totalImagesAttempted} items`, 14 + gridW + 5 + gridW/2, gridY + 28, { align: 'center' });

  // Box 3: Achieved Level
  doc.setFillColor(colors.lightBg.r, colors.lightBg.g, colors.lightBg.b);
  doc.rect(14 + (gridW * 2) + 10, gridY, gridW, gridH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(colors.grayText.r, colors.grayText.g, colors.grayText.b);
  doc.text('EVALUATION RANKING', 14 + (gridW * 2) + 10 + gridW/2, gridY + 8, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  // Color code based on level
  let levelColor = colors.primary;
  if (level === 'A') levelColor = colors.emerald;
  else if (level === 'B') levelColor = colors.primary;
  else if (level === 'C') levelColor = { r: 217, g: 119, b: 6 }; // Amber
  else levelColor = colors.rose;

  doc.setTextColor(levelColor.r, levelColor.g, levelColor.b);
  doc.text(`LEVEL ${level}`, 14 + (gridW * 2) + 10 + gridW/2, gridY + 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(colors.grayText.r, colors.grayText.g, colors.grayText.b);
  doc.text(level === 'D' ? 'Needs More Practice' : 'Passed Performance SLA', 14 + (gridW * 2) + 10 + gridW/2, gridY + 28, { align: 'center' });

  // Thin separator line
  doc.line(30, 134, pageWidth - 30, 134);

  // Status Compliance Paragraph (Level C or better + >= 95% accuracy)
  const qualifiedPaceSec = categoryConfig.levels.C.maxMs / 1000;
  const compliesWithSLA = (session.averageTimeMs <= categoryConfig.levels.C.maxMs) && (accuracyPercent >= 95);
  const complianceText = compliesWithSLA 
    ? `CONFORMS TO ${categoryConfig.categoryLabel.toUpperCase()} SERVICE LEVEL AGREEMENTS (SLA)\nVerified: Met required transcription pace (≤ ${qualifiedPaceSec.toFixed(2)}s) and precision rate (≥ 95%).`
    : `PERFORMANCE UNDER ASSESSMENT REVIEW (CURRENTLY NON-COMPLIANT)\nOperator exceeds the category SLA pace ceiling (${qualifiedPaceSec.toFixed(2)}s) or falls below the 95% accuracy parameter.`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(compliesWithSLA ? colors.emerald.r : colors.rose.r, compliesWithSLA ? colors.emerald.g : colors.rose.g, compliesWithSLA ? colors.emerald.b : colors.rose.b);
  doc.text(complianceText, pageWidth / 2, 142, { align: 'center', lineHeightFactor: 1.3 });

  // --- ITEMIZED PERFORMANCE TABLE INSET (TOP 8 CHRONOLOGICAL ATTEMPTS OR PREVIEW) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(colors.darkSlate.r, colors.darkSlate.g, colors.darkSlate.b);
  doc.text('WORKFLOW INTEGRITY LOG (FIRST 10 ASSESSMENT SAMPLES)', 16, 158);

  // Table Headers
  const tableY = 164;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, tableY, pageWidth - 28, 7, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(colors.darkSlate.r, colors.darkSlate.g, colors.darkSlate.b);
  doc.text('No.', 18, tableY + 5);
  doc.text('Document ID', 28, tableY + 5);
  doc.text('Target Corporate Tax No.', 58, tableY + 5);
  doc.text('Transcribed User Entry', 105, tableY + 5);
  doc.text('Form Speed', 150, tableY + 5);
  doc.text('Response', 182, tableY + 5);

  // Draw list rows (clamped to max 10 to fit cleanly on page 1)
  const itemsToShow = session.details.slice(0, 10);
  let rowY = tableY + 7;
  doc.setLineWidth(0.1);
  doc.setDrawColor(203, 213, 225);

  itemsToShow.forEach((detail, idx) => {
    // Alternating rows bg
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, rowY, pageWidth - 28, 6.5, 'F');
    }
    
    doc.line(14, rowY + 6.5, pageWidth - 14, rowY + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colors.darkSlate.r, colors.darkSlate.g, colors.darkSlate.b);
    
    doc.text(String(idx + 1).padStart(2, '0'), 18, rowY + 4.5);
    doc.text(detail.imageId.toUpperCase(), 28, rowY + 4.5);
    doc.text(detail.expectedNumber, 58, rowY + 4.5);
    
    // Check if empty
    const typedText = detail.typedNumber || '[SKIPPED]';
    doc.text(typedText, 105, rowY + 4.5);
    
    // Speed
    const speedSec = `${(detail.timeSpentMs / 1000).toFixed(2)}s`;
    doc.text(speedSec, 150, rowY + 4.5);

    // Correctness
    if (detail.isCorrect) {
      doc.setTextColor(colors.emerald.r, colors.emerald.g, colors.emerald.b);
      doc.setFont('helvetica', 'bold');
      doc.text('CORRECT', 182, rowY + 4.5);
    } else {
      doc.setTextColor(colors.rose.r, colors.rose.g, colors.rose.b);
      doc.setFont('helvetica', 'bold');
      doc.text('MISMATCH', 182, rowY + 4.5);
    }

    rowY += 6.5;
  });

  // Stamp / Dates
  const stampY = 244;
  doc.setDrawColor(colors.border.r, colors.border.g, colors.border.b);
  doc.setLineWidth(0.5);
  doc.line(20, stampY, 70, stampY);
  doc.line(pageWidth - 70, stampY, pageWidth - 20, stampY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(colors.grayText.r, colors.grayText.g, colors.grayText.b);
  doc.text('ASSESSMENT DATE/TIME', 45, stampY + 4, { align: 'center' });
  doc.text('TRAINING WORKSPACE INSTRUCTOR', pageWidth - 45, stampY + 4, { align: 'center' });

  // Add date string
  let parsedDate = 'Unknown Date';
  if (session.timestamp) {
    if (typeof session.timestamp === 'string') {
      parsedDate = new Date(session.timestamp).toLocaleString();
    } else if (session.timestamp instanceof Date) {
      parsedDate = session.timestamp.toLocaleString();
    } else if (typeof (session.timestamp as any).toDate === 'function') {
      parsedDate = (session.timestamp as any).toDate().toLocaleString();
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(colors.darkSlate.r, colors.darkSlate.g, colors.darkSlate.b);
  doc.text(parsedDate, 45, stampY - 2, { align: 'center' });
  doc.text('AUTOMATED CLOUD DEPLOY ENGINE', pageWidth - 45, stampY - 2, { align: 'center' });

  // Official Seal Graphics (Royal Gold stamp)
  doc.setDrawColor(212, 175, 55);
  doc.setFillColor(254, 252, 232);
  doc.setLineWidth(0.8);
  doc.rect(pageWidth / 2 - 20, stampY - 12, 40, 16, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(212, 175, 55);
  doc.text('VERIFIED TRAINING', pageWidth / 2, stampY - 6, { align: 'center' });
  doc.text('SLA SKILL PASS', pageWidth / 2, stampY - 1, { align: 'center' });


  // --- DRAW PAGE 2: COMPREHENSIVE PERFORMANCE DETAIL LOG (If has details) ---
  if (session.details.length > 0) {
    doc.addPage();

    // Secondary dual border (cleaner layout)
    doc.setDrawColor(colors.primary.r, colors.primary.g, colors.primary.b);
    doc.setLineWidth(1.0);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');

    // Header title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(colors.grayText.r, colors.grayText.g, colors.grayText.b);
    doc.text('ITEMIZED TRANSCRIPTION PERFORMANCE AUDIT LOG', 16, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Trainee Username: ${session.userId}  |  Total Assessment Size: ${session.details.length} Invoices`, 16, 25);

    // Separator line
    doc.setDrawColor(colors.border.r, colors.border.g, colors.border.b);
    doc.line(14, 28, pageWidth - 14, 28);

    // Complete Table Headers page 2
    let tblY = 34;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, tblY, pageWidth - 28, 7, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(colors.darkSlate.r, colors.darkSlate.g, colors.darkSlate.b);
    doc.text('No.', 18, tblY + 5);
    doc.text('Invoice Document Name', 28, tblY + 5);
    doc.text('Target (Tax ID Code)', 72, tblY + 5);
    doc.text('Operator Typed Input', 115, tblY + 5);
    doc.text('Response Speed', 155, tblY + 5);
    doc.text('SLA Status', 182, tblY + 5);

    let rowY2 = tblY + 7;
    doc.setFont('helvetica', 'normal');
    doc.setLineWidth(0.08);

    session.details.forEach((detail, idx) => {
      // Manage page overflows on page 2 if needed (unlikely with 20 items, fits easily in 20 * 6.5 = 130mm, max capacity is ~35 rows)
      if (rowY2 > pageHeight - 25) {
        doc.addPage();
        // border on overflow page
        doc.setDrawColor(colors.primary.r, colors.primary.g, colors.primary.b);
        doc.setLineWidth(1.0);
        doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');
        
        tblY = 20;
        doc.setFillColor(241, 245, 249);
        doc.rect(14, tblY, pageWidth - 28, 7, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(colors.darkSlate.r, colors.darkSlate.g, colors.darkSlate.b);
        doc.text('No.', 18, tblY + 5);
        doc.text('Invoice Document Name', 28, tblY + 5);
        doc.text('Target (Tax ID Code)', 72, tblY + 5);
        doc.text('Operator Typed Input', 115, tblY + 5);
        doc.text('Response Speed', 155, tblY + 5);
        doc.text('SLA Status', 182, tblY + 5);

        rowY2 = tblY + 7;
        doc.setFont('helvetica', 'normal');
      }

      // Alternating row background
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, rowY2, pageWidth - 28, 6.5, 'F');
      }
      
      doc.setDrawColor(226, 232, 240);
      doc.line(14, rowY2 + 6.5, pageWidth - 14, rowY2 + 6.5);

      doc.setFontSize(8.5);
      doc.setTextColor(colors.darkSlate.r, colors.darkSlate.g, colors.darkSlate.b);

      doc.text(String(idx + 1).padStart(2, '0'), 18, rowY2 + 4.5);
      doc.text(detail.imageId.toUpperCase(), 28, rowY2 + 4.5);
      doc.text(detail.expectedNumber, 72, rowY2 + 4.5);
      
      const typedText = detail.typedNumber || '[SKIPPED/BLANK]';
      if (!detail.isCorrect) {
        doc.setTextColor(colors.rose.r, colors.rose.g, colors.rose.b);
      }
      doc.text(typedText, 115, rowY2 + 4.5);
      doc.setTextColor(colors.darkSlate.r, colors.darkSlate.g, colors.darkSlate.b);

      const speedSecStr = `${(detail.timeSpentMs / 1000).toFixed(2)}s`;
      doc.text(speedSecStr, 155, rowY2 + 4.5);

      if (detail.isCorrect) {
        doc.setTextColor(colors.emerald.r, colors.emerald.g, colors.emerald.b);
        doc.setFont('helvetica', 'bold');
        doc.text('CORRECT ✓', 182, rowY2 + 4.5);
      } else {
        doc.setTextColor(colors.rose.r, colors.rose.g, colors.rose.b);
        doc.setFont('helvetica', 'bold');
        doc.text('MISMATCH ✗', 182, rowY2 + 4.5);
      }

      doc.setFont('helvetica', 'normal');
      rowY2 += 6.5;
    });

    // Core summary stamp at end of document
    rowY2 += 10;
    doc.setFillColor(colors.lightBg.r, colors.lightBg.g, colors.lightBg.b);
    doc.setDrawColor(colors.border.r, colors.border.g, colors.border.b);
    doc.rect(14, rowY2, pageWidth - 28, 22, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(colors.darkSlate.r, colors.darkSlate.g, colors.darkSlate.b);
    doc.text('AUDIT CLOUD SIGNATURE & INTEGRITY SEAL', 18, rowY2 + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colors.grayText.r, colors.grayText.g, colors.grayText.b);
    doc.text(`This report is auto-compiled and cryptographically sealed on behalf of trainee (${session.userId}).`, 18, rowY2 + 12);
    doc.text(`Hardware Assessment ID: hash_ts_${session.id || 'local_' + Date.now()} | Database Root Collection: /test_sessions`, 18, rowY2 + 17);
  }

  // Save/Download triggering
  const formattedFilename = `Invoicing_Performance_Certificate_${session.userId}_${Date.now()}.pdf`;
  doc.save(formattedFilename);
}

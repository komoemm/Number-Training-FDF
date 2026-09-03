/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeneratedInvoiceData, DifficultyLevel, InvoiceStyle, TrainingCategory, CustomInvoice } from '../types';

// Diverse lists to generate rich randomized invoice details
const COMPANIES = [
  'マツモト産業株式会社',
  'サクラ・システム・ソリューションズ',
  '中野エレクトロニクス合資会社',
  '帝国ロジスティクス合同会社',
  '佐藤商事株式会社',
  'ヤマダ流通ホールディングス',
  '吉野フーズ株式会社',
  'デジタル・パイオニア有限会社',
  '高橋精密工業株式会社',
  '東京アドバタイジング・エージェンシー',
  '近藤建設工業株式会社',
  'ニッポン交易株式会社',
  '三浦オフィスサプライ株式会社',
  '平成フードサービス株式会社',
  '極東貿易ソリューションズ',
  'イオンリテール株式会社',
  'セブン＆アイ・ホールディングス',
  'ファミリーマート東日本支社',
  'ローソンステーション株式会社'
];

const RECEIPTS = [
  '領 収 書',
  '領収証 (RECEIPT)',
  '適格請求書 (INVOICE)',
  '納品書兼請求書',
  'お買上明細書',
  'TAX INVOICE'
];

/**
 * Helper to generate random 13-digit string with 'T' prefix.
 */
export function generateRandomInvoiceNumber(): string {
  const digits = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('');
  return `T${digits}`;
}

/**
 * Helper to generate random 8-digit date string (YYYYMMDD).
 */
export function generateRandomDateNumber(): string {
  const year = 2024 + Math.floor(Math.random() * 3); // 2024-2026
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Helper to generate random Japanese phone number (10 or 11 digits).
 */
export function generateRandomPhoneNumber(): string {
  const prefixes = ['03', '06', '045', '052', '092', '011', '090', '080', '070'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const remainingDigitsCount = (prefix.startsWith('090') || prefix.startsWith('080') || prefix.startsWith('070')) ? 8 : (10 - prefix.length);
  const remaining = Array.from({ length: remainingDigitsCount }, () => Math.floor(Math.random() * 10)).join('');
  return `${prefix}${remaining}`;
}

/**
 * Generates a single sample custom invoice for the specified category.
 */
export function generateSampleCustomInvoice(category: TrainingCategory = 'tax_number', index: number = 0): CustomInvoice {
  const company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
  const id = `sample_${category}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const styles: InvoiceStyle[] = ['modern', 'classic', 'thermal_distorted'];
  const style = styles[Math.floor(Math.random() * styles.length)];
  const year = 2026;
  const month = String(1 + (index % 12)).padStart(2, '0');
  const day = String(1 + (index * 3) % 28).padStart(2, '0');
  const invoiceDate = `${year}年${month}月${day}日`;
  const totalAmount = `${(1200 + Math.floor(Math.random() * 8500)).toLocaleString()}円`;

  let expectedNumber = '';
  if (category === 'tax_number') {
    expectedNumber = generateRandomInvoiceNumber();
  } else if (category === 'date_number') {
    expectedNumber = `${year}${month}${day}`;
  } else {
    expectedNumber = generateRandomPhoneNumber();
  }

  const generatedData: GeneratedInvoiceData = {
    id,
    expectedNumber,
    companyName: company,
    invoiceDate,
    totalAmount,
    difficulty: 'easy',
    style,
    category
  };

  const customImageUrl = renderReceiptToDataUrl(generatedData);

  return {
    id,
    expectedNumber,
    companyName: company,
    invoiceDate,
    totalAmount,
    difficulty: 'easy',
    style,
    category,
    customImageUrl
  };
}

/**
 * Generates a high-quality receipt image using HTML5 Canvas.
 * Returns a Data URL.
 */
export function renderReceiptToDataUrl(data: GeneratedInvoiceData): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const category = data.category || 'tax_number';

  // 1. Render thermal paper background based on style
  let paperColor = '#fdfdfb'; // clean ivory
  if (data.style === 'thermal_distorted') {
    paperColor = '#ecebe4'; // slightly weathered gray/thermal
  } else if (data.style === 'handwritten') {
    paperColor = '#fffdf3'; // warm yellowish vintage invoice
  } else if (data.style === 'classic') {
    paperColor = '#faf8f2';
  }

  ctx.fillStyle = paperColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle paper texture / scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
  for (let y = 0; y < canvas.height; y += 2) {
    ctx.fillRect(0, y, canvas.width, 1);
  }

  // Draw torn receipt edges on left & right margins (decorative)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  for (let x = 0; x < canvas.width; x += 10) {
    ctx.beginPath();
    ctx.arc(x + 5, 2, 3, 0, Math.PI, true);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 5, canvas.height - 2, 3, 0, Math.PI, false);
    ctx.fill();
  }

  // Reset fill style
  ctx.fillStyle = '#1e293b';

  // 2. Adjust font styling based on the receipt's visual style
  let fontName = 'system-ui, sans-serif';
  let blurAmount = 0;
  let textSkew = 0;

  if (data.style === 'handwritten') {
    fontName = '"Georgia", "Times New Roman", cursive';
    textSkew = 0.02;
  } else if (data.style === 'classic') {
    fontName = '"Times New Roman", "MS Mincho", serif';
  } else if (data.style === 'thermal_distorted') {
    fontName = '"Courier New", Courier, monospace';
    blurAmount = data.difficulty === 'hard' ? 0.75 : 0.3;
  }

  if (blurAmount > 0) {
    ctx.filter = `blur(${blurAmount}px)`;
  }

  // 3. Render Invoice header elements
  const titleText = RECEIPTS[Math.abs(data.id.length) % RECEIPTS.length];
  ctx.font = `bold 16px ${fontName}`;
  ctx.textAlign = 'center';
  ctx.fillText(titleText, canvas.width / 2, 30);

  // Divider line
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 42);
  ctx.lineTo(canvas.width - 30, 42);
  ctx.stroke();

  // Company info
  ctx.textAlign = 'left';
  ctx.font = `11px ${fontName}`;
  ctx.fillStyle = '#475569';
  ctx.fillText(data.companyName, 40, 65);
  ctx.fillText(`発行日: ${data.invoiceDate}`, 40, 82);
  
  // Right aligns
  ctx.textAlign = 'right';
  ctx.fillText(`伝票 No: ${data.id.slice(0, 10).toUpperCase()}`, canvas.width - 40, 65);
  if (data.note) {
    ctx.fillText(data.note, canvas.width - 40, 82);
  }

  // Charge Amount Highlight Box
  ctx.fillStyle = 'rgba(0, 0, 0, 0.025)';
  ctx.fillRect(35, 95, canvas.width - 70, 32);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.strokeRect(35, 95, canvas.width - 70, 32);

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'left';
  ctx.font = `11px ${fontName}`;
  ctx.fillText('合 計 金 額', 45, 115);

  ctx.textAlign = 'right';
  ctx.font = `bold 14px ${fontName}`;
  ctx.fillText(data.totalAmount, canvas.width - 45, 115);

  // 4. Hanko Stamp for immersion
  const stampX = canvas.width - 75;
  const stampY = 120;
  ctx.save();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
  ctx.lineWidth = 2;
  ctx.translate(stampX, stampY);
  ctx.rotate(-0.04);
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
  ctx.font = '9px "MS Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('領収済', 0, -4);
  ctx.fillText('印', 0, 6);
  ctx.restore();

  // 5. RENDER THE KEY TARGET TRANSCRIPTION HIGHLIGHT BOX
  ctx.fillStyle = '#0f172a';
  ctx.save();

  // Underline target focus box
  ctx.fillStyle = 'rgba(241, 245, 249, 0.75)';
  ctx.fillRect(35, 145, canvas.width - 70, 48);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.strokeRect(35, 145, canvas.width - 70, 48);

  ctx.translate(canvas.width / 2, 170);
  if (textSkew !== 0) ctx.transform(1, 0, textSkew, 1, 0, 0);

  // Label above target code according to Category
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = `10px ${fontName}`;

  let labelText = '登録番号 (Register Number)';
  let printedNo = data.expectedNumber;

  if (category === 'tax_number') {
    const labels = [
      '登録番号 (Qualified Invoice No.)',
      '適格請求書発行事業者登録番号 [Ｔ]',
      'インボイス登録番号',
      'T-REGISTRATION NO.'
    ];
    labelText = labels[Math.abs(data.id.length) % labels.length];
    
    // Grouping variation: T-1234-5678-90123 or T 1234 5678 90123 or raw
    const v = Math.abs(data.id.length) % 3;
    if (v === 1 && data.expectedNumber.startsWith('T') && data.expectedNumber.length === 14) {
      printedNo = `T ${data.expectedNumber.slice(1, 5)} ${data.expectedNumber.slice(5, 9)} ${data.expectedNumber.slice(9)}`;
    } else if (v === 2 && data.expectedNumber.startsWith('T') && data.expectedNumber.length === 14) {
      printedNo = `T-${data.expectedNumber.slice(1, 5)}-${data.expectedNumber.slice(5, 9)}-${data.expectedNumber.slice(9)}`;
    }
  } else if (category === 'date_number') {
    const labels = [
      '取引年月日 (Transaction Date)',
      '発行日付 / 売上日',
      '領収日時 (DATE)',
      '会計日付'
    ];
    labelText = labels[Math.abs(data.id.length) % labels.length];

    // Format date in printed form e.g. 2026/05/22 or 2026年05月22日 or 2026-05-22
    if (data.expectedNumber.length === 8 && /^\d{8}$/.test(data.expectedNumber)) {
      const y = data.expectedNumber.slice(0, 4);
      const m = data.expectedNumber.slice(4, 6);
      const d = data.expectedNumber.slice(6, 8);
      const v = Math.abs(data.id.length) % 3;
      if (v === 0) printedNo = `${y}/${m}/${d}`;
      else if (v === 1) printedNo = `${y}年${m}月${d}日`;
      else printedNo = `${y}-${m}-${d}`;
    }
  } else if (category === 'phone_number') {
    const labels = [
      'お問合せ電話番号 (TEL)',
      'TEL / 連絡先',
      '店舗代表電話番号',
      'CUSTOMER SERVICE TEL'
    ];
    labelText = labels[Math.abs(data.id.length) % labels.length];

    // Format phone number with hyphens e.g. 03-1234-5678 or 090-1234-5678
    const rawDigits = data.expectedNumber.replace(/\D/g, '');
    if (rawDigits.startsWith('090') || rawDigits.startsWith('080') || rawDigits.startsWith('070')) {
      if (rawDigits.length === 11) {
        printedNo = `${rawDigits.slice(0, 3)}-${rawDigits.slice(3, 7)}-${rawDigits.slice(7)}`;
      }
    } else if (rawDigits.startsWith('03') || rawDigits.startsWith('06')) {
      if (rawDigits.length === 10) {
        printedNo = `${rawDigits.slice(0, 2)}-${rawDigits.slice(2, 6)}-${rawDigits.slice(6)}`;
      }
    } else if (rawDigits.length >= 10) {
      printedNo = `${rawDigits.slice(0, 3)}-${rawDigits.slice(3, 6)}-${rawDigits.slice(6)}`;
    }
  }

  ctx.fillText(labelText, 0, -13);

  // Target Number Text
  ctx.fillStyle = '#1e1b4b';
  let targetFontSize = category === 'tax_number' ? '18px' : '20px';
  let codeFont = `bold ${targetFontSize} ${fontName}`;
  if (data.style === 'thermal_distorted') {
    codeFont = `${targetFontSize} "Courier New", monospace`;
  }
  ctx.font = codeFont;
  ctx.fillText(printedNo, 0, 10);

  ctx.restore();

  // Remove filters
  ctx.filter = 'none';

  return canvas.toDataURL('image/png');
}

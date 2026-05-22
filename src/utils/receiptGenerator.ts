/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeneratedInvoiceData, DifficultyLevel, InvoiceStyle } from '../types';

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
  '極東貿易ソリューションズ'
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
 * Helper to generate random 13-digit string or 14-character with 'T' prefix.
 */
export function generateRandomInvoiceNumber(): string {
  const digits = Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('');
  return `T${digits}`;
}

/**
 * Generate a static dataset of 20 randomized invoice items.
 */
export function generateDataset(count: number = 20): GeneratedInvoiceData[] {
  const dataset: GeneratedInvoiceData[] = [];
  
  for (let i = 0; i < count; i++) {
    const rawNum = generateRandomInvoiceNumber();
    const id = `inv_${1001 + i}`;
    const company = COMPANIES[i % COMPANIES.length];
    
    // Distribute difficulties and styles
    let difficulty: DifficultyLevel = 'easy';
    let style: InvoiceStyle = 'modern';
    
    if (i >= 5 && i < 11) {
      difficulty = 'medium';
      style = i % 2 === 0 ? 'classic' : 'thermal_distorted';
    } else if (i >= 11) {
      difficulty = 'hard';
      style = i % 2 === 0 ? 'handwritten' : 'thermal_distorted';
    }

    const day = String(1 + (i * 3) % 28).padStart(2, '0');
    const month = String(1 + (i % 12)).padStart(2, '0');
    const totalAmount = `${(1200 + (i * 1450)).toLocaleString()}円`;

    dataset.push({
      id,
      expectedNumber: rawNum,
      companyName: company,
      invoiceDate: `2026年${month}月${day}日`,
      totalAmount,
      difficulty,
      style,
      note: i % 3 === 0 ? '※ 軽減税率対象含む' : undefined
    });
  }
  return dataset;
}

/**
 * Generates a high-quality receipt image using HTML5 Canvas.
 * Returns a Data URL.
 */
export function renderReceiptToDataUrl(data: GeneratedInvoiceData): string {
  // Create an offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

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
  ctx.fillStyle = '#1e293b'; // off-black/slate text color

  // 2. Adjust font styling based on the receipt's visual style
  let fontName = 'system-ui, sans-serif';
  let blurAmount = 0;
  let textSkew = 0;

  if (data.style === 'handwritten') {
    fontName = '"Georgia", "Times New Roman", cursive';
    textSkew = 0.02; // slight human handwritten skew
  } else if (data.style === 'classic') {
    fontName = '"Times New Roman", "MS Mincho", serif';
  } else if (data.style === 'thermal_distorted') {
    fontName = '"Courier New", Courier, monospace';
    blurAmount = data.difficulty === 'hard' ? 0.75 : 0.4; // Simulate blurred thermal printing
  }

  if (blurAmount > 0) {
    ctx.filter = `blur(${blurAmount}px)`;
  }

  // 3. Render Invoice elements
  // Title
  const titleText = RECEIPTS[parseInt(data.id.replace('inv_', '')) % RECEIPTS.length];
  ctx.font = `bold 16px ${fontName}`;
  ctx.textAlign = 'center';
  ctx.fillText(titleText, canvas.width / 2, 30);

  // Divider lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 42);
  ctx.lineTo(canvas.width - 30, 42);
  ctx.stroke();

  // Left aligns: Company info, Date, Amount
  ctx.textAlign = 'left';
  ctx.font = `11px ${fontName}`;
  ctx.fillStyle = '#475569';
  ctx.fillText(data.companyName, 40, 65);
  ctx.fillText(`発行日: ${data.invoiceDate}`, 40, 82);
  
  // Right aligns
  ctx.textAlign = 'right';
  ctx.fillText(`売上伝票 No: ${data.id.toUpperCase()}`, canvas.width - 40, 65);
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

  // 4. Render Japanese Hanko Stamp (Red company seal!) for immersion
  // Draw it in a randomized overlapping position to look like physical stamp
  const stampX = canvas.width - 75 + (Math.random() * 15 - 7);
  const stampY = 120 + (Math.random() * 10 - 5);
  ctx.save();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)'; // Stamp red
  ctx.lineWidth = 2;
  ctx.translate(stampX, stampY);
  ctx.rotate(-0.05 + Math.random() * 0.1); // slight angle
  // Outer circle
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.stroke();
  // Double-border style occasionally
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.stroke();
  // Stamp text inside
  ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
  ctx.font = '9px "MS Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('領収済', 0, -4);
  ctx.fillText('テック', 0, 6);
  ctx.restore();

  // 5. RENDER THE CORE TAX / INVOICE REGISTRATION NUMBER
  ctx.fillStyle = '#0f172a';
  ctx.save();

  // Underline box for key target code
  ctx.fillStyle = 'rgba(241, 245, 249, 0.7)';
  ctx.fillRect(35, 145, canvas.width - 70, 48);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
  ctx.strokeRect(35, 145, canvas.width - 70, 48);

  ctx.translate(canvas.width / 2, 170);
  if (textSkew !== 0) ctx.transform(1, 0, textSkew, 1, 0, 0);

  // Subtitle/Label above registration code
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = `10px ${fontName}`;
  
  // Random labels to vary layout difficulty matching physical invoices
  const labels = [
    '登録番号',
    '登録番号 [Ｔ]',
    '適格請求書発行事業者登録番号',
    'インボイス登録番号',
    'T-NO.'
  ];
  const labelText = labels[parseInt(data.id.replace('inv_', '')) % labels.length];
  ctx.fillText(labelText, 0, -13);

  // Registration Number text
  ctx.fillStyle = '#1e1b4b'; // deep indigo black

  // Vary representation (grouped hyphens like T-1234-5678-90123 or spaces or plain)
  let printedNo = data.expectedNumber;
  const variant = parseInt(data.id.replace('inv_', '')) % 3;
  if (variant === 1) {
    // Spacer: T 1234 5678 90123
    printedNo = `T ${data.expectedNumber.slice(1, 5)} ${data.expectedNumber.slice(5, 9)} ${data.expectedNumber.slice(9)}`;
  } else if (variant === 2) {
    // Hyphens: T-1234-5678-90123
    printedNo = `T-${data.expectedNumber.slice(1, 5)}-${data.expectedNumber.slice(5, 9)}-${data.expectedNumber.slice(9)}`;
  }

  // Font properties for registration code
  let targetFontSize = '17px';
  if (data.difficulty === 'easy') {
    targetFontSize = '19px';
  } else if (data.difficulty === 'hard') {
    targetFontSize = '16px'; // smaller is harder to read
  }

  let codeFont = `bold ${targetFontSize} ${fontName}`;
  if (data.style === 'thermal_distorted') {
    codeFont = `${targetFontSize} "Courier New", monospace`;
  }
  ctx.font = codeFont;
  ctx.fillText(printedNo, 0, 10);

  ctx.restore();

  // 6. Draw physical paper crinkles & scanner lines for hard difficulty to test visual agility
  if (data.difficulty === 'hard' || data.style === 'thermal_distorted') {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, Math.random() * canvas.height);
    ctx.bezierCurveTo(
      canvas.width / 3, Math.random() * canvas.height,
      (canvas.width / 3) * 2, Math.random() * canvas.height,
      canvas.width, Math.random() * canvas.height
    );
    ctx.stroke();

    // Speckles of light dust
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
    }
  }

  // Remove filters
  ctx.filter = 'none';

  return canvas.toDataURL('image/png');
}

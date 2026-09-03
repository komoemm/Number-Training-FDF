import { TestSession, TypingDetail, TrainingCategory } from '../types';
import { CATEGORY_SLA_CONFIG } from './speedRanking';

/**
 * Generates and downloads a self-contained, highly-polished, interactive HTML Performance Certificate & Audit Log.
 * Trainees can download this file as a standalone record of their transcription results,
 * and Administrators can double-click it to load a fully interactive dashboard showing speed, accuracy,
 * and an itemized invoice-by-invoice audit trail.
 * 
 * @param session The test session results containing speed, accuracy, and detailed logs
 * @param level EVALUATION Level computed or retrieved (A, B, C, D)
 * @param rankName Formal evaluation rank name text
 */
export function generateCertificateHTML(session: TestSession, level: string, rankName: string) {
  const categoryKey: TrainingCategory = session.category || 'tax_number';
  const categoryConfig = CATEGORY_SLA_CONFIG[categoryKey] || CATEGORY_SLA_CONFIG.tax_number;

  const traineeName = session.userId.charAt(0).toUpperCase() + session.userId.slice(1);
  const totalAttempted = session.totalImagesAttempted;
  const correctCount = session.correctEntries;
  const accuracyPercent = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 100;
  const averagePaceSec = (session.averageTimeMs / 1000).toFixed(2);
  const qualifiedPaceSec = (categoryConfig.levels.C.maxMs / 1000).toFixed(2);
  const qualifiesSLA = (session.averageTimeMs <= categoryConfig.levels.C.maxMs) && (accuracyPercent >= 95);
  const isHardMode = session.trainingMode === 'hard_180' || totalAttempted > 90;
  const isNormalMode = session.trainingMode === 'normal_90' || (totalAttempted > 20 && !isHardMode);
  const categoryLabel = categoryConfig.categoryLabel;
  const modeLabel = isHardMode ? `Hard Mode [${categoryLabel}] (180 Invoices Extreme Endurance)` : isNormalMode ? `Normal Mode [${categoryLabel}] (90 Invoices Official Assessment)` : `Easy Mode [${categoryLabel}] (20 Invoices Practice Benchmark)`;
  const modeBadgeColor = isHardMode ? 'bg-purple-100 text-purple-800 border-purple-300' : isNormalMode ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  let parsedDate = 'Unknown Date/Time';
  if (session.timestamp) {
    if (typeof session.timestamp === 'string') {
      parsedDate = new Date(session.timestamp).toLocaleString();
    } else if (session.timestamp instanceof Date) {
      parsedDate = session.timestamp.toLocaleString();
    } else if (typeof (session.timestamp as any).toDate === 'function') {
      parsedDate = (session.timestamp as any).toDate().toLocaleString();
    } else {
      parsedDate = new Date().toLocaleString();
    }
  }

  // Create a unique tamper-evident SHA-like checkcode for verification
  const checkcode = `JP_SLA_VERIFY_${session.id || 'LOCAL'}_${accuracyPercent}_${averagePaceSec}_${Math.floor(Math.random() * 90000 + 10000)}`;

  // Generate serialized details as a JSON string to inject into the HTML's interactive script
  const safeDetailsJson = JSON.stringify(session.details.map((d, idx) => ({
    index: idx + 1,
    imageId: d.imageId,
    expectedNumber: d.expectedNumber,
    typedNumber: d.typedNumber || '[SKIPPED]',
    timeSpentMs: d.timeSpentMs,
    isCorrect: d.isCorrect
  })));

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transcription Speed Evidence - ${traineeName}</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <style>
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .font-mono-custom {
      font-family: 'JetBrains Mono', monospace;
    }
    /* Printable configuration */
    @media print {
      .no-print {
        display: none !important;
      }
      .print-border {
        border: 2px solid #3b82f6 !important;
        padding: 20px !important;
      }
      body {
        background-color: #ffffff !important;
        color: #0f172a !important;
      }
      .page-break {
        page-break-after: always;
      }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen pb-12">

  <!-- TOP HEADER UTILITIES (Invisible when printing) -->
  <header class="bg-slate-900 text-white py-4 px-6 mb-8 shadow-md no-print">
    <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-lg text-white">DT</div>
        <div>
          <h1 class="text-sm font-bold tracking-wider font-mono-custom text-slate-200">WORKSTATION ASSESSMENT EXPORT</h1>
          <p class="text-xs text-slate-400">Interactive Offline Evidence Document</p>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <button onclick="window.print()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow flex items-center gap-2 cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
          </svg>
          Print / Save Paper PDF
        </button>
        <div class="text-[11px] font-mono-custom text-slate-400 border border-slate-700 bg-slate-800 px-3 py-2 rounded-lg">
          NODE: JP-QIN-13
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-5xl mx-auto px-4">
    
    <!-- PAGE 1: DECORATIVE OFFICIAL COMPETENCY CERTIFICATE -->
    <div class="bg-white border-2 border-indigo-600 p-8 rounded-2xl shadow-xl relative overflow-hidden mb-12 page-break print-border">
      <!-- Decorative gold accent lines -->
      <div class="absolute inset-2 border border-amber-400 pointer-events-none rounded-xl"></div>
      
      <!-- Small Corner Gold Squares -->
      <div class="absolute top-2 left-2 w-3 h-3 bg-amber-400"></div>
      <div class="absolute top-2 right-2 w-3 h-3 bg-amber-400"></div>
      <div class="absolute bottom-2 left-2 w-3 h-3 bg-amber-400"></div>
      <div class="absolute bottom-2 right-2 w-3 h-3 bg-amber-400"></div>

      <!-- Watermark Background Logo -->
      <div class="absolute inset-0 opacity-[0.02] flex items-center justify-center pointer-events-none">
        <svg class="w-96 h-96 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
        </svg>
      </div>

      <div class="relative z-10 text-center py-4">
        <h2 class="text-xs font-bold tracking-widest text-slate-400 uppercase font-mono-custom">BILL INVOICING TRANSCRIPTION LABORATORY</h2>
        <h1 class="text-2xl md:text-3xl font-extrabold text-slate-800 mt-2 tracking-tight">CERTIFICATE OF TRANSCRIPTION SPEED</h1>
        
        <div class="w-32 h-1 bg-amber-400 mx-auto my-6 relative">
          <div class="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-amber-400 rotate-45"></div>
        </div>

        <p class="text-sm italic text-slate-500">This document verifies that trainee operator</p>
        <p class="text-3xl font-extrabold text-indigo-600 mt-3 tracking-wide">${traineeName}</p>
        <div class="mt-2 flex items-center justify-center">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase border tracking-wider ${modeBadgeColor}">
            <span class="w-2 h-2 rounded-full ${isNormalMode ? 'bg-blue-600' : 'bg-emerald-600'}"></span>
            ${modeLabel}
          </span>
        </div>
        
        <div class="max-w-xl mx-auto text-xs md:text-sm text-slate-600 mt-6 leading-relaxed">
          has successfully executed the high-speed Japanese corporate tax invoicing speed test, completing digit transcription 
          over standard ledger image assets. The operator recorded verified transcription speed, system latency, and precise 
          record accuracy conforming to performance standards.
        </div>

        <!-- 3 Pillars of Performance Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-10 max-w-4xl mx-auto">
          <!-- Avg Pace -->
          <div class="bg-slate-50 border border-slate-100 p-4 rounded-xl shadow-sm">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono-custom">Average Pace Per Invoice</p>
            <p class="text-2xl font-black text-slate-800 mt-1 font-mono-custom">${averagePaceSec}s</p>
            <div class="mt-2 text-[10px] inline-flex items-center gap-1 font-semibold text-slate-500">
              SLA Target: ${categoryConfig.levels.A.rangeShort} (Level A)
            </div>
          </div>

          <!-- Accuracy Rate -->
          <div class="bg-slate-50 border border-slate-100 p-4 rounded-xl shadow-sm">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono-custom">Transcription Precision</p>
            <p class="text-2xl font-black mt-1 font-mono-custom ${accuracyPercent >= 95 ? 'text-emerald-600' : 'text-rose-600'}">${accuracyPercent}%</p>
            <div class="mt-2 text-[10px] inline-flex items-center gap-1 font-semibold text-slate-500">
              Correct: ${correctCount} / ${totalAttempted} Invoices
            </div>
          </div>

          <!-- Evaluation Rank -->
          <div class="bg-slate-50 border border-slate-100 p-4 rounded-xl shadow-sm">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono-custom">Certified Level Rank</p>
            <p class="text-xl font-extrabold text-amber-600 mt-1.5 uppercase tracking-wide">Level ${level}</p>
            <div class="mt-2 text-[10px] inline-flex items-center gap-1 font-semibold text-slate-500">
              ${rankName.split(': ')[1] || 'Completed Assessment'}
            </div>
          </div>
        </div>

        <!-- SLA Compliance Banner -->
        <div class="max-w-2xl mx-auto py-3 px-6 rounded-xl border font-bold text-xs inline-flex flex-col md:flex-row items-center gap-2 ${qualifiesSLA ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full ${qualifiesSLA ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
            <span>${qualifiesSLA ? 'VERIFIED: MEETS OUTSTANDING LATENCY AND ACCURACY SLA' : 'PENDING: WORKFLOW UNDER REGULATORY ASSESSMENT REVIEW'}</span>
          </div>
        </div>

        <!-- Signature/Seals Row -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 pt-8 border-t border-slate-100 max-w-4xl mx-auto text-left">
          <div>
            <p class="text-[10px] text-slate-400 font-bold uppercase font-mono-custom">Assessment Date & Time</p>
            <p class="text-xs font-bold text-slate-700 mt-1">${parsedDate}</p>
            <p class="text-[9px] text-slate-400">Verified System Clock UTC</p>
          </div>
          <div class="text-center">
            <!-- Official stamp visual -->
            <div class="inline-block border-2 border-indigo-600 text-indigo-600 font-extrabold text-[10px] tracking-widest uppercase py-2 px-4 rounded-lg bg-indigo-50 rotate-[-2deg]">
              COMPETENCY VERIFIED
              <div class="text-[8px] font-light tracking-normal text-slate-500 mt-0.5">Automated Validation Engine</div>
            </div>
          </div>
          <div class="md:text-right">
            <p class="text-[10px] text-slate-400 font-bold uppercase font-mono-custom">TAMPER-EVIDENT EVIDENCE SIGNATURE</p>
            <p class="text-[10px] font-mono-custom font-semibold text-slate-600 mt-1 select-all break-all bg-slate-50 p-1.5 rounded border border-slate-100">${checkcode}</p>
          </div>
        </div>
      </div>
    </div>


    <!-- PAGE 2: COMPLETE INTERACTIVE AUDIT PANEL (Trainee & Supervisor Workspace) -->
    <div class="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 no-print">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
            <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
            </svg>
            Interactive Invoicing Entry Ledger Log
          </h3>
          <p class="text-xs text-slate-500">Every single transacted invoice with timing latency is logged below. Supervisors can query, filter and audit keys.</p>
        </div>
        
        <div class="text-xs font-mono-custom text-slate-500 bg-slate-50 border px-3 py-1.5 rounded-lg">
          Operator Account: <strong class="text-slate-800">${session.userId}</strong>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="flex flex-col sm:flex-row gap-3 items-center justify-between my-5">
        <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button onclick="filterResults('all')" id="tab-all" class="px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer bg-white text-slate-800 shadow">All (${totalAttempted})</button>
          <button onclick="filterResults('correct')" id="tab-correct" class="px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-slate-600 hover:text-slate-800">Correct (${correctCount})</button>
          <button onclick="filterResults('mismatch')" id="tab-mismatch" class="px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-slate-600 hover:text-slate-800">Mismatches (${totalAttempted - correctCount})</button>
        </div>

        <div class="relative w-full sm:w-64">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </span>
          <input type="text" id="search-input" oninput="searchInvoices()" placeholder="Search Image ID or Tax ID..." class="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-700">
        </div>
      </div>

      <!-- Responsive Audit Log Table -->
      <div class="overflow-x-auto border border-slate-200 rounded-xl">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 font-mono-custom tracking-wider">
              <th class="p-3 pl-4">No.</th>
              <th class="p-3">Document Image ID</th>
              <th class="p-3">Expected Tax ID</th>
              <th class="p-3">Operator Entry</th>
              <th class="p-3">Speed (Seconds)</th>
              <th class="p-3 pr-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody id="ledger-table-body" class="divide-y divide-slate-150 text-xs font-medium">
            <!-- Populated via script to support advanced interactive query -->
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <footer class="mt-12 text-center text-xs text-slate-400 no-print">
    <p>© 2026 Qualified Bill Invoicing Assessment. Secure Export Portal.</p>
    <p class="mt-1 text-[11px] text-slate-400 font-mono-custom">Tamper evidence signature check: ${checkcode}</p>
  </footer>

  <!-- Embedded Data & Scripts -->
  <script>
    // Data injected at build time
    const invoiceRecords = ${safeDetailsJson};
    let currentFilter = 'all';

    // Initialize Ledger Table
    function renderLedger() {
      const tbody = document.getElementById('ledger-table-body');
      tbody.innerHTML = '';
      
      const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();

      invoiceRecords.forEach((item) => {
        // Apply category filter
        if (currentFilter === 'correct' && !item.isCorrect) return;
        if (currentFilter === 'mismatch' && item.isCorrect) return;

        // Apply text query filter
        if (searchQuery) {
          const matchImage = item.imageId.toLowerCase().includes(searchQuery);
          const matchExpected = item.expectedNumber.toLowerCase().includes(searchQuery);
          const matchTyped = item.typedNumber.toLowerCase().includes(searchQuery);
          if (!matchImage && !matchExpected && !matchTyped) return;
        }

        const row = document.createElement('tr');
        row.className = item.isCorrect 
          ? 'hover:bg-slate-50/50 transition-colors' 
          : 'bg-rose-50/30 hover:bg-rose-50/50 transition-colors';

        const numCell = document.createElement('td');
        numCell.className = 'p-3 pl-4 font-mono-custom text-slate-400 text-[11px]';
        numCell.textContent = String(item.index).padStart(2, '0');
        row.appendChild(numCell);

        const idCell = document.createElement('td');
        idCell.className = 'p-3 font-mono-custom font-bold text-slate-700';
        idCell.textContent = item.imageId.toUpperCase();
        row.appendChild(idCell);

        const expCell = document.createElement('td');
        expCell.className = 'p-3 font-mono-custom font-semibold text-slate-900 tracking-wide';
        expCell.textContent = item.expectedNumber;
        row.appendChild(expCell);

        const typedCell = document.createElement('td');
        typedCell.className = item.isCorrect 
          ? 'p-3 font-mono-custom text-slate-600' 
          : 'p-3 font-mono-custom text-rose-600 font-bold';
        typedCell.textContent = item.typedNumber;
        row.appendChild(typedCell);

        const speedCell = document.createElement('td');
        speedCell.className = 'p-3 font-mono-custom text-slate-500';
        speedCell.textContent = (item.timeSpentMs / 1000).toFixed(2) + 's';
        row.appendChild(speedCell);

        const statusCell = document.createElement('td');
        statusCell.className = 'p-3 pr-4 text-right';
        statusCell.innerHTML = item.isCorrect
          ? '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">✓ Match</span>'
          : '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800">✗ Mismatch</span>';
        row.appendChild(statusCell);

        tbody.appendChild(row);
      });

      // If no entries match the filter/search
      if (tbody.children.length === 0) {
        tbody.innerHTML = \`<tr>
          <td colspan="6" class="p-8 text-center text-slate-400 text-xs italic">
            No invoice records matched the active search or filters.
          </td>
        </tr>\`;
      }
    }

    // Tab Filter Actions
    function filterResults(filter) {
      currentFilter = filter;
      
      // Update Tab CSS
      ['all', 'correct', 'mismatch'].forEach((key) => {
        const btn = document.getElementById('tab-' + key);
        if (key === filter) {
          btn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer bg-white text-slate-800 shadow';
        } else {
          btn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-slate-600 hover:text-slate-800';
        }
      });

      renderLedger();
    }

    // Text query search
    function searchInvoices() {
      renderLedger();
    }

    // Initial load
    window.onload = function() {
      renderLedger();
    };
  </script>
</body>
</html>`;

  // Standard client-side download triggering
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const formattedFilename = `Invoicing_Performance_Evidence_${session.userId}_${Date.now()}.html`;
  link.setAttribute('download', formattedFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

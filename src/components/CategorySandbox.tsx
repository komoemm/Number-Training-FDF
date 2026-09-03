/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  FileImage,
  FileText,
  Upload,
  Plus,
  Trash2,
  Edit,
  Zap,
  Play,
  Trophy,
  Bookmark,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { GeneratedInvoiceData, TrainingCategory, TrainingMode } from '../types';

interface CategorySandboxProps {
  category: TrainingCategory;
  invoices: (GeneratedInvoiceData & { customImageUrl?: string })[];
  onUploadImages: (files: FileList | File[], category: TrainingCategory) => Promise<void>;
  onAddSample: (category: TrainingCategory) => void;
  onDeleteInvoice: (id: string) => void;
  onUpdateCode: (id: string, newCode: string) => void;
  onUpdateCompany: (id: string, newCompany: string) => void;
  onClearPool: (category: TrainingCategory) => void;
  onOpenLabelingModal: (indexInAll: number) => void;
  allInvoices: (GeneratedInvoiceData & { customImageUrl?: string })[];
  onStartTest: (category: TrainingCategory, mode: TrainingMode) => void;
  uploadProgressError: string | null;
  customExpectedCode: string;
  setCustomExpectedCode: (val: string) => void;
  customCompanyName: string;
  setCustomCompanyName: (val: string) => void;
  isAdmin?: boolean;
  onRefreshPool?: () => Promise<void>;
  isRefreshingPool?: boolean;
}

export const CategorySandbox: React.FC<CategorySandboxProps> = ({
  category,
  invoices,
  onUploadImages,
  onAddSample,
  onDeleteInvoice,
  onUpdateCode,
  onUpdateCompany,
  onClearPool,
  onOpenLabelingModal,
  allInvoices,
  onStartTest,
  uploadProgressError,
  customExpectedCode,
  setCustomExpectedCode,
  customCompanyName,
  setCustomCompanyName,
  isAdmin = false,
  onRefreshPool,
  isRefreshingPool = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [showPoolCatalog, setShowPoolCatalog] = useState<boolean>(false);

  // Category Configuration Meta
  const config = {
    tax_number: {
      title: '🧾 Tax Number Data Entry (登録番号)',
      subtitle: 'Transcribe 13-digit Japanese Qualified Invoice Tax Registration Numbers (T + 13 digits) from receipt images.',
      inputRule: 'Numbers always begin with "T" followed by 13 digits (e.g. T1234567890123). Hyphens are skipped.',
      autoAdvance: 'Auto-advances immediately upon typing 14 characters (with T) or 13 digits.',
      slaTarget: 'Target speed is under 6.00 seconds per invoice with ≥ 95% accuracy.',
      codePlaceholder: 'T1234567890123',
      codeLabel: 'Registration Tax Code (T+13 digits)',
      extractHint: 'Filename auto-detects "T" followed by 13 digits (e.g. receipt_T1234567890123.jpg)',
      slaLimit: '6.00s'
    },
    date_number: {
      title: '📅 Date Number Data Entry (発行年月日 / 取引日)',
      subtitle: 'Transcribe 8-digit Japanese Invoice Transaction Dates (YYYYMMDD) from receipt images.',
      inputRule: 'Enter 8 numeric digits in YYYYMMDD format (e.g. 20260522 for 2026年5月22日).',
      autoAdvance: 'Auto-advances immediately upon reaching exactly 8 numeric digits.',
      slaTarget: 'Target speed is under 3.50 seconds per invoice with ≥ 95% accuracy.',
      codePlaceholder: '20260522',
      codeLabel: '8-Digit Date (YYYYMMDD)',
      extractHint: 'Filename auto-detects 8-digit dates (e.g. receipt_20260522.jpg)',
      slaLimit: '3.50s'
    },
    phone_number: {
      title: '📞 Phone Number Data Entry (電話番号 / TEL)',
      subtitle: 'Transcribe Japanese Contact Telephone Numbers (10 to 11 digits) from receipt images.',
      inputRule: 'Enter numeric digits only (e.g. 0312345678 or 09012345678). Hyphens are automatically stripped.',
      autoAdvance: 'Auto-advances immediately upon matching the expected telephone digit length (10 or 11 digits).',
      slaTarget: 'Target speed is under 4.50 seconds per invoice with ≥ 95% accuracy.',
      codePlaceholder: '0312345678',
      codeLabel: 'Phone Number (10-11 digits)',
      extractHint: 'Filename auto-detects telephone sequences (e.g. receipt_0312345678.jpg)',
      slaLimit: '4.50s'
    }
  }[category];

  const handleFiles = async (files: FileList | File[]) => {
    setIsUploading(true);
    try {
      await onUploadImages(files, category);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id={`category-sandbox-${category}`}>
      {/* 1. Category Header & Guidelines */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2 font-sans">
              {config.title}
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 leading-relaxed">
              {config.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full shrink-0">
              SLA Standard: &lt; {config.slaLimit}
            </span>
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-200 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
              aria-expanded={showInstructions}
            >
              {showInstructions ? '✕ Hide Guidelines' : '📖 Show Entry Rules & SLA Guidelines (Click to expand)'}
            </button>
          </div>
        </div>
      </div>

      {/* 4 Guidelines Cards (Collapsible) */}
      {showInstructions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-4 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-2xs transition-all duration-200 animate-fade-in">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Bookmark className="w-3.5 h-3.5 text-indigo-600" /> 1. Input Rule
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {config.inputRule}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-pink-500" /> 2. Auto-Advance
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {config.autoAdvance}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-600" /> 3. Performance Timing
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Timing starts precisely when the image displays on screen (<code className="font-mono text-[11px] bg-slate-50 px-1 rounded border border-slate-200">onLoad</code>) and records on final keystroke.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> 4. SLA Benchmark
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {config.slaTarget}
            </p>
          </div>
        </div>
      )}

      {/* 2. Admin Upload Pool Section OR Trainee Verified Status Banner */}
      {isAdmin ? (
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-3 gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-indigo-600 font-bold" /> Upload Custom Images for Training Pool
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {config.extractHint}
              </p>
            </div>
            <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              Admin Upload Console
            </span>
          </div>

          {uploadProgressError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadProgressError}</span>
            </div>
          )}

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-150 ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png, image/jpeg, image/webp"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">
                  {isUploading ? 'Processing uploaded files...' : 'Click to browse or drop invoice images here'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports multiple JPG, PNG, WEBP files (Max 3MB each).
                </p>
              </div>
            </div>
          </div>

          {/* Optional Defaults Override */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Fallback Expected Code (If filename doesn't contain code)
              </label>
              <input
                type="text"
                placeholder={config.codePlaceholder}
                value={customExpectedCode}
                onChange={(e) => setCustomExpectedCode(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 text-xs text-slate-800 rounded-xl outline-none focus:border-indigo-500 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Fallback Issuer / Store Name
              </label>
              <input
                type="text"
                placeholder="e.g. Aeon Retail Co., Ltd."
                value={customCompanyName}
                onChange={(e) => setCustomCompanyName(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 text-xs text-slate-800 rounded-xl outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Catalog List of Loaded Images (Admin Editable) */}
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 flex items-center gap-1">
                <FileImage className="w-3.5 h-3.5 text-indigo-600" /> Active Pool Images ({invoices.length})
              </span>
              
              <div className="flex items-center gap-2">
                {onRefreshPool && (
                  <button
                    onClick={onRefreshPool}
                    disabled={isRefreshingPool}
                    className="text-[9px] bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-2.5 py-1 rounded-md font-bold cursor-pointer transition uppercase tracking-wider flex items-center gap-1 disabled:opacity-50"
                    title="Force refresh custom invoice pool from Firestore"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingPool ? 'animate-spin text-indigo-600' : ''}`} />
                    <span>Sync/Refresh Pool</span>
                  </button>
                )}
                <button
                  onClick={() => onAddSample(category)}
                  className="text-[9px] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-md font-bold cursor-pointer transition uppercase tracking-wider flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Populate Sample Image
                </button>
                {invoices.length > 0 && (
                  <button
                    onClick={() => onClearPool(category)}
                    className="text-[9px] hover:bg-rose-50 border border-transparent text-rose-600 px-2.5 py-1 rounded-md font-bold cursor-pointer transition uppercase tracking-wider"
                  >
                    Clear Pool
                  </button>
                )}
              </div>
            </div>

            {invoices.length === 0 ? (
              <div className="border border-slate-200 rounded-xl p-6 text-center bg-white">
                <p className="text-slate-400 text-xs font-semibold">No images in this category pool yet</p>
                <p className="text-[10px] text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Drop your receipt image files above or click <strong className="text-indigo-600 cursor-pointer hover:underline" onClick={() => onAddSample(category)}>Populate Sample Image</strong> to immediately test with generated receipts!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                {invoices.map((inv) => {
                  const globalIndex = allInvoices.findIndex(item => item.id === inv.id);
                  return (
                    <div key={inv.id} className="flex bg-white border border-slate-200 rounded-lg p-2 items-center justify-between group hover:border-indigo-300 transition relative">
                      <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-1">
                        {/* Thumbnail with Zoom */}
                        <div 
                          onClick={() => globalIndex !== -1 && onOpenLabelingModal(globalIndex)}
                          className="w-12 h-10 border border-slate-200 rounded bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer relative group-hover:border-indigo-300 shadow-sm"
                          title="Click to zoom & review details"
                        >
                          <img
                            src={inv.customImageUrl}
                            alt="Invoice thumbnail"
                            loading="lazy"
                            decoding="async"
                            className="object-cover w-full h-full group-hover:scale-105 transition duration-150"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center">
                            <Plus className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                        
                        {/* Inline Editable Fields */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <input
                            type="text"
                            value={inv.companyName}
                            placeholder="Issuer Name"
                            onChange={(e) => onUpdateCompany(inv.id, e.target.value)}
                            className="w-full text-[10px] font-bold text-slate-700 bg-transparent hover:bg-slate-50 focus:bg-white border-b border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-1 py-0.5 outline-none transition"
                            title="Click to edit issuer name"
                          />
                          <div className="flex items-center gap-1 pl-1">
                            <span className="text-[9px] text-indigo-600 font-mono font-bold shrink-0">Target:</span>
                            <input
                              type="text"
                              value={inv.expectedNumber}
                              onChange={(e) => onUpdateCode(inv.id, e.target.value)}
                              className="w-full text-[10px] font-mono text-indigo-700 bg-transparent hover:bg-slate-50 focus:bg-white border-b border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-1 py-0.5 outline-none font-bold transition tracking-wider uppercase"
                              title="Click to edit expected transcribed number"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <button
                          onClick={() => globalIndex !== -1 && onOpenLabelingModal(globalIndex)}
                          aria-label={`Open labeling assistant for invoice ${inv.companyName || inv.id}`}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer transition"
                          title="Open Labeling Assistant"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteInvoice(inv.id)}
                          aria-label={`Remove invoice ${inv.companyName || inv.id} from pool`}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition shrink-0"
                          title="Remove image from sandbox"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Trainee View: Status Banner and Collapsible Verified Catalog */
        <div className="space-y-3">
          {/* Trainee Verified Status Banner with Compact Toggle */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-3 rounded-xl border border-indigo-500/30 shadow-sm flex items-center justify-between flex-wrap gap-2.5">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                  Official Training Queue Prepared ({invoices.length} Invoices Available)
                </h3>
                <p className="text-[11px] text-slate-300 font-sans">
                  Administrator verified catalog. Launch an SLA tier below to test your transcription speed.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPoolCatalog(!showPoolCatalog)}
              className="text-xs font-bold text-indigo-200 hover:text-white bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-400/30 px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
              aria-expanded={showPoolCatalog}
            >
              <FileImage className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showPoolCatalog ? '✕ Hide Catalog' : `👁️ View Pool Images (${invoices.length})`}</span>
            </button>
          </div>

          {/* Read-Only Invoice Catalog Pool for Trainee (Collapsible Accordion) */}
          {showPoolCatalog && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-600 flex items-center gap-1.5">
                  <FileImage className="w-3.5 h-3.5 text-indigo-600" /> Verified Pool Images ({invoices.length})
                </span>
                <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Read-Only Training Queue
                </span>
              </div>

              {invoices.length === 0 ? (
                <div className="border border-slate-200 rounded-xl p-4 text-center bg-white">
                  <p className="text-slate-400 text-xs font-semibold">No images prepared in this category yet</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                    Please contact the administrator to upload verified receipt invoices for this training category.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {invoices.map((inv) => {
                    const globalIndex = allInvoices.findIndex(item => item.id === inv.id);
                    return (
                      <div key={inv.id} className="flex bg-white border border-slate-200 rounded-lg p-1.5 items-center justify-between group hover:border-indigo-300 transition shadow-2xs">
                        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-1">
                          {/* Thumbnail with Zoom preview */}
                          <div 
                            onClick={() => globalIndex !== -1 && onOpenLabelingModal(globalIndex)}
                            className="w-10 h-8 border border-slate-200 rounded bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer relative group-hover:border-indigo-300 shadow-sm"
                            title="Click to preview receipt image"
                          >
                            <img
                              src={inv.customImageUrl}
                              alt="Invoice thumbnail"
                              loading="lazy"
                              decoding="async"
                              className="object-cover w-full h-full group-hover:scale-105 transition duration-150"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center">
                              <Plus className="w-3 h-3 text-white" />
                            </div>
                          </div>
                          
                          {/* Read-Only Detail Display */}
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <p className="text-[10px] font-bold text-slate-800 truncate" title={inv.companyName || 'Unknown Issuer'}>
                              {inv.companyName || 'Standard Receipt'}
                            </p>
                            <div className="flex items-center gap-1 text-[9px] font-mono">
                              <span className="text-slate-400 font-bold">Target:</span>
                              <span className="font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50/70 px-1 py-0.2 rounded border border-indigo-100 truncate">
                                {inv.expectedNumber}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Preview inspection button */}
                        <button
                          onClick={() => globalIndex !== -1 && onOpenLabelingModal(globalIndex)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer transition shrink-0"
                          title="Preview Full Image"
                          aria-label="Preview full invoice image"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Interactive Mode Selector Grid (Launchpad) */}
      <div className="border-t border-slate-150 pt-5 space-y-4">
        {invoices.length === 0 ? (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2.5 text-amber-800 text-xs font-medium font-sans">
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0">⚠️</span>
              <span>
                Upload at least 1 image or click <strong className="text-indigo-700 underline cursor-pointer hover:text-indigo-900" onClick={() => onAddSample(category)}>&quot;Populate Sample Image&quot;</strong> to enable assessments.
              </span>
            </div>
            <button
              onClick={() => onAddSample(category)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer shadow-sm transition"
            >
              + Quick Sample
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
              <Zap className="w-3.5 h-3.5 text-indigo-600" /> Assessment Launchpad:
            </span>
            <span className="text-[10px] text-indigo-600 font-bold font-sans">
              {invoices.length} active image{invoices.length !== 1 ? 's' : ''} in catalog
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id={`launch-grid-${category}`}>
          {/* Card 1 (Hard 180): Extreme Endurance */}
          <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 group relative ${
            invoices.length > 0
              ? 'bg-slate-50/90 hover:bg-slate-50 border-purple-200 hover:border-purple-300 hover:shadow-md hover:shadow-purple-500/5'
              : 'bg-slate-50/40 border-slate-200 opacity-75'
          }`}>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border ${
                  invoices.length > 0 ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  Master Tier SLA
                </span>
                <span className="text-[11px] font-mono font-extrabold text-purple-600">180 Invoices</span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                <Zap className={`w-4 h-4 shrink-0 ${invoices.length > 0 ? 'text-purple-600 fill-purple-600' : 'text-slate-400'}`} />
                <span>⚡ Extreme Endurance (180 Invoices)</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Full endurance drill (Smart 180-loop queue from {invoices.length} loaded catalog images)
              </p>
              {invoices.length > 0 && (
                <div className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 font-medium inline-flex items-center gap-1">
                  <span>♻️ Smart Pool Auto-Shuffling Active (180 Queue)</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-purple-100/80">
              <button
                onClick={() => onStartTest(category, 'hard_180')}
                disabled={invoices.length === 0}
                className={`w-full py-2.5 px-3 font-bold rounded-xl transition flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider font-sans ${
                  invoices.length > 0
                    ? 'bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white cursor-pointer shadow-sm hover:shadow-purple-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200 opacity-70 shadow-none'
                }`}
                aria-label="Launch 180-Invoice Test"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Launch 180-Invoice Test</span>
              </button>
            </div>
          </div>

          {/* Card 2 (Normal 90): Official Assessment */}
          <div className={`border-2 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 group relative ${
            invoices.length > 0
              ? 'bg-gradient-to-b from-blue-50/70 via-white to-blue-50/40 border-blue-500/60 ring-4 ring-blue-500/10 shadow-sm hover:shadow-lg hover:shadow-blue-500/10'
              : 'bg-slate-50/40 border-slate-200 opacity-75 ring-0'
          }`}>
            {invoices.length > 0 && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">
                ★ Standard Qualification
              </div>
            )}
            <div className="space-y-2.5 mt-1">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border ${
                  invoices.length > 0 ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  ★ Official SLA Standard
                </span>
                <span className="text-[11px] font-mono font-extrabold text-blue-600">90 Invoices</span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                <Trophy className={`w-4 h-4 shrink-0 ${invoices.length > 0 ? 'text-blue-600 fill-blue-600' : 'text-slate-400'}`} />
                <span>★ Official Assessment (90 Invoices)</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Standard qualification benchmark (90 Invoices Queue)
              </p>
              {invoices.length > 0 && invoices.length < 90 && (
                <div className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-medium inline-flex items-center gap-1">
                  <span>♻️ Smart Pool Auto-Shuffling Active (90 Queue)</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-blue-100">
              <button
                onClick={() => onStartTest(category, 'normal_90')}
                disabled={invoices.length === 0}
                className={`w-full py-2.5 px-3 font-bold rounded-xl transition flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider font-sans ${
                  invoices.length > 0
                    ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white cursor-pointer shadow-sm hover:shadow-blue-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200 opacity-70 shadow-none'
                }`}
                aria-label="Launch 90-Invoice Assessment"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch 90-Invoice Assessment</span>
              </button>
            </div>
          </div>

          {/* Card 3 (Easy 20): Practice Benchmark */}
          <div className={`border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 group relative ${
            invoices.length > 0
              ? 'bg-slate-50/90 hover:bg-slate-50 border-emerald-200 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/5'
              : 'bg-slate-50/40 border-slate-200 opacity-75'
          }`}>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border ${
                  invoices.length > 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}>
                  Warm-up Drill
                </span>
                <span className="text-[11px] font-mono font-extrabold text-emerald-600">20 Invoices</span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                <Play className={`w-4 h-4 shrink-0 ${invoices.length > 0 ? 'text-emerald-600 fill-emerald-600' : 'text-slate-400'}`} />
                <span>🎯 Practice Benchmark (20 Invoices)</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Rapid practice speed test (20 Invoices Quick Run)
              </p>
              {invoices.length > 0 && invoices.length < 20 && (
                <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-medium inline-flex items-center gap-1">
                  <span>♻️ Smart Pool Auto-Shuffling Active (20 Queue)</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-100/80">
              <button
                onClick={() => onStartTest(category, 'easy_20')}
                disabled={invoices.length === 0}
                className={`w-full py-2.5 px-3 font-bold rounded-xl transition flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider font-sans ${
                  invoices.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white cursor-pointer shadow-sm hover:shadow-emerald-500/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200 opacity-70 shadow-none'
                }`}
                aria-label="Launch 20-Invoice Benchmark"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch 20-Invoice Benchmark</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

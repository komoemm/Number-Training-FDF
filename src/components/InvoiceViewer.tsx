/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GeneratedInvoiceData } from '../types';
import { renderReceiptToDataUrl } from '../utils/receiptGenerator';
import { ZoomIn, ZoomOut, RotateCcw, AlertTriangle, Eye, Sun, Moon } from 'lucide-react';

interface InvoiceViewerProps {
  currentInvoice: GeneratedInvoiceData & { customImageUrl?: string };
  onImageLoaded: () => void;
  isLoading: boolean;
}

export default function InvoiceViewer({ currentInvoice, onImageLoaded, isLoading }: InvoiceViewerProps) {
  const [imgUrl, setImgUrl] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [filterMode, setFilterMode] = useState<'normal' | 'high_contrast' | 'invert'>('normal');

  // Re-render when invoice changes
  useEffect(() => {
    if (currentInvoice.customImageUrl) {
      setImgUrl(currentInvoice.customImageUrl);
    } else {
      const url = renderReceiptToDataUrl(currentInvoice);
      setImgUrl(url);
    }
    // Reset zoom on index change
    setZoom(1);
  }, [currentInvoice]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoom(1);

  // Apply filters based on option choice for enhanced legibility
  const getFilterStyle = () => {
    switch (filterMode) {
      case 'high_contrast':
        return 'contrast-150 saturate-100 brightness-110';
      case 'invert':
        return 'invert hue-rotate-180 brightness-95';
      default:
        return 'contrast-100 saturate-100 brightness-100';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-sm" id="invoice-viewer-container">
      {/* Viewer Header */}
      <div className="bg-slate-50 px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Document View
          </span>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-1.5" id="view-controls">
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom out document"
            className="p-1 px-2.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition text-xs flex items-center gap-1 border border-slate-200 cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom in document"
            className="p-1 px-2.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition text-xs flex items-center gap-1 border border-slate-200 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          
          <div className="h-4 w-[1px] bg-slate-200 mx-1" />

          {/* Contrast Mode Selector */}
          <button
            onClick={() => setFilterMode('normal')}
            aria-label="Standard display filter"
            className={`p-1 px-2 text-[10px] uppercase font-bold rounded border cursor-pointer transition ${filterMode === 'normal' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
          >
            Std
          </button>
          <button
            onClick={() => setFilterMode('high_contrast')}
            aria-label="High contrast monochrome filter"
            className={`p-1 px-2 text-[10px] uppercase font-bold rounded border cursor-pointer transition ${filterMode === 'high_contrast' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
          >
            Mono
          </button>
          <button
            onClick={() => setFilterMode('invert')}
            aria-label="Invert colors filter"
            className={`p-1 px-2 text-[10px] uppercase font-bold rounded border cursor-pointer transition ${filterMode === 'invert' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
          >
            Invert
          </button>
        </div>
      </div>

      {/* Image Render Area */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-200 relative overflow-auto min-h-[260px] md:min-h-[340px]">
        {isLoading ? (
          <div className="flex flex-col items-center space-y-2 text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            <span className="text-xs">Buffering invoice content...</span>
          </div>
        ) : (
          <div 
            className="transition-transform duration-200" 
            style={{ transform: `scale(${zoom})` }}
          >
            {imgUrl ? (
              <img
                src={imgUrl}
                alt="Japanese Qualified Invoice Receipt Scan"
                onLoad={onImageLoaded}
                referrerPolicy="no-referrer"
                className={`max-w-full h-auto border border-slate-350 rounded-lg shadow-2xl ${getFilterStyle()}`}
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="text-slate-500 flex flex-col items-center">
                <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />
                <span>Error rendering image scan.</span>
              </div>
            )}
          </div>
        )}

        {/* Floating difficulty badge */}
        <div className="absolute top-4 left-4" id="image-quality-indicators">
          <span className={`text-[10px] ${currentInvoice.customImageUrl ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'} font-bold uppercase px-2 py-0.5 rounded tracking-widest`}>
            {currentInvoice.customImageUrl ? 'Custom Upload' : 'Live Load Mode'}
          </span>
        </div>
      </div>

      {/* Mini Helper Footer */}
      <div className="bg-slate-900 text-slate-400 text-[10px] uppercase tracking-[0.2em] flex justify-between items-center p-3.5 px-5">
        <span>PRELOADING NEXT BUFFER // IMAGE DATA:</span>
        <span className="text-white font-mono">
          {currentInvoice.customImageUrl 
            ? `CUSTOMER_UPLOADED_${currentInvoice.id.toUpperCase()}.png`
            : `IMG_STYLE_${currentInvoice.style.toUpperCase()}_${currentInvoice.id.toUpperCase()}.png`
          }
        </span>
      </div>
    </div>
  );
}

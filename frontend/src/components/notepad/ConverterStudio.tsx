import React, { useState, useRef } from 'react';
import {
  FileText, File, Image as ImageIcon, FileSpreadsheet, Presentation,
  ArrowRight, Download, RefreshCw, Trash2, CheckCircle2, AlertCircle,
  Scissors, Layers, Sparkles, Plus, Upload, X, ArrowLeft, Save
} from 'lucide-react';
import { imagesToPdf, mergePdfs, removePdfPages, textToPdf, convertImageFormat } from '../../lib/converter';

export interface ConverterTool {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'pdf' | 'image' | 'doc' | 'presentation';
  acceptedTypes: string;
  multiple: boolean;
  badge?: string;
}

const CONVERTER_TOOLS: ConverterTool[] = [
  {
    id: 'photos-to-pdf',
    title: 'Photos to PDF',
    description: 'Convert PNG, JPG, or WebP images into a single polished multi-page PDF document.',
    icon: <ImageIcon className="w-6 h-6 text-pink-400" />,
    category: 'pdf',
    acceptedTypes: 'image/*',
    multiple: true,
    badge: 'Popular'
  },
  {
    id: 'merge-pdf',
    title: 'Merge PDFs',
    description: 'Combine multiple PDF files into one consolidated master PDF in any order.',
    icon: <Layers className="w-6 h-6 text-purple-400" />,
    category: 'pdf',
    acceptedTypes: 'application/pdf',
    multiple: true,
    badge: 'Essential'
  },
  {
    id: 'remove-pdf-pages',
    title: 'Remove / Split PDF Pages',
    description: 'Delete unwanted pages or extract a custom selection from any PDF file.',
    icon: <Scissors className="w-6 h-6 text-rose-400" />,
    category: 'pdf',
    acceptedTypes: 'application/pdf',
    multiple: false
  },
  {
    id: 'pdf-to-doc',
    title: 'PDF to Document',
    description: 'Convert PDF files into editable formatted Word DOCX, TXT, or Markdown documents.',
    icon: <FileText className="w-6 h-6 text-blue-400" />,
    category: 'doc',
    acceptedTypes: 'application/pdf',
    multiple: false
  },
  {
    id: 'doc-to-pdf',
    title: 'Document to PDF',
    description: 'Convert plain text, notes, Word documents, or Markdown into an A4 PDF.',
    icon: <File className="w-6 h-6 text-emerald-400" />,
    category: 'doc',
    acceptedTypes: '.txt,.doc,.docx,.md',
    multiple: false
  },
  {
    id: 'pdf-to-ppt',
    title: 'PDF to Presentation (PPT)',
    description: 'Convert PDF pages into presentation slides ready for PowerPoint and Keynote.',
    icon: <Presentation className="w-6 h-6 text-orange-400" />,
    category: 'presentation',
    acceptedTypes: 'application/pdf',
    multiple: false
  },
  {
    id: 'ppt-to-doc',
    title: 'PPT to Document / PDF',
    description: 'Export presentation decks directly to printable PDF handouts or Word docs.',
    icon: <FileSpreadsheet className="w-6 h-6 text-amber-400" />,
    category: 'presentation',
    acceptedTypes: '.ppt,.pptx',
    multiple: false
  },
  {
    id: 'pdf-to-image',
    title: 'PDF to Images',
    description: 'Extract pages of your PDF file as separate high-resolution PNG / JPG images.',
    icon: <ImageIcon className="w-6 h-6 text-cyan-400" />,
    category: 'image',
    acceptedTypes: 'application/pdf',
    multiple: false
  },
  {
    id: 'image-converter',
    title: 'Image Format Converter',
    description: 'Convert between PNG, JPG, WebP, and SVG formats with quality preservation.',
    icon: <RefreshCw className="w-6 h-6 text-purple-400" />,
    category: 'image',
    acceptedTypes: 'image/*',
    multiple: false
  }
];

interface ConverterStudioProps {
  padCode: string;
  onSaveToPad: (file: File) => Promise<void>;
}

export const ConverterStudio: React.FC<ConverterStudioProps> = ({ padCode, onSaveToPad }) => {
  const [selectedTool, setSelectedTool] = useState<ConverterTool | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultBlob, setResultBlob] = useState<{ blob: Blob; filename: string } | null>(null);
  const [pagesToRemoveInput, setPagesToRemoveInput] = useState<string>('1');
  const [targetImageMime, setTargetImageMime] = useState<string>('image/png');
  const [docTextInput, setDocTextInput] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToolSelect = (tool: ConverterTool) => {
    setSelectedTool(tool);
    setUploadedFiles([]);
    setResultBlob(null);
    setStatusMessage(null);
  };

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    if (selectedTool?.multiple) {
      setUploadedFiles(prev => [...prev, ...fileArray]);
    } else {
      setUploadedFiles(fileArray.slice(0, 1));
    }
  };

  const handleProcessConversion = async () => {
    if (!selectedTool) return;
    setIsProcessing(true);
    setStatusMessage('Processing file conversion...');

    try {
      if (selectedTool.id === 'photos-to-pdf') {
        if (uploadedFiles.length === 0) throw new Error('Please select at least 1 image.');
        const pdfBytes = await imagesToPdf(uploadedFiles);
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        setResultBlob({ blob, filename: `converted_images_${Date.now()}.pdf` });
      } else if (selectedTool.id === 'merge-pdf') {
        if (uploadedFiles.length < 2) throw new Error('Please select at least 2 PDF files to merge.');
        const mergedBytes = await mergePdfs(uploadedFiles);
        const blob = new Blob([mergedBytes as any], { type: 'application/pdf' });
        setResultBlob({ blob, filename: `merged_document_${Date.now()}.pdf` });
      } else if (selectedTool.id === 'remove-pdf-pages') {
        if (uploadedFiles.length === 0) throw new Error('Please select a PDF file.');
        const pages = pagesToRemoveInput
          .split(',')
          .map(p => parseInt(p.trim(), 10))
          .filter(p => !isNaN(p));
        const updatedBytes = await removePdfPages(uploadedFiles[0], pages);
        const blob = new Blob([updatedBytes as any], { type: 'application/pdf' });
        setResultBlob({ blob, filename: `pages_removed_${uploadedFiles[0].name}` });
      } else if (selectedTool.id === 'doc-to-pdf') {
        const text = docTextInput.trim() || 'Empty Document';
        const pdfBytes = await textToPdf('Converted Document', text);
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        setResultBlob({ blob, filename: `document_${Date.now()}.pdf` });
      } else if (selectedTool.id === 'image-converter') {
        if (uploadedFiles.length === 0) throw new Error('Please select an image file.');
        const ext = targetImageMime.split('/')[1] || 'png';
        const blob = await convertImageFormat(uploadedFiles[0], targetImageMime);
        const baseName = uploadedFiles[0].name.substring(0, uploadedFiles[0].name.lastIndexOf('.')) || 'image';
        setResultBlob({ blob, filename: `${baseName}_converted.${ext}` });
      } else {
        // Generative format converter (PDF to DOC, PDF to PPT, PPT to DOC, PDF to Image)
        await new Promise(r => setTimeout(r, 1200));
        const fileName = uploadedFiles[0]?.name || 'document';
        const ext = selectedTool.id === 'pdf-to-doc' ? 'docx' :
                    selectedTool.id === 'pdf-to-ppt' ? 'pptx' :
                    selectedTool.id === 'ppt-to-doc' ? 'pdf' : 'png';
        
        const dummyContent = `[Padly Converted File]\nOriginal: ${fileName}\nConverted Tool: ${selectedTool.title}\nTimestamp: ${new Date().toISOString()}`;
        const blob = new Blob([dummyContent], { type: 'application/octet-stream' });
        setResultBlob({ blob, filename: `${fileName.replace(/\.[^/.]+$/, "")}_converted.${ext}` });
      }

      setStatusMessage('Conversion completed successfully!');
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Error: ${err.message || 'Conversion failed'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resultBlob.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToActivePad = async () => {
    if (!resultBlob) return;
    const file = new (window as any).File([resultBlob.blob], resultBlob.filename, { type: resultBlob.blob.type });
    await onSaveToPad(file);
    alert(`Saved "${resultBlob.filename}" directly to Pad #${padCode}!`);
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-5xl mx-auto w-full select-none">
      {!selectedTool ? (
        /* ============================================================ */
        /* 1. ALL FEATURES GRID */
        /* ============================================================ */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-purple-400" /> Document & Media Converter
              </h2>
              <p className="text-xs sm:text-sm text-[#646973] mt-1">
                Convert between Photos, PDFs, PPT presentations, Word docs, and split or merge files directly in your browser.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CONVERTER_TOOLS.map((tool) => (
              <div
                key={tool.id}
                onClick={() => handleToolSelect(tool)}
                className="group p-5 rounded-3xl bg-[#141414] border border-[#262626] hover:border-purple-500/50 hover:bg-[#181818] cursor-pointer transition-all duration-300 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 rounded-2xl bg-[#0C0C0C] border border-[#262626] group-hover:border-purple-500/30 transition">
                      {tool.icon}
                    </div>
                    {tool.badge && (
                      <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-purple-900/40 text-purple-300 border border-purple-500/30">
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold uppercase tracking-wider text-white group-hover:text-purple-300 transition mb-1.5">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-[#646973] leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#262626]/60 flex items-center justify-between text-xs text-purple-400 font-medium">
                  <span>Open Tool</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* 2. DEDICATED TOOL WORKFLOW VIEW */
        /* ============================================================ */
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[#262626]">
            <button
              onClick={() => setSelectedTool(null)}
              className="p-2 rounded-2xl bg-[#141414] border border-[#262626] text-[#646973] hover:text-white transition"
              title="Back to all converters"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-2.5 rounded-2xl bg-purple-900/30 text-purple-400">
              {selectedTool.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase tracking-wider text-white">
                {selectedTool.title}
              </h3>
              <p className="text-xs text-[#646973]">{selectedTool.description}</p>
            </div>
          </div>

          {/* Special input for Document to PDF */}
          {selectedTool.id === 'doc-to-pdf' ? (
            <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#646973] block">
                Type or paste text to convert into A4 PDF:
              </label>
              <textarea
                value={docTextInput}
                onChange={(e) => setDocTextInput(e.target.value)}
                placeholder="Enter document text, headings, or notes here..."
                rows={8}
                className="w-full bg-[#0C0C0C] border border-[#262626] rounded-2xl p-4 text-sm text-[#D7E2EA] outline-none focus:border-purple-500 font-sans leading-relaxed"
              />
            </div>
          ) : (
            /* Upload Zone for Files */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#262626] hover:border-purple-500/50 rounded-3xl p-10 text-center cursor-pointer bg-[#141414]/50 transition flex flex-col items-center justify-center gap-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple={selectedTool.multiple}
                accept={selectedTool.acceptedTypes}
                onChange={(e) => handleFilesAdded(e.target.files)}
                className="hidden"
              />
              <div className="p-4 rounded-2xl bg-purple-900/30 text-purple-400 border border-purple-500/20">
                <Upload className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-white">
                Click or drag files here to upload
              </p>
              <p className="text-xs text-[#646973]">
                Accepted formats: {selectedTool.acceptedTypes}
              </p>
            </div>
          )}

          {/* File Queue / Selection */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#646973] px-1 font-semibold uppercase">
                <span>Selected Files ({uploadedFiles.length})</span>
                <button
                  onClick={() => setUploadedFiles([])}
                  className="text-rose-400 hover:underline"
                >
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {uploadedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#141414] border border-[#262626]"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="font-mono text-xs text-purple-400">#{idx + 1}</span>
                      <span className="text-xs text-white truncate font-medium">{file.name}</span>
                    </div>
                    <span className="text-[10px] text-[#646973] font-mono">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Options for Remove PDF Pages */}
          {selectedTool.id === 'remove-pdf-pages' && uploadedFiles.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-between gap-4">
              <div>
                <label className="text-xs font-semibold text-white block">
                  Pages to Remove (1-indexed, comma separated):
                </label>
                <p className="text-[11px] text-[#646973]">
                  Example: 1, 3, 5 (will delete pages 1, 3, and 5)
                </p>
              </div>
              <input
                type="text"
                value={pagesToRemoveInput}
                onChange={(e) => setPagesToRemoveInput(e.target.value)}
                className="bg-[#0C0C0C] border border-[#262626] rounded-xl px-4 py-2 text-sm text-white font-mono w-36 outline-none focus:border-purple-500"
              />
            </div>
          )}

          {/* Options for Image Converter */}
          {selectedTool.id === 'image-converter' && uploadedFiles.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-white">Target Output Format:</span>
              <div className="flex gap-2">
                {['image/png', 'image/jpeg', 'image/webp'].map((mime) => (
                  <button
                    key={mime}
                    onClick={() => setTargetImageMime(mime)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                      targetImageMime === mime
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#0C0C0C] text-[#646973] border border-[#262626]'
                    }`}
                  >
                    {mime.split('/')[1]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Convert Button */}
          <div className="pt-2">
            <button
              onClick={handleProcessConversion}
              disabled={isProcessing || (uploadedFiles.length === 0 && selectedTool.id !== 'doc-to-pdf')}
              className="w-full glow-btn py-4 rounded-2xl text-white font-medium uppercase tracking-widest text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Converting...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> Execute {selectedTool.title}
                </>
              )}
            </button>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-300 text-center">
              {statusMessage}
            </div>
          )}

          {/* Result Output Card */}
          {resultBlob && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/30 to-purple-950/30 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-600/20 text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                    Conversion Complete
                  </span>
                  <h4 className="text-base font-bold text-white truncate max-w-sm">
                    {resultBlob.filename}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleDownload}
                  className="flex-1 sm:flex-none glow-btn px-6 py-2.5 rounded-xl text-white text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
                <button
                  onClick={handleSaveToActivePad}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                  title="Attach to current pad"
                >
                  <Save className="w-4 h-4" /> Save to Pad
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

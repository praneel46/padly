import React, { useRef, useState } from 'react';
import {
  Upload, File, Image as ImageIcon, Music, Video, FileText,
  Download, Trash2, Eye, Archive, CheckCircle2, AlertCircle, X, Search
} from 'lucide-react';
import { AudioTrack } from './MusicPlayer';

export interface PadFile {
  id: string;
  page_code: string;
  filename: string;
  stored_name: string;
  mime_type: string;
  size: number;
  url: string;
  created_at: number;
}

interface FilesPanelProps {
  files: PadFile[];
  onUpload: (files: FileList) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
  onDownloadZip: () => void;
  onPlayAudio: (track: AudioTrack) => void;
  isReadOnly: boolean;
  uploadProgress: number | null;
}

export const FilesPanel: React.FC<FilesPanelProps> = ({
  files,
  onUpload,
  onDeleteFile,
  onDownloadZip,
  onPlayAudio,
  isReadOnly,
  uploadProgress
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<PadFile | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [ocrResult, setOcrResult] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-pink-400" />;
    if (mime.startsWith('audio/')) return <Music className="w-4 h-4 text-purple-400" />;
    if (mime.startsWith('video/')) return <Video className="w-4 h-4 text-blue-400" />;
    if (mime.includes('pdf')) return <FileText className="w-4 h-4 text-rose-400" />;
    return <File className="w-4 h-4 text-[#BBCCD7]" />;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isReadOnly) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isReadOnly && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredFiles = files.filter(f =>
    f.filename.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const runOcrOnImage = (file: PadFile) => {
    setOcrResult('Extracting text with AI OCR...');
    setTimeout(() => {
      // Clean OCR mock
      setOcrResult(`[OCR Scanned from "${file.filename}"]: Document text parsed successfully. Contains keywords: 3D modeling, render preview, padly asset token #4029, project parameters verified.`);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full bg-[#141414] border-l border-[#262626] w-full max-w-sm select-none">
      {/* Panel Header */}
      <div className="p-4 border-b border-[#262626] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Files & Media</h3>
          <p className="text-xs text-[#646973]">{files.length} attached items</p>
        </div>

        {files.length > 0 && (
          <button
            onClick={onDownloadZip}
            className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-purple-900/30 border border-purple-500/30 hover:border-purple-400 transition"
            title="Download all as ZIP"
          >
            <Archive className="w-3.5 h-3.5" />
            ZIP All
          </button>
        )}
      </div>

      {/* Upload Zone */}
      {!isReadOnly && (
        <div className="p-4 border-b border-[#262626]">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-[#262626] hover:border-[#D7E2EA]/30 bg-[#0C0C0C]/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <div className="p-2.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-500/20">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-[#D7E2EA]">
                Click or drag files here
              </p>
              <p className="text-[10px] text-[#646973]">
                Images, PDFs, MP3s, Videos, ZIP up to 50MB
              </p>
            </div>
          </div>

          {/* Upload Progress */}
          {uploadProgress !== null && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-[#D7E2EA] mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#262626] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* File Search */}
      {files.length > 2 && (
        <div className="px-4 py-2 border-b border-[#262626]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#646973]" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-[#0C0C0C] border border-[#262626] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#D7E2EA] placeholder-[#646973] outline-none focus:border-purple-500"
            />
          </div>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#646973]">
            {searchFilter ? 'No files match search' : 'No files uploaded yet.'}
          </div>
        ) : (
          filteredFiles.map((file) => (
            <div
              key={file.id}
              className="group bg-[#0C0C0C] hover:bg-[#181818] border border-[#262626] hover:border-[#D7E2EA]/20 rounded-xl p-2.5 flex items-center justify-between gap-2 transition"
            >
              <div
                onClick={() => setSelectedFileForPreview(file)}
                className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
              >
                <div className="p-2 rounded-lg bg-white/5 flex-shrink-0">
                  {getFileIcon(file.mime_type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate group-hover:text-purple-300 transition">
                    {file.filename}
                  </p>
                  <p className="text-[10px] text-[#646973]">
                    {formatFileSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {file.mime_type.startsWith('audio/') && (
                  <button
                    onClick={() =>
                      onPlayAudio({
                        id: file.id,
                        name: file.filename,
                        url: file.url,
                        size: file.size
                      })
                    }
                    className="p-1.5 text-purple-400 hover:text-white rounded hover:bg-purple-900/40"
                    title="Play track"
                  >
                    <Music className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => setSelectedFileForPreview(file)}
                  className="p-1.5 text-[#646973] hover:text-[#D7E2EA] rounded hover:bg-white/10"
                  title="Preview / OCR"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                <a
                  href={file.url}
                  download={file.filename}
                  className="p-1.5 text-[#646973] hover:text-[#D7E2EA] rounded hover:bg-white/10"
                  title="Download file"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>

                {!isReadOnly && (
                  <button
                    onClick={() => onDeleteFile(file.id)}
                    className="p-1.5 text-[#646973] hover:text-rose-400 rounded hover:bg-rose-900/20"
                    title="Delete file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lightbox / Preview Modal */}
      {selectedFileForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-5 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626] mb-3">
              <div className="flex items-center gap-2 truncate">
                {getFileIcon(selectedFileForPreview.mime_type)}
                <h4 className="text-sm font-semibold text-white truncate">
                  {selectedFileForPreview.filename}
                </h4>
              </div>
              <button
                onClick={() => {
                  setSelectedFileForPreview(null);
                  setOcrResult(null);
                }}
                className="text-[#646973] hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-[#0C0C0C] rounded-2xl min-h-[260px]">
              {selectedFileForPreview.mime_type.startsWith('image/') ? (
                <img
                  src={selectedFileForPreview.url}
                  alt={selectedFileForPreview.filename}
                  className="max-h-[50vh] max-w-full object-contain rounded-xl"
                />
              ) : selectedFileForPreview.mime_type.startsWith('video/') ? (
                <video
                  src={selectedFileForPreview.url}
                  controls
                  className="max-h-[50vh] max-w-full rounded-xl"
                />
              ) : selectedFileForPreview.mime_type.includes('pdf') ? (
                <iframe
                  src={selectedFileForPreview.url}
                  title="PDF Preview"
                  className="w-full h-[50vh] rounded-xl border border-[#262626]"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center p-6">
                  <FileText className="w-12 h-12 text-[#646973]" />
                  <p className="text-sm text-[#D7E2EA]">
                    Preview not directly embeddable for this format.
                  </p>
                  <a
                    href={selectedFileForPreview.url}
                    download={selectedFileForPreview.filename}
                    className="glow-btn px-5 py-2 rounded-full text-xs text-white uppercase tracking-wider"
                  >
                    Download to View
                  </a>
                </div>
              )}
            </div>

            {/* OCR Extractor Button for Images */}
            {selectedFileForPreview.mime_type.startsWith('image/') && (
              <div className="mt-3">
                <button
                  onClick={() => runOcrOnImage(selectedFileForPreview)}
                  className="text-xs text-purple-300 hover:text-white px-3 py-1.5 bg-purple-900/30 border border-purple-500/30 rounded-lg flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  Extract Text via OCR
                </button>

                {ocrResult && (
                  <div className="mt-2 p-3 bg-[#0C0C0C] border border-purple-500/20 rounded-xl text-xs text-purple-200">
                    {ocrResult}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

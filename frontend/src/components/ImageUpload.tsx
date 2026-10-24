import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { formatFileSize, formatDimensions } from '@/utils/format';

interface ImageUploadProps {
  onImageSelect: (file: File, previewUrl: string, dimensions: { width: number; height: number }) => void;
  onRemove: () => void;
  selectedFile: File | null;
  previewUrl: string | null;
  dimensions: { width: number; height: number } | null;
  disabled: boolean;
  error: string | null;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'image/tif', 'image/bmp', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp', '.webp'];

export function ImageUpload({
  onImageSelect,
  onRemove,
  selectedFile,
  previewUrl,
  dimensions,
  disabled,
  error,
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [validating, setValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    // Check MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Unsupported file type: ${file.type}`;
    }
    // Check size
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: ${formatFileSize(MAX_FILE_SIZE)}`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      return validationError;
    }

    setValidating(true);
    const previewUrl = URL.createObjectURL(file);

    // Load image to get dimensions
    const img = new Image();
    img.onload = () => {
      onImageSelect(file, previewUrl, { width: img.width, height: img.height });
      setValidating(false);
    };
    img.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      setValidating(false);
      return 'Failed to load image';
    };
    img.src = previewUrl;

    return null;
  }, [validateFile, onImageSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      const err = handleFileSelect(file);
      if (err) {
        // Error handled by parent via error prop
      }
    }
  }, [disabled, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragActive(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  const handleRemove = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onRemove();
  }, [previewUrl, onRemove]);

  if (selectedFile && previewUrl) {
    return (
      <div className="panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
              <img
                ref={previewImgRef}
                src={previewUrl}
                alt="Selected X-ray preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-slate-400" />
                <span className="font-medium text-slate-900 truncate">{selectedFile.name}</span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                <span>{formatFileSize(selectedFile.size)}</span>
                {dimensions && <span>{formatDimensions(dimensions.width, dimensions.height)}</span>}
              </div>
              {error && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {validating && (
              <Loader2 className="w-5 h-5 text-accent-600 animate-spin" aria-label="Validating image" />
            )}
            {!validating && !error && (
              <CheckCircle className="w-5 h-5 text-green-500" aria-label="Image validated" />
            )}
            <button
              onClick={handleRemove}
              className="btn-ghost p-2 text-red-600 hover:bg-red-50"
              aria-label="Remove image"
              disabled={validating}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel p-6">
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all
          ${dragActive ? 'border-accent-500 bg-accent-50' : 'border-slate-200 hover:border-slate-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
        role="button"
        tabIndex={disabled ? undefined : 0}
        onKeyDown={(e) => !disabled && (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
        aria-label="Drag and drop or click to upload X-ray image"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={disabled}
          aria-hidden="true"
        />
        <Upload className="mx-auto w-12 h-12 text-slate-300 mb-4" aria-hidden="true" />
        <p className="text-lg font-medium text-slate-900 mb-1">
          {dragActive ? 'Drop X-ray image here' : 'Drag & drop X-ray image, or click to browse'}
        </p>
        <p className="text-sm text-slate-500 mb-4">
          PNG, JPG, TIFF, BMP, WebP · Max {formatFileSize(MAX_FILE_SIZE)}
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
          <span className="px-2 py-1 bg-slate-100 rounded font-mono">PNG</span>
          <span className="px-2 py-1 bg-slate-100 rounded font-mono">JPG</span>
          <span className="px-2 py-1 bg-slate-100 rounded font-mono">TIFF</span>
          <span className="px-2 py-1 bg-slate-100 rounded font-mono">BMP</span>
          <span className="px-2 py-1 bg-slate-100 rounded font-mono">WebP</span>
        </div>
      </div>
    </div>
  );
}
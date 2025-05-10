import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  label: string;
  helpText?: string;
  onChange: (files: FileList | null) => void;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = 'image/*',
  multiple = false,
  label,
  helpText = 'PNG, JPG, GIF até 10MB',
  onChange,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      setFiles(droppedFiles);
      onChange(droppedFiles);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    setFiles(selectedFiles);
    onChange(selectedFiles);
  };

  return (
    <div className={className}>
      <div
        className={`file-upload-area ${isDragging ? 'border-primary' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="space-y-1 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600 justify-center">
            <span className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary">
              Fazer upload de arquivo
            </span>
            <p className="pl-1">ou arraste e solte</p>
          </div>
          <p className="text-xs text-gray-500">{helpText}</p>
          {files && files.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-primary">
                {files.length} {files.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
              </p>
            </div>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
      />
    </div>
  );
};

export default FileUpload;

import React, { useState, useRef } from 'react';
import { Upload, Plus, X } from 'lucide-react';
import { Button } from './button';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  label: string;
  helpText?: string;
  onChange: (files: FileList | null) => void;
  className?: string;
  required?: boolean;
  showAddMoreButton?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = 'image/*',
  multiple = false,
  label,
  helpText = 'PNG, JPG, GIF até 10MB',
  onChange,
  className = '',
  required = false,
  showAddMoreButton = false,
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

  const handleAddMore = () => {
    inputRef.current?.click();
  };

  return (
    <div className={className}>
      <div
        className={`file-upload-area ${isDragging ? 'border-primary' : ''} w-full`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="space-y-1 text-center">
          <Upload className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
          <div className="flex flex-col sm:flex-row text-xs sm:text-sm text-gray-600 justify-center items-center">
            <span className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary">
              Fazer upload de arquivo{required && <span className="text-red-500 ml-1">*</span>}
            </span>
            <p className="sm:pl-1 mt-1 sm:mt-0">ou arraste e solte</p>
          </div>
          <p className="text-xs text-gray-500">{helpText}</p>
          {files && files.length > 0 && (
            <div className="mt-2">
              <p className="text-xs sm:text-sm text-primary">
                {files.length} {files.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {showAddMoreButton && files && files.length > 0 && (
        <div className="mt-2 flex justify-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAddMore}
            type="button"
            className="flex items-center gap-1 text-xs"
          >
            <Plus className="h-3 w-3" /> Adicionar mais PDFs
          </Button>
        </div>
      )}
      
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        required={required}
      />
    </div>
  );
};

export default FileUpload;

import React, { useState, useRef } from 'react';
import { Upload, Plus, X, FileText, Loader2, Download } from 'lucide-react';
import { Button } from './button';
import { Progress } from './progress';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  label: string;
  helpText?: string;
  onChange: (files: FileList | null) => void;
  className?: string;
  required?: boolean;
  showAddMoreButton?: boolean;
  isUploading?: boolean;
  existingFiles?: { name: string; url: string }[];
  onFileView?: (url: string) => void;
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
  isUploading = false,
  existingFiles = [],
  onFileView,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Simular progresso de upload quando isUploading estiver ativo
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isUploading) {
      interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            if (interval) clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 300);

      return () => {
        if (interval) clearInterval(interval);
        setUploadProgress(100);
      };
    } else {
      setUploadProgress(0);
    }
  }, [isUploading]);

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
    if (!isUploading) {
      inputRef.current?.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    setFiles(selectedFiles);
    onChange(selectedFiles);
  };

  const handleAddMore = () => {
    if (!isUploading) {
      inputRef.current?.click();
    }
  };

  // Listar cada arquivo selecionado
  const renderSelectedFiles = () => {
    if (!files) return null;
    
    const fileList = [];
    for (let i = 0; i < files.length; i++) {
      fileList.push(
        <div key={`${files[i].name}-${i}`} className="flex items-center justify-between bg-gray-50 p-2 rounded-md text-xs mb-1.5">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="truncate">{files[i].name}</span>
            <span className="text-gray-400 text-xs">({(files[i].size / 1024).toFixed(0)} KB)</span>
          </div>
        </div>
      );
    }
    return <div className="mt-3">{fileList}</div>;
  };

  // Exibir arquivos existentes que podem ser visualizados/baixados
  const renderExistingFiles = () => {
    if (!existingFiles || existingFiles.length === 0) return null;
    
    return (
      <div className="mt-3">
        <p className="text-xs font-medium mb-2 text-gray-500">Arquivos disponíveis:</p>
        {existingFiles.map((file, index) => (
          <div key={index} className="flex items-center justify-between bg-blue-50 p-2 rounded-md text-xs mb-1.5">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="truncate">{file.name}</span>
            </div>
            <div className="flex items-center gap-1">
              {onFileView && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 px-2 text-primary"
                  onClick={() => onFileView(file.url)}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={className}>
      <div
        className={cn(
          "border-2 border-dashed rounded-md p-4 transition-colors cursor-pointer",
          isDragging ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400",
          isUploading ? "opacity-80 cursor-not-allowed" : ""
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="space-y-1 text-center">
          <Upload className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
          <div className="flex flex-col sm:flex-row text-xs sm:text-sm text-gray-600 justify-center items-center">
            <span className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary">
              {isUploading ? 'Enviando arquivo...' : `Fazer upload de arquivo${required ? '*' : ''}`}
            </span>
            {!isUploading && <p className="sm:pl-1 mt-1 sm:mt-0">ou arraste e solte</p>}
          </div>
          <p className="text-xs text-gray-500">{helpText}</p>
          {files && files.length > 0 && !isUploading && (
            <div className="mt-2">
              <p className="text-xs sm:text-sm text-primary">
                {files.length} {files.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
              </p>
            </div>
          )}
          
          {isUploading && (
            <div className="mt-3">
              <div className="flex items-center justify-center mb-1">
                <Loader2 className="h-4 w-4 text-primary animate-spin mr-2" />
                <span className="text-xs text-primary">Enviando arquivos...</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5 w-4/5 mx-auto" />
              <p className="text-xs text-gray-500 mt-1">{uploadProgress}% concluído</p>
            </div>
          )}
        </div>
      </div>
      
      {renderSelectedFiles()}
      {renderExistingFiles()}
      
      {showAddMoreButton && files && files.length > 0 && !isUploading && (
        <div className="mt-2 flex justify-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAddMore}
            type="button"
            className="flex items-center gap-1 text-xs"
            disabled={isUploading}
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
        disabled={isUploading}
      />
    </div>
  );
};

export default FileUpload;

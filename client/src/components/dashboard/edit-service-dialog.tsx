import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PencilIcon, FileText, Upload, Download, X, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface EditableServiceProps {
  id: number;
  title: string;
  description?: string;
  location: string;
  date: string;
  price: string;
  materialType?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled';
  projectFiles?: Array<{
    name: string;
    path: string;
  }>;
}

interface EditServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  service: EditableServiceProps;
}

export const EditServiceDialog: React.FC<EditServiceDialogProps> = ({
  isOpen,
  onClose,
  service
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedService, setEditedService] = useState({
    title: '',
    description: '',
    price: '',
    materialType: '',
    startDate: '',
    endDate: '',
  });
  const [dateError, setDateError] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<Array<{name: string, path: string}>>([]);
  const [newFiles, setNewFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState<string[]>([]);

  // Inicializar e reinicializar o formulário sempre que o serviço mudar
  useEffect(() => {
    // Resetar o estado do formulário com os dados do serviço
    setEditedService({
      title: service.title || '',
      description: service.description || '',
      price: service.price || '',
      materialType: service.materialType || '',
      startDate: '',
      endDate: '',
    });

    // Resetar arquivos do projeto
    setProjectFiles(service.projectFiles || []);
    
    // Resetar outros estados
    setNewFiles(null);
    setFilesToDelete([]);
    setDateError(null);

    // Extrair e formatar datas do período do serviço
    if (service.date && service.date.includes('-')) {
      const [startDateStr, endDateStr] = service.date.split('-').map((d: string) => d.trim());
      const startDate = formatDateForInput(startDateStr);
      const endDate = formatDateForInput(endDateStr);
      
      setEditedService(prev => ({
        ...prev,
        startDate,
        endDate
      }));
    } else if (service.date) {
      // Se há apenas uma data, usar como data de início
      const startDate = formatDateForInput(service.date);
      setEditedService(prev => ({
        ...prev,
        startDate,
        endDate: ''
      }));
    }
  }, [service]);

  // Função para formatar data de DD/MM/YYYY para YYYY-MM-DD (formato de input date)
  const formatDateForInput = (dateStr: string): string => {
    try {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateStr;
    } catch {
      return '';
    }
  };

  // Função para formatar data de YYYY-MM-DD para DD/MM/YYYY
  const formatDateForDisplay = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedService(prev => ({ ...prev, [name]: value }));
    
    // Verificar erros de data quando algum dos campos de data mudar
    if (name === 'startDate' || name === 'endDate') {
      validateDates(name === 'startDate' ? value : editedService.startDate, 
                   name === 'endDate' ? value : editedService.endDate);
    }
  };

  const validateDates = (startDate: string, endDate: string) => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        setDateError('A data de início não pode ser posterior à data de fim');
        return false;
      }
    }
    
    setDateError(null);
    return true;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permitir apenas números e formatar como moeda
    const value = e.target.value.replace(/\D/g, '');
    
    if (value) {
      // Formatar o valor para exibição como moeda
      const numericValue = parseInt(value, 10);
      const formattedValue = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
      }).format(numericValue / 100);
      
      setEditedService(prev => ({ ...prev, price: formattedValue }));
    } else {
      setEditedService(prev => ({ ...prev, price: '' }));
    }
  };
  
  // Gerenciamento de arquivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setNewFiles(e.target.files);
    }
  };
  
  const handleFileDelete = (filePath: string) => {
    // Marcar o arquivo para exclusão quando o formulário for enviado
    setFilesToDelete(prev => [...prev, filePath]);
    
    // Remover da lista de visualização
    setProjectFiles(prev => prev.filter(file => file.path !== filePath));
  };
  
  const handleUploadButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Função para extrair o valor numérico do preço formatado
  const extractNumericValue = (formattedPrice: string): number => {
    // Remover todos os caracteres não numéricos
    const numericString = formattedPrice.replace(/\D/g, '');
    // Converter para número
    return numericString ? parseInt(numericString, 10) / 100 : 0;
  };

  const handleSubmit = async () => {
    try {
      // Validar datas
      if (!validateDates(editedService.startDate, editedService.endDate)) {
        return;
      }
      
      // Verificar campos obrigatórios
      const missingFields = [];
      
      if (!editedService.title || !editedService.title.trim()) missingFields.push("Título");
      if (!editedService.description || !editedService.description.trim()) missingFields.push("Descrição");
      if (!editedService.price) missingFields.push("Valor");
      if (!editedService.materialType || !editedService.materialType.trim()) missingFields.push("Material");
      if (!editedService.startDate) missingFields.push("Data de Início");
      if (!editedService.endDate) missingFields.push("Data de Fim");
      
      // Verificar se há pelo menos um arquivo (existente ou novo)
      if (projectFiles.length === 0 && (!newFiles || newFiles.length === 0)) {
        missingFields.push("Arquivo PDF");
      }
      
      if (missingFields.length > 0) {
        toast({
          title: "Campos obrigatórios não preenchidos",
          description: `Por favor, preencha os seguintes campos: ${missingFields.join(", ")}.`,
          variant: "destructive"
        });
        return;
      }

      setIsSubmitting(true);
      
      // Formatar as datas para exibição
      const formattedStartDate = formatDateForDisplay(editedService.startDate);
      const formattedEndDate = formatDateForDisplay(editedService.endDate);
      
      // Preparar dados para envio
      const serviceData = {
        title: editedService.title,
        description: editedService.description,
        date: `${formattedStartDate} - ${formattedEndDate}`,
        price: extractNumericValue(editedService.price),
        materialType: editedService.materialType,
        filesToDelete: filesToDelete
      };
      
      let response;
      
      // Se temos novos arquivos, enviamos com FormData
      if (newFiles && newFiles.length > 0) {
        // Criar form data para envio de arquivos
        const formData = new FormData();
        
        // Adicionar dados do serviço
        formData.append('title', editedService.title);
        formData.append('description', editedService.description || '');
        formData.append('date', `${formattedStartDate} - ${formattedEndDate}`);
        formData.append('price', extractNumericValue(editedService.price).toString());
        formData.append('materialType', editedService.materialType || '');
        
        // Adicionar lista de arquivos para excluir
        if (filesToDelete.length > 0) {
          formData.append('filesToDelete', JSON.stringify(filesToDelete));
        }
        
        // Adicionar novos arquivos
        for (let i = 0; i < newFiles.length; i++) {
          formData.append('files', newFiles[i]);
        }
        
        // Enviar dados com arquivos
        response = await fetch(`/api/services/${service.id}/update-with-files`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao atualizar serviço');
        }
      } else {
        // Sem novos arquivos, usar API request normal
        response = await apiRequest({
          method: 'PATCH',
          url: `/api/services/${service.id}`,
          data: serviceData
        });
      }
      
      // Atualizar os dados em cache
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      
      toast({
        title: "Serviço atualizado",
        description: "As informações do serviço foram atualizadas com sucesso!"
      });
      
      // Fechar o diálogo
      onClose();
    } catch (error: any) {
      console.error("Erro ao atualizar serviço:", error);
      toast({
        title: "Erro ao atualizar serviço",
        description: error.response?.data?.message || error.message || "Ocorreu um erro ao atualizar o serviço.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Serviço</DialogTitle>
          <DialogDescription>
            Edite as informações do serviço e gerencie os arquivos anexados.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-sm font-medium">Título *</Label>
            <Input 
              id="title" 
              name="title" 
              placeholder="Ex: Montagem de armário de cozinha" 
              value={editedService.title}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description" className="text-sm font-medium">Descrição *</Label>
            <Textarea 
              id="description"
              name="description"
              placeholder="Descreva detalhes do serviço, móveis a serem montados, etc." 
              rows={3}
              value={editedService.description}
              onChange={handleInputChange}
              className="w-full resize-y min-h-[5rem]"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate" className="text-sm font-medium">Data de Início *</Label>
              <Input 
                id="startDate" 
                name="startDate" 
                type="date"
                value={editedService.startDate}
                onChange={handleInputChange}
                className="w-full"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="endDate" className="text-sm font-medium">Data de Fim *</Label>
              <Input 
                id="endDate" 
                name="endDate" 
                type="date"
                value={editedService.endDate}
                onChange={handleInputChange}
                className="w-full"
              />
            </div>
            {dateError && <p className="text-xs text-red-500 col-span-1 sm:col-span-2">{dateError}</p>}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price" className="text-sm font-medium">Valor *</Label>
              <Input
                id="price"
                name="price"
                placeholder="Ex: R$ 0,00"
                value={editedService.price}
                onChange={handlePriceChange}
                className="w-full"
                inputMode="numeric"
              />
              <p className="text-xs text-gray-500">Digite apenas números (sem pontos ou vírgulas)</p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="materialType" className="text-sm font-medium">Material *</Label>
              <Input 
                id="materialType" 
                name="materialType" 
                placeholder="Ex: MDF, Madeira Maciça" 
                value={editedService.materialType}
                onChange={handleInputChange}
                className="w-full"
              />
            </div>
          </div>
          
          {/* Seção de gerenciamento de arquivos */}
          <div className="mt-2">
            <Label className="text-sm font-medium">Arquivos do Projeto *</Label>
            
            {/* Arquivos existentes */}
            {projectFiles.length > 0 ? (
              <div className="space-y-2 max-h-[180px] overflow-y-auto p-1 mt-2 border rounded-md bg-gray-50">
                {projectFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2.5 border rounded-md bg-white">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <a 
                        href={file.path} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        title="Visualizar PDF"
                      >
                        <FileText className="h-4 w-4 text-gray-600" />
                      </a>
                      <a 
                        href={file.path} 
                        download
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        title="Baixar PDF"
                      >
                        <Download className="h-4 w-4 text-gray-600" />
                      </a>
                      <button
                        onClick={() => handleFileDelete(file.path)}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-full transition-colors"
                        title="Excluir PDF"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic mt-2">Nenhum arquivo disponível para este serviço.</p>
            )}
            
            {/* Upload de novos arquivos */}
            <div className="mt-4">
              <Label htmlFor="file-upload" className="text-sm font-medium">Adicionar Novos Arquivos</Label>
              <div className="mt-2">
                <input
                  type="file"
                  id="file-upload"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf"
                  multiple
                  className="sr-only"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUploadButtonClick}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Selecionar Arquivos PDF
                </Button>
                {newFiles && newFiles.length > 0 && (
                  <div className="mt-2 p-2 bg-gray-50 border rounded-md">
                    <p className="text-sm font-medium">Arquivos selecionados:</p>
                    <ul className="mt-1 space-y-1">
                      {Array.from(newFiles).map((file, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-center">
                          <FileText className="h-4 w-4 mr-1.5 text-primary" />
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !!dateError}
            className="bg-primary hover:bg-opacity-90 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <PencilIcon className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditServiceDialog;
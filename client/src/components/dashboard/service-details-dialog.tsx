import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Download, Clock, MapPin, Building, CalendarIcon, DollarSign } from 'lucide-react';
import type { ServiceProps } from './available-service-card';

interface ServiceDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceProps;
  onApply: () => void;
  isApplying: boolean;
}

export const ServiceDetailsDialog: React.FC<ServiceDetailsDialogProps> = ({
  isOpen,
  onClose,
  service,
  onApply,
  isApplying
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Detalhes do Serviço</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* Título e informações básicas */}
          <div>
            <h3 className="text-lg font-semibold">{service.title}</h3>
            
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="flex items-center text-sm text-gray-600">
                <Building className="h-4 w-4 mr-1.5 text-primary" />
                <span>{service.store}</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <DollarSign className="h-4 w-4 mr-1.5 text-primary" />
                <span>{service.price}</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="h-4 w-4 mr-1.5 text-primary" />
                <span>{service.location} ({service.distance})</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <CalendarIcon className="h-4 w-4 mr-1.5 text-primary" />
                <span>{service.date}</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1.5 text-primary" />
                <span>{service.type}</span>
              </div>
            </div>
          </div>
          
          {/* Descrição do serviço, se disponível */}
          {service.description && (
            <div className="mt-3">
              <h4 className="text-sm font-medium mb-1">Descrição:</h4>
              <p className="text-sm text-gray-600">{service.description}</p>
            </div>
          )}
          
          {/* Lista de arquivos do projeto */}
          <div className="mt-3">
            <h4 className="text-sm font-medium mb-2">Arquivos do Projeto:</h4>
            
            {service.projectFiles && service.projectFiles.length > 0 ? (
              <div className="space-y-2 max-h-52 overflow-y-auto p-1">
                {service.projectFiles.map((file: {name: string, path: string}, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2.5 border rounded-md bg-gray-50">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <a 
                        href={file.path} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                        title="Visualizar PDF"
                      >
                        <FileText className="h-4 w-4 text-gray-600" />
                      </a>
                      <a 
                        href={file.path} 
                        download
                        className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                        title="Baixar PDF"
                      >
                        <Download className="h-4 w-4 text-gray-600" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Nenhum arquivo disponível para este serviço.</p>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button
            onClick={onApply}
            disabled={isApplying}
            className="bg-primary hover:bg-opacity-90 text-white"
          >
            {isApplying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Confirmar Candidatura'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
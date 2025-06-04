import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  FileText,
  Download,
  Clock,
  MapPin,
  Building,
  CalendarIcon,
  DollarSign,
  Eye,
  ExternalLink,
  CheckCircle,
  X,
} from "lucide-react";
import ApplicationStatusIndicator from "@/components/ui/application-status-indicator";
import type { ServiceProps } from "./available-service-card";

interface ServiceDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceProps;
  onApply: () => void;
  isApplying: boolean;
  hasApplied?: boolean;
  applicationStatus?: string;
  localApplicationStatus?: string | null;
  localHasApplied?: boolean;
}

export const ServiceDetailsDialog: React.FC<ServiceDetailsDialogProps> = ({
  isOpen,
  onClose,
  service,
  onApply,
  isApplying,
  hasApplied = false,
  applicationStatus = '',
  localApplicationStatus = null,
  localHasApplied = false,
}) => {
  // Usar status da candidatura diretamente do serviço se disponível
  const serviceHasApplied = service.hasApplied || hasApplied || localHasApplied;
  const serviceApplicationStatus = localApplicationStatus || service.applicationStatus || applicationStatus;
  const isPendingApproval = serviceApplicationStatus === 'pending';
  const isAccepted = serviceApplicationStatus === 'accepted';
  const isRejected = serviceApplicationStatus === 'rejected';
  
  // Determine status for ApplicationStatusIndicator
  const getApplicationStatus = () => {
    if (isAccepted) return 'accepted';
    if (isRejected) return 'rejected';
    if (isPendingApproval || serviceHasApplied) return 'pending';
    return 'not_applied';
  };
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    path: string;
  } | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);

  // Função para formatar o preço corretamente
  const formatPrice = (price: string): string => {
    // Remove caracteres não numéricos e converte para número
    const numericPrice = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.'));
    
    // Se o valor for inválido, retorna o valor original
    if (isNaN(numericPrice)) {
      return price;
    }
    
    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericPrice);
  };

  const handleViewPdf = (file: { name: string; path: string }) => {
    setSelectedFile(file);
    setIsPdfViewerOpen(true);
  };

  const closePdfViewer = () => {
    setIsPdfViewerOpen(false);
    setSelectedFile(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-lg lg:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-responsive-lg">Detalhes do Serviço</DialogTitle>
          <DialogDescription className="text-responsive-sm text-gray-600">
            Visualize todas as informações do serviço, incluindo datas, arquivos
            e detalhes do projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Título e informações básicas */}
          <div>
            <h3 className="text-lg font-semibold">{service.title}</h3>
            
            {/* Status da candidatura */}
            <div className="mt-3">
              <ApplicationStatusIndicator 
                status={getApplicationStatus()}
                size="md"
                showText={true}
              />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="flex items-center text-sm text-gray-600">
                <Building className="h-4 w-4 mr-1.5 text-primary" />
                <span>{service.store}</span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <DollarSign className="h-4 w-4 mr-1.5 text-primary" />
                <span>{formatPrice(service.price)}</span>
              </div>

              <div className="flex items-start text-sm text-gray-600 col-span-2">
                <MapPin className="h-4 w-4 mr-1.5 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium">{service.location}</div>
                  {service.address && service.addressNumber && (
                    <div className="text-xs text-gray-500 mt-1">
                      {service.address}, {service.addressNumber}
                      {service.cep && ` - CEP: ${service.cep}`}
                    </div>
                  )}
                  <div className="text-xs text-blue-600 mt-1">
                    📍 {service.distance}
                  </div>
                </div>
              </div>

              {/* Data do serviço - seção destacada e responsiva */}
              <div className="col-span-2 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-3 sm:p-4 mt-3">
                <div className="flex items-center mb-3">
                  <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-green-700 uppercase tracking-wide">
                    Período do Serviço
                  </span>
                </div>

                {/* Exibir datas de início e fim do serviço */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="bg-white border border-green-300 rounded-md p-2 sm:p-3 shadow-sm">
                    <div className="text-xs text-green-600 font-medium mb-1">
                      🚀 INÍCIO DO SERVIÇO
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-green-700">
                      {(() => {
                        try {
                          // Verificar se existe startDate
                          const startDateValue = service.startDate;
                          if (!startDateValue) {
                            return "Data não informada";
                          }
                          
                          const date = new Date(startDateValue);
                          
                          // Verificar se a data é válida
                          if (isNaN(date.getTime())) {
                            return "Data inválida";
                          }
                          
                          return date.toLocaleDateString("pt-BR", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          });
                        } catch (error) {
                          console.error('Erro ao formatar startDate:', error);
                          return "Erro na data";
                        }
                      })()}
                    </div>
                  </div>
                  <div className="bg-white border border-blue-300 rounded-md p-2 sm:p-3 shadow-sm">
                    <div className="text-xs text-blue-600 font-medium mb-1">
                      🏁 TÉRMINO PREVISTO
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-blue-700">
                      {(() => {
                        try {
                          // Verificar se existe endDate
                          const endDateValue = service.endDate;
                          if (!endDateValue) {
                            return "Data não informada";
                          }
                          
                          const date = new Date(endDateValue);
                          
                          // Verificar se a data é válida
                          if (isNaN(date.getTime())) {
                            return "Data inválida";
                          }
                          
                          return date.toLocaleDateString("pt-BR", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          });
                        } catch (error) {
                          console.error('Erro ao formatar endDate:', error);
                          return "Erro na data";
                        }
                      })()}
                    </div>
                  </div>
                </div>
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
                {service.projectFiles.map(
                  (file: { name: string; path: string }, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-gray-50 hover:from-blue-100 hover:to-gray-100 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900 block truncate">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            PDF • Anexado pelo lojista
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPdf(file)}
                          className="p-2 hover:bg-blue-100 rounded-full transition-colors"
                          title="Visualizar PDF"
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="p-2 hover:bg-green-100 rounded-full transition-colors"
                          title="Baixar PDF"
                        >
                          <a href={file.path} download>
                            <Download className="h-4 w-4 text-green-600" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          title="Abrir em nova aba"
                        >
                          <a
                            href={file.path}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 text-gray-600" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  Nenhum arquivo disponível para este serviço
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  O lojista não anexou documentos do projeto
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          
          {/* Mostrar status baseado na candidatura */}
          {serviceHasApplied ? (
            <div className="flex flex-col items-end gap-2">
              {isPendingApproval ? (
                <>
                  <div className="text-sm text-orange-600 font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Aguardando resposta do lojista
                  </div>
                  <div className="text-xs text-orange-600 font-medium bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
                    Sua candidatura foi enviada e está sendo analisada
                  </div>
                  <Button
                    disabled={true}
                    className="bg-orange-500 text-white cursor-not-allowed opacity-75"
                  >
                    Aguardando resposta do lojista
                  </Button>
                </>
              ) : isAccepted ? (
                <>
                  <div className="text-sm text-green-600 font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Candidatura aceita
                  </div>
                  <div className="text-xs text-green-600 font-medium bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                    Sua candidatura foi aceita pelo lojista
                  </div>
                  <Button
                    disabled={true}
                    className="bg-green-500 text-white cursor-not-allowed opacity-75"
                  >
                    Candidatura aceita
                  </Button>
                </>
              ) : isRejected ? (
                <>
                  <div className="text-sm text-red-600 font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Candidatura rejeitada
                  </div>
                  <div className="text-xs text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                    Sua candidatura foi rejeitada pelo lojista
                  </div>
                  <Button
                    disabled={true}
                    className="bg-red-500 text-white cursor-not-allowed opacity-75"
                  >
                    Candidatura rejeitada
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-sm text-blue-600 font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Você já se candidatou
                  </div>
                  <div className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                    Sua candidatura foi enviada. Aguarde a resposta do lojista.
                  </div>
                  <Button
                    disabled={true}
                    className="bg-blue-500 text-white cursor-not-allowed opacity-75"
                  >
                    Você já se candidatou
                  </Button>
                </>
              )}
            </div>
          ) : (
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
                "Confirmar Candidatura"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Visualizador de PDF */}
      <Dialog open={isPdfViewerOpen} onOpenChange={closePdfViewer}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {selectedFile?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {selectedFile && (
              <div className="h-[70vh] w-full border rounded-lg overflow-hidden bg-gray-100">
                <iframe
                  src={selectedFile.path}
                  className="w-full h-full border-0"
                  title={`Visualizar PDF: ${selectedFile.name}`}
                  loading="lazy"
                />
              </div>
            )}
          </div>

          <DialogFooter className="p-4 pt-2 flex justify-between sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              <span>PDF anexado pelo lojista</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={selectedFile?.path}
                  download
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={selectedFile?.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir em nova aba
                </a>
              </Button>
              <Button variant="default" onClick={closePdfViewer}>
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

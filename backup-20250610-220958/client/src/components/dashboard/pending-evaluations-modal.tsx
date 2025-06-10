import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Star, Clock, AlertTriangle } from 'lucide-react';
import { RatingDialog } from '@/components/rating/rating-dialog';

interface PendingService {
  id: number;
  title: string;
  completedAt: string;
}

interface PendingEvaluationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllEvaluationsComplete?: () => void;
}

export const PendingEvaluationsModal: React.FC<PendingEvaluationsModalProps> = ({
  open,
  onOpenChange,
  onAllEvaluationsComplete
}) => {
  const queryClient = useQueryClient();
  const [selectedService, setSelectedService] = useState<PendingService | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);

  // Buscar avaliações pendentes
  const { data: pendingData, refetch } = useQuery({
    queryKey: ['/api/services/pending-evaluations'],
    enabled: open,
  });

  const hasPendingEvaluations = pendingData?.hasPendingEvaluations || false;
  const pendingServices = pendingData?.pendingServices || [];

  // Fechar modal automaticamente quando não há mais avaliações pendentes
  useEffect(() => {
    if (open && !hasPendingEvaluations && pendingServices.length === 0) {
      onOpenChange(false);
      if (onAllEvaluationsComplete) {
        onAllEvaluationsComplete();
      }
    }
  }, [hasPendingEvaluations, pendingServices.length, open, onOpenChange, onAllEvaluationsComplete]);

  const handleEvaluateService = (service: PendingService) => {
    setSelectedService(service);
    setShowRatingDialog(true);
  };

  const handleRatingComplete = () => {
    setShowRatingDialog(false);
    setSelectedService(null);
    // Atualizar lista de avaliações pendentes
    refetch();
    // Invalidar outras queries relacionadas
    queryClient.invalidateQueries({ queryKey: ['/api/services'] });
  };

  return (
    <>
      <Dialog 
        open={open && !showRatingDialog} 
        onOpenChange={(value) => {
          // Impedir fechamento se há avaliações pendentes
          if (!value && hasPendingEvaluations) {
            return;
          }
          onOpenChange(value);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
              Avaliações Obrigatórias
            </DialogTitle>
            <DialogDescription>
              Você possui serviços que precisam ser avaliados para continuar usando o aplicativo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                <strong>Atenção:</strong> É obrigatório avaliar todos os serviços concluídos antes de continuar.
              </AlertDescription>
            </Alert>

            {pendingServices.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">
                  Serviços aguardando avaliação ({pendingServices.length}):
                </h4>
                
                {pendingServices.map((service: PendingService) => (
                  <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{service.title}</h5>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        Concluído em {new Date(service.completedAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleEvaluateService(service)}
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Avaliar
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {pendingServices.length === 0 && hasPendingEvaluations && (
              <div className="text-center py-4">
                <p className="text-gray-500">Carregando avaliações pendentes...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Avaliação */}
      {selectedService && (
        <RatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          serviceId={selectedService.id}
          toUserId={0} // Será determinado pelo backend
          toUserName="Participante do Serviço"
          serviceName={selectedService.title}
          onSuccess={handleRatingComplete}
        />
      )}
    </>
  );
};
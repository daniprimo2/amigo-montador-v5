import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

interface PendingRating {
  serviceId: number;
  serviceName: string;
  otherUserName: string;
  userType: 'montador' | 'lojista';
}

interface PendingRatingsResponse {
  pendingRatings: PendingRating[];
  hasPendingRatings: boolean;
}

export const useMandatoryRatings = () => {
  const [currentRatingIndex, setCurrentRatingIndex] = useState(0);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery<PendingRatingsResponse>({
    queryKey: ['/api/mandatory-ratings'],
    enabled: true, // Habilitar para aplicar avaliações obrigatórias
    retry: 1, // Tentar uma vez em caso de erro
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Verificar a cada 30 segundos
  });

  const pendingRatings = data?.pendingRatings || [];
  const hasPendingRatings = data?.hasPendingRatings || false;
  const currentRating = pendingRatings[currentRatingIndex];

  // Abrir automaticamente o diálogo quando há avaliações pendentes
  useEffect(() => {
    if (hasPendingRatings && !isRatingDialogOpen) {
      setIsRatingDialogOpen(true);
    }
  }, [hasPendingRatings, isRatingDialogOpen]);

  const handleRatingCompleted = () => {
    const nextIndex = currentRatingIndex + 1;
    
    if (nextIndex < pendingRatings.length) {
      // Ir para próxima avaliação
      setCurrentRatingIndex(nextIndex);
    } else {
      // Todas as avaliações foram completadas
      setIsRatingDialogOpen(false);
      setCurrentRatingIndex(0);
      refetch(); // Recarregar dados
    }
  };

  const closeMandatoryRating = () => {
    setIsRatingDialogOpen(false);
  };

  return {
    pendingRatings,
    hasPendingRatings,
    currentRating,
    isRatingDialogOpen,
    isLoading,
    handleRatingCompleted,
    closeMandatoryRating,
    refetch,
  };
};
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RatingStars } from './rating-stars';

interface Rating {
  id: number;
  serviceId: number;
  fromUserId: number;
  toUserId: number;
  rating: number;
  comment?: string;
  createdAt: string;
  fromUser?: {
    name: string;
    userType: string;
  };
  toUser?: {
    name: string;
    userType: string;
  };
}

interface RatingListProps {
  serviceId: number;
}

export const RatingList: React.FC<RatingListProps> = ({ serviceId }) => {
  const { data: ratings, isLoading, error } = useQuery<Rating[]>({
    queryKey: [`/api/services/${serviceId}/ratings`],
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Erro ao carregar avaliações. Por favor, tente novamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!ratings || ratings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Ainda não há avaliações para este serviço.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  };

  return (
    <div className="space-y-4">
      {ratings.map((rating) => (
        <Card key={rating.id}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-sm font-medium">
                  {rating.fromUser?.name || 'Usuário'} avaliou {rating.toUser?.name || 'Usuário'}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {formatDate(rating.createdAt)}
                </p>
              </div>
              <RatingStars rating={rating.rating} size="sm" />
            </div>
          </CardHeader>
          {rating.comment && (
            <CardContent className="pt-0">
              <p className="text-sm">{rating.comment}</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
};
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Trophy, Star, MapPin, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RatingStars } from '@/components/rating/rating-stars';

interface RankingItem {
  id: number;
  name: string;
  city: string;
  state: string;
  rating: number;
  userType: 'lojista' | 'montador';
  logoUrl?: string;
  specialties?: string[];
}

interface RankingResponse {
  type: string;
  ranking: RankingItem[];
}

export const RankingSection: React.FC = () => {
  const [selectedType, setSelectedType] = useState<'lojista' | 'montador'>('montador');
  const [, setLocation] = useLocation();

  const { data: rankingData, isLoading } = useQuery<RankingResponse>({
    queryKey: ['/api/ranking', selectedType],
    queryFn: async () => {
      const response = await fetch(`/api/ranking?type=${selectedType}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar ranking');
      }
      return response.json();
    }
  });

  const ranking = rankingData?.ranking || [];

  const handleUserClick = (userId: number) => {
    setLocation(`/profile/${userId}`);
  };

  const getRankingIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Award className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-600">#{position}</span>;
    }
  };

  const getRankingBadgeColor = (position: number) => {
    switch (position) {
      case 1:
        return "bg-yellow-500 text-white";
      case 2:
        return "bg-gray-400 text-white";
      case 3:
        return "bg-amber-600 text-white";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span>Ranking de Avaliações</span>
        </CardTitle>
        <div className="flex space-x-2">
          <Button
            variant={selectedType === 'montador' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('montador')}
          >
            Top Montadores
          </Button>
          <Button
            variant={selectedType === 'lojista' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('lojista')}
          >
            Top Lojistas
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              Ainda não há avaliações suficientes para criar um ranking de {selectedType === 'montador' ? 'montadores' : 'lojistas'}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ranking.map((item, index) => {
              const position = index + 1;
              return (
                <div
                  key={item.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border ${
                    position <= 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-center w-10 h-10">
                    <Badge className={getRankingBadgeColor(position)}>
                      {position <= 3 ? getRankingIcon(position) : `#${position}`}
                    </Badge>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 
                        className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors duration-200"
                        onClick={() => handleUserClick(item.id)}
                      >
                        {item.name}
                      </h4>
                      {position === 1 && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          Campeão
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-3 w-3 mr-1" />
                        {item.city}, {item.state}
                      </div>
                      
                      {selectedType === 'montador' && item.specialties && item.specialties.length > 0 && (
                        <div className="flex items-center space-x-1">
                          {item.specialties.slice(0, 2).map((specialty, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                          {item.specialties.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.specialties.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RatingStars rating={item.rating} size="sm" />
                    <span className="text-sm font-medium text-gray-700">
                      {item.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
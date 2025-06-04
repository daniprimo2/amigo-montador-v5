import React from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Star, MapPin, Calendar, Award, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RatingStars } from '@/components/rating/rating-stars';

interface UserProfile {
  id: number;
  name: string;
  userType: 'lojista' | 'montador';
  profilePhotoUrl?: string;
  city?: string;
  state?: string;
  specialties?: string[];
  averageRating: number;
  totalRatings: number;
  ratings: DetailedRating[];
}

interface DetailedRating {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  fromUserName: string;
  fromUserType: 'lojista' | 'montador';
  punctualityRating: number;
  qualityRating: number;
  complianceRating: number;
  serviceRegion: string;
  isLatest: boolean;
  emojiRating: string;
}

export default function UserProfilePage() {
  const { userId } = useParams();

  const { data: userProfile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['/api/users', userId, 'profile'],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/profile`);
      if (!response.ok) {
        throw new Error('Usuário não encontrado');
      }
      return response.json();
    },
    enabled: !!userId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-6">
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-12 w-64" />
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="md:col-span-2 space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-3 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <Award className="h-16 w-16 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Usuário não encontrado
            </h2>
            <p className="text-gray-600 mb-4">
              O perfil que você está procurando não existe ou foi removido.
            </p>
            <Button onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latestRating = userProfile.ratings.find(r => r.isLatest);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Ranking
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900">
            Perfil de {userProfile.userType === 'montador' ? 'Montador' : 'Lojista'}
          </h1>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Summary */}
          <Card className="md:col-span-1">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="relative mx-auto w-20 h-20 mb-4">
                  <img
                    src={userProfile.profilePhotoUrl || '/default-avatar.svg'}
                    alt={userProfile.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {userProfile.name}
                </h2>
                
                <Badge variant="secondary" className="mb-4">
                  {userProfile.userType === 'montador' ? 'Montador' : 'Lojista'}
                </Badge>
                
                {userProfile.city && userProfile.state && (
                  <div className="flex items-center justify-center text-sm text-gray-600 mb-4">
                    <MapPin className="h-4 w-4 mr-1" />
                    {userProfile.city}, {userProfile.state}
                  </div>
                )}
                
                <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-center mb-2">
                    <RatingStars rating={userProfile.averageRating} size="lg" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-600 text-center">
                    {userProfile.averageRating.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600 text-center">
                    {userProfile.totalRatings} avaliações
                  </div>
                </div>
                
                {userProfile.specialties && userProfile.specialties.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Especialidades</h3>
                    <div className="flex flex-wrap gap-2">
                      {userProfile.specialties.map((specialty, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Latest Service Highlight */}
          <div className="md:col-span-2 space-y-6">
            {latestRating && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-yellow-800">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Último Serviço Avaliado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium mb-2">
                          "{latestRating.comment}"
                        </p>
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(latestRating.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-1" />
                          {latestRating.serviceRegion}
                        </div>
                      </div>
                      <div className="text-right">
                        <RatingStars rating={latestRating.rating} size="sm" />
                        <div className="text-lg font-bold text-yellow-600">
                          {latestRating.rating}.0
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-yellow-200">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">Pontualidade</div>
                        <div className="flex items-center justify-center mt-1">
                          <RatingStars rating={latestRating.punctualityRating} size="xs" />
                          <span className="ml-2 text-sm font-semibold">{latestRating.punctualityRating}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">Qualidade</div>
                        <div className="flex items-center justify-center mt-1">
                          <RatingStars rating={latestRating.qualityRating} size="xs" />
                          <span className="ml-2 text-sm font-semibold">{latestRating.qualityRating}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700">Cumprimento</div>
                        <div className="flex items-center justify-center mt-1">
                          <RatingStars rating={latestRating.complianceRating} size="xs" />
                          <span className="ml-2 text-sm font-semibold">{latestRating.complianceRating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Ratings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-500" />
                  Todas as Avaliações ({userProfile.totalRatings})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userProfile.ratings.length === 0 ? (
                    <div className="text-center py-8">
                      <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Ainda não há avaliações para este usuário.</p>
                    </div>
                  ) : (
                    userProfile.ratings.map((rating) => (
                      <div key={rating.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-gray-900">
                                {rating.fromUserName}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {rating.fromUserType === 'montador' ? 'Montador' : 'Lojista'}
                              </Badge>
                              {rating.isLatest && (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                  Mais Recente
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-700 mb-2">"{rating.comment}"</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(rating.createdAt).toLocaleDateString('pt-BR')}
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {rating.serviceRegion}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <RatingStars rating={rating.rating} size="sm" />
                            <div className="text-lg font-bold text-gray-900">
                              {rating.rating}.0
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-center">
                            <div className="text-xs font-medium text-gray-600 mb-1">Pontualidade</div>
                            <div className="flex items-center justify-center">
                              <RatingStars rating={rating.punctualityRating} size="xs" />
                              <span className="ml-1 text-sm font-semibold">{rating.punctualityRating}</span>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs font-medium text-gray-600 mb-1">Qualidade</div>
                            <div className="flex items-center justify-center">
                              <RatingStars rating={rating.qualityRating} size="xs" />
                              <span className="ml-1 text-sm font-semibold">{rating.qualityRating}</span>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs font-medium text-gray-600 mb-1">Cumprimento</div>
                            <div className="flex items-center justify-center">
                              <RatingStars rating={rating.complianceRating} size="xs" />
                              <span className="ml-1 text-sm font-semibold">{rating.complianceRating}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
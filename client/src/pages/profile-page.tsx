import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Star, Phone, Mail, User, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RatingStars } from '@/components/rating/rating-stars';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  userType: string;
  profilePhotoUrl?: string;
  rating?: number;
  store?: {
    name: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    logoUrl?: string;
  };
  assembler?: {
    address: string;
    city: string;
    state: string;
    specialties: string[];
    experience: string;
    workRadius: number;
    rating: number;
    technicalAssistance: boolean;
    experienceYears: number;
    serviceTypes: string[];
    availability: {
      dias: string[];
      horarios: {
        inicio: string;
        fim: string;
      };
    };
    hasOwnTools: boolean;
    professionalDescription: string;
  };
}

const ProfilePage: React.FC = () => {
  const { userId } = useParams();
  const [, setLocation] = useLocation();

  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['/api/users', userId, 'profile'],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/profile`);
      if (!response.ok) {
        throw new Error('Erro ao buscar perfil do usuário');
      }
      return response.json();
    },
    enabled: !!userId
  });

  const handleGoBack = () => {
    window.history.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <Skeleton className="h-10 w-10 rounded mr-4" />
            <Skeleton className="h-8 w-48" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center">
                    <Skeleton className="h-32 w-32 rounded-full mb-4" />
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-24 mb-4" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-6 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Perfil não encontrado
              </h3>
              <p className="text-gray-500">
                Não foi possível carregar as informações do usuário.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const rating = profile.userType === 'montador' 
    ? (profile.assembler?.rating || 0)
    : (profile.rating || 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header com botão voltar */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Perfil de {profile.name}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card de informações básicas */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  {/* Foto de perfil */}
                  <div className="h-32 w-32 mb-4">
                    {profile.profilePhotoUrl ? (
                      <img 
                        src={profile.profilePhotoUrl} 
                        alt={`Foto de ${profile.name}`}
                        className="h-full w-full rounded-full object-cover border-4 border-gray-200"
                      />
                    ) : (
                      <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
                    {profile.name}
                  </h2>
                  
                  <Badge variant="secondary" className="mb-4">
                    {profile.userType === 'montador' ? 'Montador' : 'Lojista'}
                  </Badge>

                  {/* Avaliação */}
                  <div className="flex flex-col items-center">
                    <RatingStars rating={rating} size="lg" />
                    <span className="text-lg font-semibold text-gray-900 mt-2">
                      {rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {profile.userType === 'montador' ? 'Avaliação média' : 'Avaliação dos montadores'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card de informações detalhadas */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Informações de contato */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    Informações de Contato
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-3" />
                      <span>{profile.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-3" />
                      <span>{profile.phone}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Informações específicas para lojistas */}
              {profile.userType === 'lojista' && profile.store && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building2 className="h-5 w-5 mr-2" />
                      Informações da Loja
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-gray-900">Nome da Loja</h4>
                        <p className="text-gray-600">{profile.store.name}</p>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-3" />
                        <span>{profile.store.address}, {profile.store.city}, {profile.store.state}</span>
                      </div>
                      {profile.store.phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-3" />
                          <span>{profile.store.phone}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Informações específicas para montadores */}
              {profile.userType === 'montador' && profile.assembler && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <MapPin className="h-5 w-5 mr-2" />
                        Localização e Área de Atendimento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-3" />
                          <span>{profile.assembler.city}, {profile.assembler.state}</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">Raio de Atendimento</h4>
                          <p className="text-gray-600">{profile.assembler.workRadius} km</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Especialidades</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {profile.assembler.specialties.map((specialty, index) => (
                          <Badge key={index} variant="outline">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Experiência Profissional</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {profile.assembler.experienceYears && (
                          <div>
                            <h4 className="font-medium text-gray-900">Anos de Experiência</h4>
                            <p className="text-gray-600">{profile.assembler.experienceYears} anos</p>
                          </div>
                        )}
                        
                        {profile.assembler.professionalDescription && (
                          <div>
                            <h4 className="font-medium text-gray-900">Descrição Profissional</h4>
                            <p className="text-gray-600 whitespace-pre-wrap">
                              {profile.assembler.professionalDescription}
                            </p>
                          </div>
                        )}
                        
                        {profile.assembler.experience && (
                          <div>
                            <h4 className="font-medium text-gray-900">Experiência Detalhada</h4>
                            <p className="text-gray-600 whitespace-pre-wrap">
                              {profile.assembler.experience}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {profile.assembler.serviceTypes && profile.assembler.serviceTypes.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Tipos de Atendimento</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {profile.assembler.serviceTypes.map((type, index) => (
                            <Badge key={index} variant="secondary">
                              {type === 'residencial' ? 'Residencial' : 
                               type === 'corporativo' ? 'Corporativo' :
                               type === 'lojas_parceiras' ? 'Lojas Parceiras' : type}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {profile.assembler.availability && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Disponibilidade</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-gray-900">Dias da Semana</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {profile.assembler.availability.dias.map((dia, index) => (
                                <Badge key={index} variant="outline">
                                  {dia === 'seg' ? 'Segunda' :
                                   dia === 'ter' ? 'Terça' :
                                   dia === 'qua' ? 'Quarta' :
                                   dia === 'qui' ? 'Quinta' :
                                   dia === 'sex' ? 'Sexta' :
                                   dia === 'sab' ? 'Sábado' :
                                   dia === 'dom' ? 'Domingo' : dia}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          {profile.assembler.availability.horarios && (
                            <div>
                              <h4 className="font-medium text-gray-900">Horário de Trabalho</h4>
                              <p className="text-gray-600">
                                {profile.assembler.availability.horarios.inicio} às {profile.assembler.availability.horarios.fim}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Ferramentas e Recursos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center">
                        <Badge className={profile.assembler.hasOwnTools ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {profile.assembler.hasOwnTools ? 'Possui ferramentas próprias' : 'Não possui ferramentas próprias'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {profile.assembler.technicalAssistance && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <Badge className="bg-green-100 text-green-800">
                            Oferece Assistência Técnica
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
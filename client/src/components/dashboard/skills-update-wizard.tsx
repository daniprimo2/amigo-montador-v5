import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, MapPin, Wrench, Star, CheckCircle } from 'lucide-react';

const skillsUpdateSchema = z.object({
  specialties: z.array(z.string()).min(1, 'Selecione pelo menos uma especialidade'),
  experienceYears: z.number().min(0, 'Anos de experiência não pode ser negativo').max(50, 'Máximo 50 anos'),
  workRadius: z.number().min(1, 'Raio mínimo é 1km').max(200, 'Raio máximo é 200km'),
  hasOwnTools: z.boolean(),
  technicalAssistance: z.boolean(),
  professionalDescription: z.string().optional(),
  serviceTypes: z.array(z.string()).optional(),
});

type SkillsUpdateFormValues = z.infer<typeof skillsUpdateSchema>;

const AVAILABLE_SPECIALTIES = [
  { id: 'moveis-planejados', label: 'Móveis Planejados', icon: '🪑' },
  { id: 'armarios-cozinha', label: 'Armários de Cozinha', icon: '🏠' },
  { id: 'guarda-roupas', label: 'Guarda-roupas', icon: '👔' },
  { id: 'estantes-prateleiras', label: 'Estantes e Prateleiras', icon: '📚' },
  { id: 'mesa-cadeiras', label: 'Mesas e Cadeiras', icon: '🪑' },
  { id: 'camas-beliches', label: 'Camas e Beliches', icon: '🛏️' },
  { id: 'home-office', label: 'Home Office', icon: '💻' },
  { id: 'moveis-banheiro', label: 'Móveis de Banheiro', icon: '🚿' },
  { id: 'montagem-eletrodomesticos', label: 'Instalação de Eletrodomésticos', icon: '🔌' },
  { id: 'painel-tv', label: 'Painéis para TV', icon: '📺' },
  { id: 'closets', label: 'Closets', icon: '👗' },
  { id: 'moveis-comerciais', label: 'Móveis Comerciais', icon: '🏢' },
];

const SERVICE_TYPES = [
  { id: 'residencial', label: 'Residencial' },
  { id: 'corporativo', label: 'Corporativo' },
  { id: 'lojas_parceiras', label: 'Lojas Parceiras' },
];

const EXPERIENCE_LEVELS = [
  { min: 0, max: 1, label: 'Iniciante', description: 'Até 1 ano' },
  { min: 1, max: 3, label: 'Básico', description: '1-3 anos' },
  { min: 3, max: 7, label: 'Intermediário', description: '3-7 anos' },
  { min: 7, max: 15, label: 'Avançado', description: '7-15 anos' },
  { min: 15, max: 50, label: 'Especialista', description: '15+ anos' },
];

interface SkillsUpdateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SkillsUpdateWizard: React.FC<SkillsUpdateWizardProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SkillsUpdateFormValues>({
    resolver: zodResolver(skillsUpdateSchema),
    defaultValues: {
      specialties: [],
      experienceYears: 0,
      workRadius: 10,
      hasOwnTools: false,
      technicalAssistance: false,
      professionalDescription: '',
      serviceTypes: [],
    },
  });

  // Carregar dados do perfil atual
  useEffect(() => {
    if (open && user) {
      const fetchProfile = async () => {
        try {
          const response = await fetch('/api/profile');
          const data = await response.json();
          
          if (data.assembler) {
            setProfileData(data);
            form.reset({
              specialties: data.assembler.specialties || [],
              experienceYears: data.assembler.experienceYears || 0,
              workRadius: data.assembler.workRadius || 10,
              hasOwnTools: data.assembler.hasOwnTools || false,
              technicalAssistance: data.assembler.technicalAssistance || false,
              professionalDescription: data.assembler.professionalDescription || '',
              serviceTypes: data.assembler.serviceTypes || [],
            });
          }
        } catch (error) {
          console.error('Erro ao carregar perfil:', error);
        }
      };

      fetchProfile();
      setCurrentStep(1);
      setIsSuccess(false);
    }
  }, [open, user, form]);

  const onSubmit = async (data: SkillsUpdateFormValues) => {
    setIsLoading(true);
    try {
      await apiRequest(`/api/assemblers/${user?.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          specialties: data.specialties,
          experienceYears: data.experienceYears,
          workRadius: data.workRadius,
          hasOwnTools: data.hasOwnTools,
          technicalAssistance: data.technicalAssistance,
          professionalDescription: data.professionalDescription,
          serviceTypes: data.serviceTypes,
        }),
      });

      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      
      setIsSuccess(true);
      toast({
        title: 'Sucesso!',
        description: 'Suas habilidades profissionais foram atualizadas com sucesso.',
        variant: 'default',
      });
      
      // Fechar wizard após 2 segundos
      setTimeout(() => {
        onOpenChange(false);
        setIsSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao atualizar suas habilidades. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getExperienceLevel = (years: number) => {
    return EXPERIENCE_LEVELS.find(level => years >= level.min && years < level.max) || EXPERIENCE_LEVELS[0];
  };

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Habilidades Atualizadas!</h3>
            <p className="text-gray-600 mb-4">
              Suas informações profissionais foram atualizadas com sucesso.
            </p>
            <div className="text-sm text-gray-500">
              Fechando automaticamente...
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-blue-600" />
            Atualização Rápida de Habilidades
          </DialogTitle>
          <DialogDescription>
            Atualize suas habilidades profissionais em poucos passos simples
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step <= currentStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
                }
              `}>
                {step}
              </div>
              {step < 4 && (
                <div className={`
                  w-12 h-1 mx-2
                  ${step < currentStep ? 'bg-blue-600' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Passo 1: Especialidades */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Suas Especialidades
                  </CardTitle>
                  <CardDescription>
                    Selecione suas principais áreas de atuação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="specialties"
                    render={() => (
                      <FormItem>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {AVAILABLE_SPECIALTIES.map((specialty) => (
                            <FormField
                              key={specialty.id}
                              control={form.control}
                              name="specialties"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={specialty.id}
                                    className="flex flex-row items-center space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(specialty.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, specialty.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== specialty.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal flex items-center gap-2 cursor-pointer">
                                      <span>{specialty.icon}</span>
                                      <span className="text-sm">{specialty.label}</span>
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Passo 2: Experiência */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Experiência Profissional
                  </CardTitle>
                  <CardDescription>
                    Defina seu nível de experiência
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="experienceYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anos de Experiência: {field.value} anos</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <Slider
                              min={0}
                              max={25}
                              step={1}
                              value={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Iniciante</span>
                              <span>Especialista</span>
                            </div>
                            <div className="text-center">
                              <Badge variant="secondary" className="text-sm">
                                {getExperienceLevel(field.value).label}
                              </Badge>
                              <p className="text-sm text-gray-600 mt-1">
                                {getExperienceLevel(field.value).description}
                              </p>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="professionalDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição Profissional (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva brevemente sua experiência e principais projetos..."
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Passo 3: Área de Atendimento */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Área de Atendimento
                  </CardTitle>
                  <CardDescription>
                    Configure sua região de trabalho
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="workRadius"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Raio de Atendimento: {field.value} km</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <Slider
                              min={1}
                              max={100}
                              step={5}
                              value={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>1 km</span>
                              <span>100+ km</span>
                            </div>
                            <div className="text-center">
                              <Badge variant="outline" className="text-sm">
                                {field.value <= 10 ? 'Local' : 
                                 field.value <= 30 ? 'Regional' :
                                 field.value <= 60 ? 'Metropolitano' : 'Estadual'}
                              </Badge>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormLabel>Tipos de Atendimento</FormLabel>
                    {SERVICE_TYPES.map((type) => (
                      <FormField
                        key={type.id}
                        control={form.control}
                        name="serviceTypes"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={type.id}
                              className="flex flex-row items-center space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(type.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, type.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== type.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {type.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Passo 4: Recursos e Ferramentas */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recursos e Certificações</CardTitle>
                  <CardDescription>
                    Confirme seus recursos disponíveis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="hasOwnTools"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              Ferramentas Próprias
                            </FormLabel>
                            <div className="text-sm text-gray-600">
                              Possuo ferramentas necessárias para executar os serviços
                            </div>
                          </div>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="technicalAssistance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              Assistência Técnica
                            </FormLabel>
                            <div className="text-sm text-gray-600">
                              Ofereço suporte pós-instalação e garantia
                            </div>
                          </div>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Resumo das seleções */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-3">Resumo das Suas Habilidades</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Especialidades:</span>{' '}
                        {form.watch('specialties').length > 0 
                          ? form.watch('specialties').map(spec => 
                              AVAILABLE_SPECIALTIES.find(s => s.id === spec)?.label
                            ).join(', ')
                          : 'Nenhuma selecionada'
                        }
                      </div>
                      <div>
                        <span className="font-medium">Experiência:</span>{' '}
                        {form.watch('experienceYears')} anos ({getExperienceLevel(form.watch('experienceYears')).label})
                      </div>
                      <div>
                        <span className="font-medium">Raio de atendimento:</span>{' '}
                        {form.watch('workRadius')} km
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <DialogFooter className="flex justify-between">
              <div>
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Anterior
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                {currentStep < 4 ? (
                  <Button type="button" onClick={nextStep}>
                    Próximo
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Finalizar Atualização
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SkillsUpdateWizard;
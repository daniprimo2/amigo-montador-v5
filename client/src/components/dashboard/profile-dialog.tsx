import React, { useState, useEffect, useRef } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, Camera, Upload, Star, LogOut, Edit } from 'lucide-react';
import { BankAccountDialog } from '../banking/bank-account-dialog';
import { BankAccountSection } from '../banking/bank-account-section';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RatingStars } from '@/components/rating/rating-stars';

const userSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
});

const storeSchema = z.object({
  name: z.string().min(3, 'O nome da loja deve ter pelo menos 3 caracteres'),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  city: z.string().min(2, 'Cidade deve ter pelo menos 2 caracteres'),
  state: z.string().min(2, 'Estado deve ter pelo menos 2 caracteres'),
  phone: z.string().min(10, 'Telefone da loja inválido'),
});

const assemblerSchema = z.object({
  address: z.string().min(5, 'O endereço deve ter pelo menos 5 caracteres'),
  addressNumber: z.string().optional(),
  neighborhood: z.string().optional(),
  cep: z.string().optional(),
  city: z.string().min(2, 'A cidade deve ter pelo menos 2 caracteres'),
  state: z.string().min(2, 'O estado deve ter pelo menos 2 caracteres'),
  workRadius: z.number().min(1, 'O raio de atendimento deve ser pelo menos 1 km'),
  experienceYears: z.number().min(0, 'Anos de experiência não pode ser negativo'),
  professionalDescription: z.string().optional(),
  experience: z.string().optional(),
  specialties: z.array(z.string()).min(1, 'Selecione pelo menos uma especialidade'),
  serviceTypes: z.array(z.string()).optional(),
  hasOwnTools: z.boolean(),
  technicalAssistance: z.boolean(),
});

type UserFormValues = z.infer<typeof userSchema>;
type StoreFormValues = z.infer<typeof storeSchema>;
type AssemblerFormValues = z.infer<typeof assemblerSchema>;

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout?: () => void;
}

export const ProfileDialog: React.FC<ProfileDialogProps> = ({ 
  open, 
  onOpenChange,
  onLogout
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [activeTab, setActiveTab] = useState('dados-pessoais');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [profileData, setProfileData] = useState<any>(null);
  const [isEditingProfessional, setIsEditingProfessional] = useState(false);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Dados do usuário
  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });
  
  // Dados da loja (se for lojista)
  const storeForm = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      phone: '',
    },
  });

  // Dados do montador (se for montador)
  const assemblerForm = useForm<AssemblerFormValues>({
    resolver: zodResolver(assemblerSchema),
    defaultValues: {
      address: '',
      addressNumber: '',
      neighborhood: '',
      cep: '',
      city: '',
      state: '',
      workRadius: 20,
      experienceYears: 0,
      professionalDescription: '',
      experience: '',
      specialties: [],
      serviceTypes: [],
      hasOwnTools: false,
      technicalAssistance: false,
    },
  });

  // Função para buscar endereço por CEP
  const handleCepLookup = async (cep: string) => {
    if (cep.length !== 8) return;
    
    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        assemblerForm.setValue('address', data.logradouro || '');
        assemblerForm.setValue('neighborhood', data.bairro || '');
        assemblerForm.setValue('city', data.localidade || '');
        assemblerForm.setValue('state', data.uf || '');
        
        toast({
          title: 'CEP encontrado',
          description: 'Endereço preenchido automaticamente',
        });
      } else {
        toast({
          title: 'CEP não encontrado',
          description: 'Verifique o CEP e tente novamente',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao buscar CEP',
        description: 'Não foi possível buscar o endereço',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingCep(false);
    }
  };
  
  // Buscar dados do perfil ao abrir o diálogo
  useEffect(() => {
    if (open) {
      fetchProfileData();
    }
  }, [open]);
  
  // Buscar dados do perfil
  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/profile');
      
      if (!response.ok) {
        throw new Error('Falha ao buscar dados do perfil');
      }
      
      const data = await response.json();
      // Armazenar dados do perfil para uso no componente
      setProfileData(data);
      
      // Atualizar formulário de dados do usuário
      userForm.reset({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
      });
      
      // Verificar se existe foto de perfil
      if (data.profilePhotoUrl) {
        setProfilePhoto(data.profilePhotoUrl);
      } else {
        setProfilePhoto(null);
      }
      
      // Obter a avaliação tanto para montador quanto para lojista
      if (user?.userType === 'montador' && data.assembler) {
        setUserRating(data.assembler.rating || 0);
      } else if (user?.userType === 'lojista') {
        setUserRating(data.rating || 0);
      }
      
      // Se for lojista, atualizar formulário da loja e verificar logo
      if (user?.userType === 'lojista' && data.store) {
        storeForm.reset({
          name: data.store.name || '',
          address: data.store.address || '',
          city: data.store.city || '',
          state: data.store.state || '',
          phone: data.store.phone || '',
        });
        
        // Verificar se existe logo da loja
        if (data.store.logoUrl) {
          setLogoUrl(data.store.logoUrl);
        } else {
          setLogoUrl(null);
        }
      }
      
      // Se for montador, atualizar formulário do montador
      if (user?.userType === 'montador' && data.assembler) {
        assemblerForm.reset({
          address: data.assembler.address || '',
          addressNumber: data.assembler.addressNumber || '',
          neighborhood: data.assembler.neighborhood || '',
          cep: data.assembler.cep || '',
          city: data.assembler.city || '',
          state: data.assembler.state || '',
          workRadius: data.assembler.workRadius || 20,
          experienceYears: data.assembler.experienceYears || 0,
          professionalDescription: data.assembler.professionalDescription || '',
          experience: data.assembler.experience || '',
          specialties: data.assembler.specialties || [],
          serviceTypes: data.assembler.serviceTypes || [],
          hasOwnTools: data.assembler.hasOwnTools || false,
          technicalAssistance: data.assembler.technicalAssistance || false,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar dados do perfil:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao buscar os dados do perfil',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Salvar dados do usuário
  const onUserSubmit = async (data: UserFormValues) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: data,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar dados pessoais');
      }
      
      toast({
        title: 'Sucesso',
        description: 'Dados pessoais atualizados com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao atualizar os dados pessoais',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Abrir seletor de arquivo para foto de perfil
  const handlePhotoUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Abrir seletor de arquivo para logo da loja
  const handleLogoUploadClick = () => {
    logoFileInputRef.current?.click();
  };
  
  // Processar upload de foto
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>, uploadType = 'profile-photo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Verificar tipo e tamanho
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um arquivo de imagem válido',
        variant: 'destructive',
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: 'Erro',
        description: 'A imagem deve ter menos de 5MB',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('foto', file);
      
      // Usar o tipo de upload explícito passado para a função
      formData.append('type', uploadType);
      const isStoreLogoUpload = uploadType === 'store-logo';
      
      const response = await fetch('/api/profile/photo', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Falha ao enviar imagem');
      }
      
      const data = await response.json();
      
      if (isStoreLogoUpload) {
        setLogoUrl(data.photoUrl);
        toast({
          title: 'Sucesso',
          description: 'Logo da loja atualizado com sucesso!',
        });
      } else {
        setProfilePhoto(data.photoUrl);
        // Atualizar dados do perfil para refletir a mudança
        await fetchProfileData();
        // Invalidar cache do usuário para atualizar a foto em todos os componentes
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
        // Emitir evento para atualizar foto no header
        window.dispatchEvent(new CustomEvent('profile-photo-updated'));
        toast({
          title: 'Sucesso',
          description: 'Foto de perfil atualizada com sucesso!',
        });
      }
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      const errorMessage = uploadType === 'store-logo'
        ? 'Ocorreu um erro ao enviar o logo da loja' 
        : 'Ocorreu um erro ao enviar a foto de perfil';
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      // Limpar o input para permitir selecionar o mesmo arquivo novamente
      const inputRef = uploadType === 'store-logo' ? logoFileInputRef : fileInputRef;
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };
  
  // Salvar dados da loja
  const onStoreSubmit = async (data: StoreFormValues) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store: data,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar dados da loja');
      }
      
      toast({
        title: 'Sucesso',
        description: 'Dados da loja atualizados com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao atualizar dados da loja:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao atualizar os dados da loja',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Salvar dados do montador
  const onAssemblerSubmit = async (data: AssemblerFormValues) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assembler: data,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar dados profissionais');
      }
      
      // Recarregar dados do perfil
      await fetchProfileData();
      setIsEditingProfessional(false);
      
      toast({
        title: 'Sucesso',
        description: 'Dados profissionais atualizados com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao atualizar dados do montador:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao atualizar os dados profissionais',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Perfil do Usuário</DialogTitle>
          <DialogDescription>
            Visualize e edite suas informações pessoais
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs 
            defaultValue="dados-pessoais" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="mt-4"
          >
            <TabsList className={`grid w-full ${user?.userType === 'montador' ? 'grid-cols-3' : user?.userType === 'lojista' ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="dados-pessoais">Dados Pessoais</TabsTrigger>
              {user?.userType === 'lojista' && (
                <TabsTrigger value="dados-loja">Dados da Loja</TabsTrigger>
              )}
              {user?.userType === 'montador' && (
                <TabsTrigger value="dados-profissionais">Dados Profissionais</TabsTrigger>
              )}
              <TabsTrigger value="dados-bancarios">Dados Bancários</TabsTrigger>
            </TabsList>
            
            {/* Formulário de dados pessoais */}
            <TabsContent value="dados-pessoais" className="mt-4">
              {/* Seção de foto de perfil */}
              <div className="flex flex-col items-center justify-center mb-6 relative">
                <div className="h-32 w-32 rounded-full overflow-hidden bg-primary/10 mb-2 relative">
                  {profilePhoto ? (
                    <img 
                      src={profilePhoto} 
                      alt="Foto de perfil" 
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        // Não manipular innerHTML diretamente, deixar o fallback aparecer
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <User className="h-16 w-16 text-primary" />
                    </div>
                  )}
                  
                </div>
                
                <p className="text-sm text-gray-500 mb-2">Foto de perfil</p>
                
                {/* Exibir avaliação para montadores e lojistas */}
                {(user?.userType === 'montador' || user?.userType === 'lojista') && (
                  <div className="flex flex-col items-center mt-1 mb-2">
                    <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded-full">
                      <div className="flex items-center text-yellow-500">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 ${
                              star <= userRating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-medium text-yellow-700 text-sm">
                        {userRating > 0 ? userRating.toFixed(1) : '0.0'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 mt-1">
                      {userRating > 0 
                        ? (user?.userType === 'lojista' 
                            ? 'Avaliação dos montadores' 
                            : 'Avaliação média')
                        : (user?.userType === 'lojista' 
                            ? 'Ainda sem avaliações de montadores' 
                            : 'Ainda sem avaliações')
                      }
                    </span>
                  </div>
                )}
                
                {/* Botão para upload mais visível e claro */}
                <Button 
                  type="button"
                  onClick={handlePhotoUploadClick}
                  className="mt-2 flex items-center gap-2"
                  size="sm"
                >
                  <Camera className="h-4 w-4" />
                  Alterar foto de perfil
                </Button>
                
                {/* Input oculto para upload de arquivo */}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={(e) => handlePhotoChange(e)}
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              
              <Form {...userForm}>
                <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
                  <FormField
                    control={userForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={userForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="seu.email@exemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={userForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Alterações
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
            
            {/* Formulário de dados da loja (apenas para lojistas) */}
            {user?.userType === 'lojista' && (
              <TabsContent value="dados-loja" className="mt-4">
                {/* Seção do logo da loja */}
                <div className="flex flex-col items-center justify-center mb-6 relative">
                  <div className="h-32 w-32 rounded-full overflow-hidden bg-primary/10 mb-2 relative">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt="Logo da loja" 
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '';
                          target.style.display = 'none';
                          target.parentElement!.innerHTML += `
                            <div class="h-full w-full rounded-full flex items-center justify-center">
                              <svg class="h-16 w-16 text-primary" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 8.3C20 9.7 19.7 10.9 19.2 11.9C18.1 14.1 15.7 15.5 13 15.9V19C13 19.6 12.6 20 12 20C11.4 20 11 19.6 11 19V15.9C8.3 15.5 5.9 14.1 4.8 11.9C4.3 10.9 4 9.7 4 8.3V6C4 5.4 4.4 5 5 5H8V3C8 2.4 8.4 2 9 2H15C15.6 2 16 2.4 16 3V5H19C19.6 5 20 5.4 20 6V8.3ZM7 8C6.4 8 6 7.6 6 7C6 6.4 6.4 6 7 6C7.6 6 8 6.4 8 7C8 7.6 7.6 8 7 8ZM17 8C16.4 8 16 7.6 16 7C16 6.4 16.4 6 17 6C17.6 6 18 6.4 18 7C18 7.6 17.6 8 17 8Z"></path>
                              </svg>
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <svg className="h-16 w-16 text-primary" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 8.3C20 9.7 19.7 10.9 19.2 11.9C18.1 14.1 15.7 15.5 13 15.9V19C13 19.6 12.6 20 12 20C11.4 20 11 19.6 11 19V15.9C8.3 15.5 5.9 14.1 4.8 11.9C4.3 10.9 4 9.7 4 8.3V6C4 5.4 4.4 5 5 5H8V3C8 2.4 8.4 2 9 2H15C15.6 2 16 2.4 16 3V5H19C19.6 5 20 5.4 20 6V8.3ZM7 8C6.4 8 6 7.6 6 7C6 6.4 6.4 6 7 6C7.6 6 8 6.4 8 7C8 7.6 7.6 8 7 8ZM17 8C16.4 8 16 7.6 16 7C16 6.4 16.4 6 17 6C17.6 6 18 6.4 18 7C18 7.6 17.6 8 17 8Z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-2">Logo da Loja</p>
                  
                  {/* Botão para upload do logo */}
                  <Button 
                    type="button"
                    onClick={handleLogoUploadClick}
                    className="mt-2 flex items-center gap-2"
                    size="sm"
                  >
                    <Upload className="h-4 w-4" />
                    Alterar logo da loja
                  </Button>
                  
                  {/* Input oculto para upload do logo */}
                  <input 
                    type="file" 
                    ref={logoFileInputRef}
                    onChange={(e) => handlePhotoChange(e, 'store-logo')}
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              
                <Form {...storeForm}>
                  <form onSubmit={storeForm.handleSubmit(onStoreSubmit)} className="space-y-4">
                    <FormField
                      control={storeForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Loja</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome da sua loja" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={storeForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input placeholder="Endereço da loja" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={storeForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input placeholder="Cidade" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={storeForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl>
                              <Input placeholder="Estado" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={storeForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone da Loja</FormLabel>
                          <FormControl>
                            <Input placeholder="(00) 00000-0000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </TabsContent>
            )}

            {/* Dados Profissionais do Montador */}
            {user?.userType === 'montador' && (
              <TabsContent value="dados-profissionais" className="mt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Dados Profissionais</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingProfessional(!isEditingProfessional)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {isEditingProfessional ? 'Cancelar' : 'Editar'}
                    </Button>
                  </div>

                  {isEditingProfessional ? (
                    <Form {...assemblerForm}>
                      <form onSubmit={assemblerForm.handleSubmit(onAssemblerSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={assemblerForm.control}
                            name="cep"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CEP</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      placeholder="00000-000" 
                                      {...field}
                                      onChange={async (e) => {
                                        const cep = e.target.value.replace(/\D/g, '');
                                        const formattedCep = cep.replace(/(\d{5})(\d{3})/, '$1-$2');
                                        field.onChange(formattedCep);
                                        
                                        if (cep.length === 8) {
                                          await handleCepLookup(cep);
                                        }
                                      }}
                                      maxLength={9}
                                    />
                                    {isLoadingCep && (
                                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={assemblerForm.control}
                            name="addressNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Número</FormLabel>
                                <FormControl>
                                  <Input placeholder="123" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={assemblerForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Endereço</FormLabel>
                              <FormControl>
                                <Input placeholder="Rua, Avenida..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={assemblerForm.control}
                          name="neighborhood"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bairro</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome do bairro" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={assemblerForm.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cidade</FormLabel>
                                <FormControl>
                                  <Input placeholder="Sua cidade" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={assemblerForm.control}
                            name="state"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Estado</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="AC">Acre</SelectItem>
                                      <SelectItem value="AL">Alagoas</SelectItem>
                                      <SelectItem value="AP">Amapá</SelectItem>
                                      <SelectItem value="AM">Amazonas</SelectItem>
                                      <SelectItem value="BA">Bahia</SelectItem>
                                      <SelectItem value="CE">Ceará</SelectItem>
                                      <SelectItem value="DF">Distrito Federal</SelectItem>
                                      <SelectItem value="ES">Espírito Santo</SelectItem>
                                      <SelectItem value="GO">Goiás</SelectItem>
                                      <SelectItem value="MA">Maranhão</SelectItem>
                                      <SelectItem value="MT">Mato Grosso</SelectItem>
                                      <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                                      <SelectItem value="MG">Minas Gerais</SelectItem>
                                      <SelectItem value="PA">Pará</SelectItem>
                                      <SelectItem value="PB">Paraíba</SelectItem>
                                      <SelectItem value="PR">Paraná</SelectItem>
                                      <SelectItem value="PE">Pernambuco</SelectItem>
                                      <SelectItem value="PI">Piauí</SelectItem>
                                      <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                                      <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                                      <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                                      <SelectItem value="RO">Rondônia</SelectItem>
                                      <SelectItem value="RR">Roraima</SelectItem>
                                      <SelectItem value="SC">Santa Catarina</SelectItem>
                                      <SelectItem value="SP">São Paulo</SelectItem>
                                      <SelectItem value="SE">Sergipe</SelectItem>
                                      <SelectItem value="TO">Tocantins</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={assemblerForm.control}
                            name="workRadius"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Raio de Atendimento (km)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="10" 
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={assemblerForm.control}
                          name="experience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descrição da Experiência</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Descreva sua experiência profissional..."
                                  rows={3}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={assemblerForm.control}
                            name="hasOwnTools"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Possui ferramentas próprias</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={assemblerForm.control}
                            name="technicalAssistance"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Oferece assistência técnica</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => setIsEditingProfessional(false)}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alterações
                          </Button>
                        </div>
                      </form>
                    </Form>
                  ) : (
                    <div className="space-y-6">
                      {isLoading ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : (
                        <>
                          {/* Localização e Área de Atendimento */}
                          <div className="bg-white rounded-lg border p-4">
                            <h4 className="text-md font-semibold text-gray-900 mb-3">
                              Localização e Área de Atendimento
                            </h4>
                            <div className="space-y-3 text-sm">
                              <div>
                                <label className="text-gray-600 font-medium">Endereço</label>
                                <p className="text-gray-900">{profileData?.assembler?.address || 'Não informado'}</p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="text-gray-600 font-medium">Cidade</label>
                                  <p className="text-gray-900">{profileData?.assembler?.city || 'Não informado'}</p>
                                </div>
                                <div>
                                  <label className="text-gray-600 font-medium">Estado</label>
                                  <p className="text-gray-900">{profileData?.assembler?.state || 'Não informado'}</p>
                                </div>
                                <div>
                                  <label className="text-gray-600 font-medium">Raio de Atendimento</label>
                                  <p className="text-gray-900">{profileData?.assembler?.workRadius || '0'} km</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Experiência Profissional */}
                          <div className="bg-white rounded-lg border p-4">
                            <h4 className="text-md font-semibold text-gray-900 mb-3">
                              Experiência Profissional
                            </h4>
                            <div className="space-y-3 text-sm">
                              {profileData?.assembler?.experienceYears && (
                                <div>
                                  <label className="text-gray-600 font-medium">Anos de Experiência</label>
                                  <p className="text-gray-900">{profileData.assembler.experienceYears} anos</p>
                                </div>
                              )}
                              
                              {profileData?.assembler?.professionalDescription && (
                                <div>
                                  <label className="text-gray-600 font-medium">Descrição Profissional</label>
                                  <p className="text-gray-900 whitespace-pre-wrap">
                                    {profileData.assembler.professionalDescription}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Especialidades */}
                          <div className="bg-white rounded-lg border p-4">
                            <h4 className="text-md font-semibold text-gray-900 mb-3">
                              Especialidades
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {profileData?.assembler?.specialties?.map((specialty: string, index: number) => (
                                <span 
                                  key={index}
                                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                                >
                                  {specialty}
                                </span>
                              )) || <p className="text-gray-500 text-sm">Nenhuma especialidade informada</p>}
                            </div>
                          </div>

                          {/* Ferramentas e Recursos */}
                          <div className="bg-white rounded-lg border p-4">
                            <h4 className="text-md font-semibold text-gray-900 mb-3">
                              Ferramentas e Recursos
                            </h4>
                            <div className="space-y-3">
                              <div className="flex items-center">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  profileData?.assembler?.hasOwnTools 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {profileData?.assembler?.hasOwnTools ? 'Possui ferramentas próprias' : 'Não possui ferramentas próprias'}
                                </span>
                              </div>
                              
                              {profileData?.assembler?.technicalAssistance && (
                                <div className="flex items-center">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                    Oferece Assistência Técnica
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            {/* Seção de informações bancárias */}
            <TabsContent value="dados-bancarios" className="mt-4">
              {user && <BankAccountSection userId={user.id} />}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>

      <BankAccountDialog
        open={showBankDialog}
        onOpenChange={setShowBankDialog}
      />
    </Dialog>
  );
};

export default ProfileDialog;
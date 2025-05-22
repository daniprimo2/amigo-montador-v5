import React, { useState, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
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
import { Loader2, User, Camera, Upload } from 'lucide-react';
import { BankAccountDialog } from '../banking/bank-account-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

type UserFormValues = z.infer<typeof userSchema>;
type StoreFormValues = z.infer<typeof storeSchema>;

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
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dados-pessoais');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
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
      
      // Atualizar formulário de dados do usuário
      userForm.reset({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
      });
      
      // Verificar se existe foto de perfil
      if (data.profileData && data.profileData.photoUrl) {
        setProfilePhoto(data.profileData.photoUrl);
      } else {
        setProfilePhoto(null);
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
  
  // Abrir seletor de arquivo
  const handlePhotoUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Processar upload de foto
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      formData.append('photo', file);
      
      const response = await fetch('/api/profile/photo', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Falha ao enviar foto de perfil');
      }
      
      const data = await response.json();
      setProfilePhoto(data.photoUrl);
      
      toast({
        title: 'Sucesso',
        description: 'Foto de perfil atualizada com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao enviar foto de perfil:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao enviar a foto de perfil',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      // Limpar o input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
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
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Perfil do Usuário</DialogTitle>
          <DialogDescription>
            Visualize e edite suas informações pessoais
          </DialogDescription>
        </DialogHeader>
        
        {onLogout && (
          <div className="flex justify-end mb-4">
            <Button 
              variant="outline" 
              onClick={onLogout}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              Logout
            </Button>
          </div>
        )}
        
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dados-pessoais">Dados Pessoais</TabsTrigger>
              {user?.userType === 'lojista' && (
                <TabsTrigger value="dados-loja">Dados da Loja</TabsTrigger>
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
                        target.src = '';
                        target.style.display = 'none';
                        target.parentElement!.innerHTML += `
                          <div class="h-full w-full rounded-full flex items-center justify-center">
                            <svg class="h-16 w-16 text-primary" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                          </div>
                        `;
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <User className="h-16 w-16 text-primary" />
                    </div>
                  )}
                  
                  {/* Botão para upload */}
                  <button 
                    type="button"
                    onClick={handlePhotoUploadClick}
                    className="absolute bottom-2 right-2 bg-primary text-white p-3 rounded-full hover:bg-primary/90 transition-colors shadow-lg z-10 border-2 border-white translate-x-1/4 translate-y-1/4"
                    title="Alterar foto de perfil"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-500 mb-2">Foto de perfil</p>
                <p className="text-xs text-gray-400">Clique no ícone para alterar sua foto</p>
                
                {/* Input oculto para upload de arquivo */}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
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

            {/* Seção de informações bancárias */}
            <TabsContent value="dados-bancarios" className="mt-4">
              {user && (
                <BankAccountDialog 
                  userId={user.id} 
                  userType={user.userType as 'lojista' | 'montador'} 
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;
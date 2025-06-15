#!/usr/bin/env node

import fs from 'fs';

console.log('Aplicando correção abrangente...');

// Ler arquivo original
let content = fs.readFileSync('client/src/components/dashboard/assembler-dashboard.tsx', 'utf8');

// Identificar e corrigir problemas estruturais principais
content = content
  // Corrigir estrutura da função filteredServices que está quebrada
  .replace(
    /const filteredServices[^}]*}[\s\S]*?return matchesSearch && matchesState && matchesDistance;\s*\}\) \|\| \[\];/,
    `const filteredServices = (rawServices || []).filter((service: any) => {
    // Se não há pesquisa nem filtros ativos, mostrar todos os serviços
    if (searchTerm === '' && selectedState === 'Todos os estados' && maxDistance >= 1000) {
      return true;
    }
    
    const matchesSearch = searchTerm === '' || 
      service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.type && service.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (typeof service.store === 'string' ? service.store.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
      service.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesState = selectedState === 'Todos os estados' || (() => {
      const locationParts = service.location.split(' - ');
      if (locationParts.length >= 2) {
        const cityStatePart = locationParts[1];
        const statePart = cityStatePart.split(',')[1]?.trim();
        return statePart === selectedState;
      }
      return false;
    })();
    
    const matchesDistance = maxDistance >= 1000 || (() => {
      if (service.distance && typeof service.distance === 'string') {
        const distanceValue = parseFloat(service.distance.replace(' km', ''));
        return !isNaN(distanceValue) && distanceValue <= maxDistance;
      }
      return true;
    })();
    
    return matchesSearch && matchesState && matchesDistance;
  });`
  )
  
  // Corrigir problemas de vírgulas em mutations
  .replace(/(\}\s*=\s*useMutation\s*\(\s*\{[^}]*),(\s*\})/g, '$1$2')
  
  // Corrigir onError handlers malformados
  .replace(/onError:\s*\([^)]*\)\s*=>\s*\{[^}]*\}\s*,\s*(\})/g, 
    'onError: (error) => {\n      console.error("Erro:", error);\n      toast({\n        title: "Erro",\n        description: "Falha na operação",\n        variant: "destructive"\n      });\n    }\n  $1')
  
  // Garantir que todas as funções tenham return correto
  .replace(/^(\s*)(const\s+\w+Dashboard[^=]*=\s*[^{]*\{)/, '$1$2\n$1const { user } = useAuth();\n$1const { toast } = useToast();\n$1const queryClient = useQueryClient();')
  
  // Corrigir declarações de estado ausentes
  .replace(/export const AssemblerDashboard[^{]*\{/, 
    `export const AssemblerDashboard: React.FC<AssemblerDashboardProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('Todos os estados');
  const [maxDistance, setMaxDistance] = useState(1000);
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [isDistanceFilterOpen, setIsDistanceFilterOpen] = useState(false);
  const [dashboardSection, setDashboardSection] = useState('services');
  const [activeTab, setActiveTab] = useState('available');
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isSkillsWizardOpen, setIsSkillsWizardOpen] = useState(false);
  const [selectedServiceForConfirm, setSelectedServiceForConfirm] = useState<any>(null);
  const [selectedServiceForPayment, setSelectedServiceForPayment] = useState<any>(null);
  const [selectedServiceForRating, setSelectedServiceForRating] = useState<any>(null);

  const { lastMessage } = useWebSocket(user?.id);`);

// Adicionar declarações de queries ausentes no início da função
const queryDeclarations = `
  // Queries
  const { data: rawServices, isLoading, error } = useQuery({
    queryKey: ['/api/services/available'],
    enabled: !!user
  });

  const { data: activeServices, isLoading: isLoadingActiveServices } = useQuery({
    queryKey: ['/api/services/active'],
    enabled: !!user
  });

  const { data: assemblerProfile } = useQuery({
    queryKey: [\`/api/assemblers/\${user?.id}\`],
    enabled: !!user?.id
  });

  const {
    pendingRatings,
    selectedServiceForRating: mandatoryServiceForRating,
    isDialogOpen: isMandatoryRatingDialogOpen,
    closeMandatoryRating
  } = useMandatoryRatings();
`;

content = content.replace(
  /const { lastMessage } = useWebSocket\(user\?\.id\);/,
  `const { lastMessage } = useWebSocket(user?.id);${queryDeclarations}`
);

fs.writeFileSync('client/src/components/dashboard/assembler-dashboard.tsx', content);

console.log('Correção abrangente aplicada!');
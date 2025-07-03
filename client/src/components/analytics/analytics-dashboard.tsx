import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Star, 
  Clock, 
  DollarSign,
  Calendar,
  CheckCircle,
  FileText,
  AlertCircle
} from 'lucide-react';
import { format, subDays, subMonths, subYears, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AnalyticsData {
  totalServices: number;
  completedServices: number;
  averageRating: number;
  totalRatings: number;
  totalEarnings: number;
  pendingServices: number;
  monthlyStats: Array<{
    month: string;
    services: number;
    earnings: number;
    averageRating: number;
  }>;
  ratingDistribution: Array<{
    rating: number;
    count: number;
  }>;
  topCategories: Array<{
    category: string;
    count: number;
  }>;
  recentServices: Array<{
    id: number;
    title: string;
    completedAt: string;
    rating: number;
    earnings: number;
  }>;
}

interface AnalyticsDashboardProps {
  onBack: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('3months');
  const [activeTab, setActiveTab] = useState('overview');

  // Calcular datas baseadas no período selecionado
  const getDateRange = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case '30days':
        return { start: subDays(now, 30), end: now };
      case '3months':
        return { start: subMonths(now, 3), end: now };
      case '6months':
        return { start: subMonths(now, 6), end: now };
      case '1year':
        return { start: subYears(now, 1), end: now };
      default:
        return { start: subMonths(now, 3), end: now };
    }
  };

  const { start, end } = getDateRange();

  // Query para dados de analytics
  const analyticsQuery = useQuery<AnalyticsData>({
    queryKey: [`/api/analytics/dashboard`, selectedPeriod],
    refetchOnWindowFocus: false,
    enabled: !!user
  });

  const { data: analytics, isLoading, error } = analyticsQuery;

  // Função para exportar dados
  const handleExportData = async (format: 'csv' | 'pdf') => {
    try {
      const response = await fetch(`/api/analytics/export?format=${format}&period=${selectedPeriod}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao exportar dados');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `analytics-${format}-${format === 'csv' ? new Date().toISOString().split('T')[0] : 'report'}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao exportar:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Erro ao carregar dados</h3>
                <p className="text-sm text-gray-500">
                  Não foi possível carregar os dados de analytics. Tente novamente.
                </p>
              </div>
              <Button onClick={() => analyticsQuery.refetch()}>
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completionRate = analytics.totalServices > 0 
    ? ((analytics.completedServices / analytics.totalServices) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-600">
            Acompanhe seu desempenho e estatísticas de serviços
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="6months">Últimos 6 meses</SelectItem>
              <SelectItem value="1year">Último ano</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
        </div>
      </div>

      {/* KPIs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Serviços</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalServices}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.completedServices} concluídos ({completionRate}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliação Média</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.averageRating > 0 ? analytics.averageRating.toFixed(1) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalRatings} avaliações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {user?.userType === 'montador' ? 'Ganhos Totais' : 'Valor Total'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(analytics.totalEarnings)}
            </div>
            <p className="text-xs text-muted-foreground">
              No período selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serviços Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.pendingServices}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando ação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="export">Exportar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Monthly Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.monthlyStats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{stat.month}</p>
                      <p className="text-sm text-gray-600">{stat.services} serviços</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(stat.earnings)}
                      </p>
                      <p className="text-sm text-gray-600">
                        ⭐ {stat.averageRating.toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Services */}
          <Card>
            <CardHeader>
              <CardTitle>Serviços Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.recentServices.length > 0 ? (
                  analytics.recentServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{service.title}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(service.completedAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(service.earnings)}
                        </p>
                        <p className="text-sm text-gray-600">⭐ {service.rating}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    Nenhum serviço concluído no período
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Rating Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Avaliações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const ratingData = analytics.ratingDistribution.find(r => r.rating === rating);
                  const count = ratingData?.count || 0;
                  const percentage = analytics.totalRatings > 0 
                    ? ((count / analytics.totalRatings) * 100).toFixed(0)
                    : '0';
                  
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-16">
                        <span className="text-sm">{rating}</span>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-sm text-gray-600 w-12 text-right">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Categorias Mais Trabalhadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topCategories.length > 0 ? (
                  analytics.topCategories.map((category, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{category.category}</span>
                      <span className="text-sm text-gray-600">{category.count} serviços</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    Nenhuma categoria encontrada
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Dados</CardTitle>
              <p className="text-sm text-gray-600">
                Baixe seus dados de performance para análise externa ou arquivamento
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => handleExportData('csv')}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <FileText className="h-4 w-4" />
                  Exportar CSV
                </Button>
                
                <Button 
                  onClick={() => handleExportData('pdf')}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>
              
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>CSV:</strong> Planilha com dados detalhados para análise em Excel/Google Sheets</p>
                <p><strong>PDF:</strong> Relatório formatado com gráficos e resumo executivo</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
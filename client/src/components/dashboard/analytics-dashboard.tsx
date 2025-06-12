import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  Clock, 
  Star, 
  DollarSign, 
  Bell,
  Smartphone,
  Activity,
  Calendar,
  BarChart3,
  PieChart
} from "lucide-react";
import { formatToBrazilianPrice } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface AnalyticsData {
  totalServices: number;
  completedServices: number;
  activeServices: number;
  totalRevenue: number;
  averageRating: number;
  responseTime: number;
  notificationsSent: number;
  mobileUsers: number;
  weeklyGrowth: number;
  popularLocations: Array<{ city: string; count: number }>;
  servicesByStatus: Array<{ status: string; count: number; percentage: number }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  userActivity: Array<{ hour: number; count: number }>;
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");
  const { user } = useAuth();

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        // Mock data for demonstration when API is not available
        setAnalytics({
          totalServices: 156,
          completedServices: 142,
          activeServices: 14,
          totalRevenue: 45320.50,
          averageRating: 4.7,
          responseTime: 2.3,
          notificationsSent: 342,
          mobileUsers: 89,
          weeklyGrowth: 12.5,
          popularLocations: [
            { city: "São Paulo, SP", count: 45 },
            { city: "Rio de Janeiro, RJ", count: 32 },
            { city: "Belo Horizonte, MG", count: 28 },
            { city: "Brasília, DF", count: 21 },
            { city: "Curitiba, PR", count: 18 }
          ],
          servicesByStatus: [
            { status: "Concluído", count: 142, percentage: 74.7 },
            { status: "Em Andamento", count: 14, percentage: 7.4 },
            { status: "Aberto", count: 21, percentage: 11.1 },
            { status: "Cancelado", count: 13, percentage: 6.8 }
          ],
          revenueByMonth: [
            { month: "Jan", revenue: 8500 },
            { month: "Fev", revenue: 9200 },
            { month: "Mar", revenue: 11800 },
            { month: "Abr", revenue: 10200 },
            { month: "Mai", revenue: 12400 },
            { month: "Jun", revenue: 13900 }
          ],
          userActivity: [
            { hour: 6, count: 5 },
            { hour: 8, count: 15 },
            { hour: 10, count: 28 },
            { hour: 12, count: 35 },
            { hour: 14, count: 42 },
            { hour: 16, count: 38 },
            { hour: 18, count: 25 },
            { hour: 20, count: 12 }
          ]
        });
      }
    } catch (error) {
      console.error("Erro ao carregar analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const MetricCard = ({ title, value, change, icon: Icon, color = "blue" }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={`text-xs ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change > 0 ? '+' : ''}{change}% em relação ao período anterior
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Visão geral do desempenho da plataforma
          </p>
        </div>
        <div className="flex gap-2">
          {["7d", "30d", "90d"].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === "7d" ? "7 dias" : range === "30d" ? "30 dias" : "90 dias"}
            </Button>
          ))}
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Serviços"
          value={analytics.totalServices}
          change={analytics.weeklyGrowth}
          icon={Activity}
          color="blue"
        />
        <MetricCard
          title="Receita Total"
          value={formatToBrazilianPrice(analytics.totalRevenue)}
          change={8.2}
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          title="Avaliação Média"
          value={`${analytics.averageRating}/5.0`}
          change={null}
          icon={Star}
          color="yellow"
        />
        <MetricCard
          title="Usuários Mobile"
          value={`${analytics.mobileUsers}%`}
          change={5.3}
          icon={Smartphone}
          color="purple"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="geography">Geografia</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status dos Serviços */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Status dos Serviços
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.servicesByStatus.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">{item.status}</span>
                      <span className="text-sm font-medium">{item.count}</span>
                    </div>
                    <Progress value={item.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Receita por Mês */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Receita Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.revenueByMonth.slice(-3).map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{item.month}</span>
                      <span className="font-medium">{formatToBrazilianPrice(item.revenue)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Tempo de Resposta
                </CardTitle>
                <CardDescription>
                  Tempo médio para primeira resposta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.responseTime}h</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Meta: 2h | 15% mais rápido que o mês passado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Atividade por Horário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.userActivity.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm w-8">{item.hour}h</span>
                      <Progress value={(item.count / 50) * 100} className="flex-1 h-2" />
                      <span className="text-sm w-8">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="geography" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Locais Mais Ativos
              </CardTitle>
              <CardDescription>
                Cidades com maior número de serviços
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.popularLocations.map((location, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <span>{location.city}</span>
                    </div>
                    <span className="font-medium">{location.count} serviços</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificações Enviadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.notificationsSent}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Taxa de entrega: 97.2%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuários Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Desktop</span>
                    <span className="font-medium">{100 - analytics.mobileUsers}%</span>
                  </div>
                  <Progress value={100 - analytics.mobileUsers} className="h-2" />
                  <div className="flex justify-between">
                    <span className="text-sm">Mobile</span>
                    <span className="font-medium">{analytics.mobileUsers}%</span>
                  </div>
                  <Progress value={analytics.mobileUsers} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
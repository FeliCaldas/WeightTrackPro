import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useParams, Link } from "wouter";
import { ArrowLeft, LogOut, Calendar, Weight, TrendingUp, User } from "lucide-react";

export default function UserDashboard() {
  const { user, isAuthenticated, isLoading, logoutMutation } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  
  // Check if we're viewing another user's data
  const isViewingOtherUser = params.userId && parseInt(params.userId) !== user?.id;
  const targetUserId = isViewingOtherUser ? params.userId : user?.id?.toString();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activeTab, setActiveTab] = useState("diario");

  // Get user info if viewing another user
  const { data: activeUsers } = useQuery({
    queryKey: ["/api/users/active"],
    enabled: Boolean(isViewingOtherUser && isAuthenticated),
  });

  // Get all users (including admins) for admin users viewing others
  const { data: allUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: Boolean(isViewingOtherUser && user?.isAdmin),
  });

  const viewingUser = isViewingOtherUser 
    ? (user?.isAdmin ? allUsers?.find((u: any) => u.id === parseInt(params.userId)) : activeUsers?.find((u: any) => u.id === parseInt(params.userId)))
    : user;

  // Get daily stats
  const { data: dailyStats } = useQuery({
    queryKey: ["/api/weight-records/daily", targetUserId, selectedDate],
    enabled: Boolean(isAuthenticated && targetUserId && selectedDate),
  });

  // Get monthly stats
  const { data: monthlyStats } = useQuery({
    queryKey: ["/api/weight-records/monthly", targetUserId, selectedMonth.split('-')[0], selectedMonth.split('-')[1]],
    enabled: Boolean(isAuthenticated && targetUserId && selectedMonth),
  });

  // Get user summary stats
  const { data: summaryStats } = useQuery({
    queryKey: ["/api/users", targetUserId, "summary"],
    enabled: Boolean(isAuthenticated && targetUserId),
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {isViewingOtherUser && (
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                </Link>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isViewingOtherUser ? "Visualizar Usuário" : "Minha Produtividade"}
                </h1>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{viewingUser?.firstName} {viewingUser?.lastName}</span>
                  {viewingUser?.workType && (
                    <Badge variant="secondary">
                      {viewingUser.workType === "filetagem" ? "Filetagem" : "Espinho"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {!isViewingOtherUser && (
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryStats?.totalToday?.toFixed(1) || "0.0"} kg
              </div>
              <p className="text-xs text-muted-foreground">
                Peso total processado hoje
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryStats?.totalMonth?.toFixed(1) || "0.0"} kg
              </div>
              <p className="text-xs text-muted-foreground">
                Total no mês atual
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média Diária</CardTitle>
              <Weight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryStats?.avgDaily?.toFixed(1) || "0.0"} kg
              </div>
              <p className="text-xs text-muted-foreground">
                Média por dia no mês
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="diario">Dados Diários</TabsTrigger>
            <TabsTrigger value="mensal">Dados Mensais</TabsTrigger>
          </TabsList>

          <TabsContent value="diario" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Dados do Dia</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-auto"
                  />
                </div>

                {dailyStats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Peso Total</p>
                      <p className="text-2xl font-bold text-primary">
                        {dailyStats.totalWeight?.toFixed(1) || "0.0"} kg
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Registros</p>
                      <p className="text-2xl font-bold text-primary">
                        {dailyStats.recordCount || 0}
                      </p>
                    </div>
                  </div>
                )}

                {dailyStats?.records && dailyStats.records.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Registros do Dia</h4>
                    <div className="space-y-2">
                      {dailyStats.records.map((record: any) => (
                        <div key={record.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{record.weight} kg</span>
                            <Badge variant="outline" className="ml-2">
                              {record.workType === "filetagem" ? "Filetagem" : "Espinho"}
                            </Badge>
                          </div>
                          {record.notes && (
                            <span className="text-sm text-gray-600">{record.notes}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mensal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Dados Mensais</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-auto"
                  />
                </div>

                {monthlyStats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Peso Total do Mês</p>
                      <p className="text-2xl font-bold text-primary">
                        {monthlyStats.totalWeight?.toFixed(1) || "0.0"} kg
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Total de Registros</p>
                      <p className="text-2xl font-bold text-primary">
                        {monthlyStats.recordCount || 0}
                      </p>
                    </div>
                  </div>
                )}

                {monthlyStats?.dailyStats && monthlyStats.dailyStats.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Resumo por Dia</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {monthlyStats.dailyStats.map((day: any) => (
                        <div key={day.date} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium">
                            {new Date(day.date).toLocaleDateString('pt-BR')}
                          </span>
                          <div className="text-right">
                            <div className="font-medium">{day.weight.toFixed(1)} kg</div>
                            <div className="text-sm text-gray-600">{day.recordCount} registros</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
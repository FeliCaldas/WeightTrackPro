import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Plus, 
  Weight, 
  Users, 
  Calendar, 
  TrendingUp, 
  LogOut, 
  Edit,
  Eye,
  UserPlus 
} from "lucide-react";
import { Link } from "wouter";

const weightRecordSchema = z.object({
  userId: z.string().min(1, "Usuário é obrigatório"),
  weight: z.number().min(0.1, "Peso deve ser maior que 0"),
  date: z.string().min(1, "Data é obrigatória"),
  notes: z.string().optional(),
});

const createUserSchema = z.object({
  cpf: z.string().min(11, "CPF deve ter 11 dígitos").max(11, "CPF deve ter 11 dígitos"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  workType: z.enum(["filetagem", "espinho"], {
    required_error: "Tipo de trabalho é obrigatório",
  }),
  isAdmin: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type WeightRecordForm = z.infer<typeof weightRecordSchema>;
type CreateUserForm = z.infer<typeof createUserSchema>;

// Component for individual user stats
function UserStatsCard({ user }: { user: any }) {
  const today = new Date().toISOString().split('T')[0];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const { data: userStats } = useQuery({
    queryKey: ["/api/users", user.id, "summary"],
    enabled: !!user.id,
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">{user.firstName} {user.lastName}</h4>
        <Badge variant="outline">
          {user.workType === "filetagem" ? "Filetagem" : "Espinho"}
        </Badge>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Hoje:</span>
          <span className="font-medium">
            {userStats?.totalToday ? `${userStats.totalToday.toFixed(1)} kg` : "0.0 kg"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Este mês:</span>
          <span className="font-medium">
            {userStats?.totalMonth ? `${userStats.totalMonth.toFixed(1)} kg` : "0.0 kg"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Média diária:</span>
          <span className="font-medium">
            {userStats?.avgDaily ? `${userStats.avgDaily.toFixed(1)} kg` : "0.0 kg"}
          </span>
        </div>
      </div>
      <Link href={`/user/${user.id}`}>
        <Button variant="outline" size="sm" className="w-full mt-3">
          Ver Detalhes
        </Button>
      </Link>
    </Card>
  );
}

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading, logoutMutation } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);

  const weightForm = useForm<WeightRecordForm>({
    resolver: zodResolver(weightRecordSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  const userForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      isAdmin: false,
      isActive: true,
    },
  });

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user?.isAdmin)) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Queries
  const { data: dashboardStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: Boolean(isAuthenticated && user?.isAdmin),
  });

  const { data: activeUsers } = useQuery({
    queryKey: ["/api/users/active"],
    enabled: Boolean(isAuthenticated && user?.isAdmin),
  });

  const { data: allUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: Boolean(isAuthenticated && user?.isAdmin),
  });

  // Mutations
  const createWeightRecordMutation = useMutation({
    mutationFn: async (data: WeightRecordForm) => {
      const response = await apiRequest("POST", "/api/weight-records", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Registro de peso criado com sucesso!",
      });
      weightForm.reset({
        date: new Date().toISOString().split('T')[0],
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar registro de peso",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });
      userForm.reset({
        isAdmin: false,
        isActive: true,
      });
      setIsCreateUserOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/active"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar usuário",
        variant: "destructive",
      });
    },
  });

  const handleSubmitWeight = async (values: WeightRecordForm) => {
    console.log("Submitting weight record:", values);
    
    // Get selected user's workType
    const selectedUser = activeUsers?.find((u: any) => u.id.toString() === values.userId);
    if (!selectedUser) {
      toast({
        title: "Erro",
        description: "Usuário não encontrado",
        variant: "destructive",
      });
      return;
    }
    
    const dataToSubmit = {
      ...values,
      workType: selectedUser.workType,
    };
    
    createWeightRecordMutation.mutate(dataToSubmit);
  };

  const handleSubmitUser = (data: CreateUserForm) => {
    createUserMutation.mutate(data);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
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

  if (!isAuthenticated || !user?.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
              <p className="text-sm text-gray-600">
                Bem-vindo, {user?.firstName} {user?.lastName}
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="add-weight">Adicionar Peso</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hoje</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardStats?.totalToday?.toFixed(1) || "0.0"} kg
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Peso total processado hoje
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardStats?.activeUsers || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Trabalhadores ativos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Média Diária</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardStats?.avgDaily?.toFixed(1) || "0.0"} kg
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Média por dia este mês
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
                  <Weight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardStats?.totalMonth?.toFixed(1) || "0.0"} kg
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total do mês atual
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Usuários Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activeUsers?.filter((user: any) => !user.isAdmin).map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-gray-500">
                            {formatCPF(user.cpf)} • {user.workType === "filetagem" ? "Filetagem" : "Espinho"}
                          </p>
                        </div>
                      </div>
                      <Link href={`/user/${user.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Dados
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add-weight" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Registro de Peso</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...weightForm}>
                  <form onSubmit={weightForm.handleSubmit(handleSubmitWeight)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={weightForm.control}
                        name="userId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Usuário</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um usuário" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {activeUsers?.filter((user: any) => !user.isAdmin).map((user: any) => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.firstName} {user.lastName} - {user.workType === "filetagem" ? "Filetagem" : "Espinho"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />



                      <FormField
                        control={weightForm.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Peso (kg)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1" 
                                placeholder="0.0" 
                                value={field.value || ''}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={weightForm.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={weightForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações (opcional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Observações sobre o registro..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={createWeightRecordMutation.isPending}
                    >
                      {createWeightRecordMutation.isPending ? "Salvando..." : "Salvar Registro"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Gerenciar Usuários</h2>
              <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Criar Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Usuário</DialogTitle>
                  </DialogHeader>
                  <Form {...userForm}>
                    <form onSubmit={userForm.handleSubmit(handleSubmitUser)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={userForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={userForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sobrenome</FormLabel>
                              <FormControl>
                                <Input placeholder="Sobrenome" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={userForm.control}
                          name="cpf"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CPF</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="12345678901" 
                                  maxLength={11}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={userForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Senha" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={userForm.control}
                          name="workType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Trabalho</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="filetagem">Filetagem</SelectItem>
                                  <SelectItem value="espinho">Espinho</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={userForm.control}
                          name="isAdmin"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Administrador</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  Permitir acesso ao painel administrativo
                                </div>
                              </div>
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Todos os Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers?.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell>{formatCPF(user.cpf)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.workType === "filetagem" ? "Filetagem" : "Espinho"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.isAdmin && <Badge variant="destructive">Admin</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Link href={`/user/${user.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas Individuais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeUsers?.filter((user: any) => !user.isAdmin).map((user: any) => (
                    <UserStatsCard key={user.id} user={user} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
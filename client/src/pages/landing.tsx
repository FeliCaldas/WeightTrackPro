import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { Link } from "wouter";

export default function Landing() {
  const { loginMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"login" | "select-user">("login");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");

  // Query for active users when in "select-user" mode
  const { data: activeUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users/public"],
    enabled: activeTab === "select-user",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cpf || !password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha CPF e senha",
        variant: "destructive",
      });
      return;
    }

    try {
      await loginMutation.mutateAsync({ cpf: getCleanCPF(cpf), password });
      toast({
        title: "Sucesso",
        description: "Login realizado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "CPF ou senha inválidos",
        variant: "destructive",
      });
    }
  };

  const formatCPF = (value: string) => {
    // Remove non-numeric characters
    const cleaned = value.replace(/\D/g, '');
    
    // Limit to 11 digits
    const truncated = cleaned.slice(0, 11);
    
    // Format as XXX.XXX.XXX-XX
    if (truncated.length <= 3) {
      return truncated;
    } else if (truncated.length <= 6) {
      return `${truncated.slice(0, 3)}.${truncated.slice(3)}`;
    } else if (truncated.length <= 9) {
      return `${truncated.slice(0, 3)}.${truncated.slice(3, 6)}.${truncated.slice(6)}`;
    } else {
      return `${truncated.slice(0, 3)}.${truncated.slice(3, 6)}.${truncated.slice(6, 9)}-${truncated.slice(9)}`;
    }
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
  };

  const getCleanCPF = (formattedCPF: string) => {
    return formattedCPF.replace(/\D/g, '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Sistema de Peso
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Controle de produtividade para processamento de caixas
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-4">
            <div className="flex space-x-2">
              <Button
                variant={activeTab === "login" ? "default" : "outline"}
                onClick={() => setActiveTab("login")}
                className="flex-1"
              >
                Login
              </Button>
              <Button
                variant={activeTab === "select-user" ? "default" : "outline"}
                onClick={() => setActiveTab("select-user")}
                className="flex-1"
              >
                Sou usuário
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {activeTab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={handleCpfChange}
                    maxLength={14}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <CardTitle className="text-lg">Selecione seu nome</CardTitle>
                  <CardDescription>
                    Escolha seu nome da lista para visualizar seus dados
                  </CardDescription>
                </div>
                
                {usersLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeUsers?.map((user) => (
                      <Link
                        key={user.id}
                        href={`/user/${user.id}`}
                      >
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left h-auto p-4"
                        >
                          <div>
                            <div className="font-semibold">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.workType === "filetagem" ? "Filetagem" : "Espinho"}
                            </div>
                          </div>
                        </Button>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Sistema desenvolvido para controle de produtividade</p>
          <p>Pesqueira © 2024</p>
        </div>
      </div>
    </div>
  );
}
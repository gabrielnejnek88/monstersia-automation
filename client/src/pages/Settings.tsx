import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, Link as LinkIcon, Unlink, CheckCircle2, XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Settings() {
  const [folderId, setFolderId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading: loadingSettings, refetch: refetchSettings } = trpc.settings.get.useQuery();
  const { data: connectionStatus, isLoading: loadingStatus, refetch: refetchStatus } = trpc.google.connectionStatus.useQuery();
  const { data: isConfigured } = trpc.google.isConfigured.useQuery();

  const updateSettingsMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas!");
      refetchSettings();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const getAuthUrlMutation = trpc.google.getAuthUrl.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      toast.error(`Erro ao conectar: ${error.message}`);
    },
  });

  const disconnectMutation = trpc.google.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Desconectado com sucesso!");
      refetchStatus();
    },
    onError: (error) => {
      toast.error(`Erro ao desconectar: ${error.message}`);
    },
  });

  const uploadExcelMutation = trpc.posts.uploadExcel.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.validRows} posts importados com sucesso!`);
      if (data.errors.length > 0) {
        toast.warning(`${data.errors.length} erros encontrados. Verifique o console.`);
        console.log("Erros de importação:", data.errors);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error) => {
      toast.error(`Erro ao importar: ${error.message}`);
    },
  });

  const handleConnectDrive = () => {
    getAuthUrlMutation.mutate({ provider: "google_drive" });
  };

  const handleConnectYouTube = () => {
    getAuthUrlMutation.mutate({ provider: "google_youtube" });
  };

  const handleDisconnectDrive = () => {
    disconnectMutation.mutate({ provider: "google_drive" });
  };

  const handleDisconnectYouTube = () => {
    disconnectMutation.mutate({ provider: "google_youtube" });
  };

  const handleSaveFolderId = () => {
    if (!folderId.trim()) {
      toast.error("Digite um ID de pasta válido");
      return;
    }
    updateSettingsMutation.mutate({ driveFolderId: folderId });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Por favor, selecione um arquivo Excel (.xlsx ou .xls)");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const base64Content = base64.split(",")[1];
        
        uploadExcelMutation.mutate({ fileContent: base64Content });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Erro ao ler arquivo");
    }
  };

  if (!isConfigured?.configured) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <Card>
          <CardHeader>
            <CardTitle>Configuração Necessária</CardTitle>
            <CardDescription>
              Para usar o Monsters.ia, você precisa configurar as credenciais do Google OAuth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure as seguintes variáveis de ambiente no seu servidor:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li><code className="bg-muted px-2 py-1 rounded">GOOGLE_CLIENT_ID</code></li>
                <li><code className="bg-muted px-2 py-1 rounded">GOOGLE_CLIENT_SECRET</code></li>
                <li><code className="bg-muted px-2 py-1 rounded">GOOGLE_REDIRECT_URI</code></li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Obtenha essas credenciais no{" "}
                <a
                  href="https://console.cloud.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google Cloud Console
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie conexões e preferências do sistema</p>
      </div>

      {/* Conexões Google */}
      <Card>
        <CardHeader>
          <CardTitle>Conexões Google</CardTitle>
          <CardDescription>
            Conecte suas contas do Google Drive e YouTube
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingStatus ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <LinkIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Google Drive</h4>
                    <p className="text-sm text-muted-foreground">
                      Acesso aos vídeos armazenados
                    </p>
                  </div>
                </div>
                {connectionStatus?.drive ? (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnectDrive}
                      disabled={disconnectMutation.isPending}
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Desconectar
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleConnectDrive}
                    disabled={getAuthUrlMutation.isPending}
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Conectar
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <LinkIcon className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">YouTube</h4>
                    <p className="text-sm text-muted-foreground">
                      Publicação de vídeos
                    </p>
                  </div>
                </div>
                {connectionStatus?.youtube ? (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnectYouTube}
                      disabled={disconnectMutation.isPending}
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Desconectar
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleConnectYouTube}
                    disabled={getAuthUrlMutation.isPending}
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Conectar
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upload Excel */}
      <Card>
        <CardHeader>
          <CardTitle>Upload de Planilha</CardTitle>
          <CardDescription>
            Importe posts agendados de um arquivo Excel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="excel-file">Arquivo Excel (.xlsx)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  disabled={uploadExcelMutation.isPending}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadExcelMutation.isPending}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadExcelMutation.isPending ? "Importando..." : "Selecionar"}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              A planilha deve conter as colunas: Date, Time, Platform, Title, Description, Hashtags, Video File
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configurações do Drive */}
      <Card>
        <CardHeader>
          <CardTitle>Pasta do Google Drive</CardTitle>
          <CardDescription>
            Configure a pasta padrão onde os vídeos estão armazenados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-id">ID da Pasta</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="folder-id"
                  placeholder={settings?.driveFolderId || "Cole o ID da pasta aqui"}
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                />
                <Button
                  onClick={handleSaveFolderId}
                  disabled={updateSettingsMutation.isPending}
                >
                  Salvar
                </Button>
              </div>
            </div>
            {settings?.driveFolderName && (
              <p className="text-sm text-muted-foreground">
                Pasta atual: <strong>{settings.driveFolderName}</strong>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              O ID da pasta pode ser encontrado na URL do Google Drive após /folders/
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Fuso Horário */}
      <Card>
        <CardHeader>
          <CardTitle>Fuso Horário</CardTitle>
          <CardDescription>
            Configure o fuso horário para agendamento de posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSettings ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="timezone">Fuso Horário</Label>
                <Select
                  value={settings?.timezone || "America/Sao_Paulo"}
                  onValueChange={(value) => updateSettingsMutation.mutate({ timezone: value })}
                >
                  <SelectTrigger id="timezone" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Sao_Paulo">Brasil (UTC-3)</SelectItem>
                    <SelectItem value="America/New_York">New York (UTC-5)</SelectItem>
                    <SelectItem value="Europe/London">Londres (UTC+0)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (UTC+1)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tóquio (UTC+9)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useState } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type StatusFilter = "all" | "scheduled" | "processing" | "published" | "failed";

export default function Posts() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  
  const { data: posts, isLoading, refetch } = trpc.posts.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 100,
  });

  const retryMutation = trpc.posts.retry.useMutation({
    onSuccess: () => {
      toast.success("Post reagendado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao reagendar: ${error.message}`);
    },
  });

  const publishNowMutation = trpc.posts.publishNow.useMutation({
    onSuccess: () => {
      toast.success("Post enviado para publicação!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao publicar: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline">Agendado</Badge>;
      case "processing":
        return <Badge className="bg-blue-600">Processando</Badge>;
      case "published":
        return <Badge className="bg-green-600">Publicado</Badge>;
      case "failed":
        return <Badge variant="destructive">Falha</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDateTime = (date: string, time: string) => {
    return `${date} às ${time}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Posts</h1>
          <p className="text-muted-foreground">Gerencie todos os posts agendados e publicados</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-48">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="scheduled">Agendados</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="published">Publicados</SelectItem>
                  <SelectItem value="failed">Falhas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Posts */}
      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter === "all" ? "Todos os Posts" : `Posts: ${statusFilter}`}
          </CardTitle>
          <CardDescription>
            {isLoading ? "Carregando..." : `${posts?.length || 0} posts encontrados`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum post encontrado
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => setLocation(`/posts/${post.id}`)}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{post.title}</h4>
                      {getStatusBadge(post.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(post.scheduledDate, post.scheduledTime)} • {post.videoFile}
                    </p>
                    {post.status === "published" && post.publishedUrl && (
                      <a
                        href={post.publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Ver no YouTube <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {post.status === "failed" && post.errorMessage && (
                      <p className="text-sm text-red-600">{post.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {post.status === "failed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryMutation.mutate({ id: post.id })}
                        disabled={retryMutation.isPending}
                      >
                        Reagendar
                      </Button>
                    )}
                    {post.status === "scheduled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => publishNowMutation.mutate({ id: post.id })}
                        disabled={publishNowMutation.isPending}
                      >
                        Publicar Agora
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

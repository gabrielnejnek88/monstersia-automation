import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Clock, XCircle, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);
  const { data: upcoming, isLoading: loadingUpcoming } = trpc.posts.upcoming.useQuery();
  const { data: publishedToday, isLoading: loadingPublished } = trpc.posts.publishedToday.useQuery();
  const { data: recentFailed, isLoading: loadingFailed } = trpc.posts.recentFailed.useQuery();
  const { data: schedulerStatus } = trpc.scheduler.status.useQuery();

  const formatDateTime = (date: string, time: string) => {
    return `${date} às ${time}`;
  };

  const getNextPosts = () => {
    if (!upcoming) return [];
    return upcoming.slice(0, 5);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema de automação</p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendados</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingUpcoming ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{upcoming?.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Posts aguardando publicação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publicados Hoje</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loadingPublished ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{publishedToday?.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Vídeos enviados com sucesso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhas Recentes</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loadingFailed ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{recentFailed?.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Posts com erro</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduler</CardTitle>
            <Youtube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedulerStatus?.running ? (
                <Badge variant="default" className="bg-green-600">Ativo</Badge>
              ) : (
                <Badge variant="destructive">Inativo</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {schedulerStatus?.processing ? "Processando..." : "Aguardando"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Próximos Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Próximos Posts Agendados
          </CardTitle>
          <CardDescription>
            Os 5 próximos vídeos que serão publicados automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUpcoming ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : getNextPosts().length === 0 ? (
            <Alert>
              <AlertDescription>
                Nenhum post agendado. Faça upload de uma planilha Excel para começar.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {getNextPosts().map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => navigate(`/posts/${post.id}`)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{post.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(post.scheduledDate, post.scheduledTime)} • {post.videoFile}
                    </p>
                  </div>
                  <Badge variant="outline">{post.platform}</Badge>
                </div>
              ))}
            </div>
          )}
          {upcoming && upcoming.length > 5 && (
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => navigate("/posts")}
            >
              Ver todos os posts agendados
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Posts Publicados Hoje */}
      {publishedToday && publishedToday.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Publicados Hoje
            </CardTitle>
            <CardDescription>
              Vídeos enviados com sucesso para o YouTube
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {publishedToday.slice(0, 5).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => navigate(`/posts/${post.id}`)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{post.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {post.publishedUrl && (
                        <a
                          href={post.publishedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Ver no YouTube
                        </a>
                      )}
                    </p>
                  </div>
                  <Badge className="bg-green-600">Publicado</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Falhas Recentes */}
      {recentFailed && recentFailed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Falhas Recentes
            </CardTitle>
            <CardDescription>
              Posts que falharam durante a publicação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentFailed.slice(0, 5).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => navigate(`/posts/${post.id}`)}
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{post.title}</h4>
                    <p className="text-sm text-red-600">
                      {post.errorMessage || "Erro desconhecido"}
                    </p>
                  </div>
                  <Badge variant="destructive">Falha</Badge>
                </div>
              ))}
            </div>
            {recentFailed.length > 5 && (
              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={() => navigate("/posts?status=failed")}
              >
                Ver todas as falhas
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { logout, generateSsoToken } from "@/lib/auth";
import type { AppInfo } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Leaf,
  LogOut,
  ArrowRight,
  ExternalLink,
  Loader2,
  ShieldCheck,
  LayoutGrid,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function AppCard({ app, index, onAccess }: { app: AppInfo; index: number; onAccess: (app: AppInfo) => void }) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (!app.directLink) setLoading(true);
    onAccess(app);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="group bg-white rounded-xl border border-border/60 shadow-sm hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
            {app.icon}
          </div>
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-1" data-testid={`text-app-name-${app.id}`}>
          {app.name}
        </h3>
        {app.description && (
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            {app.description}
          </p>
        )}

        <Button
          data-testid={`button-access-${app.id}`}
          onClick={handleClick}
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium shadow-sm transition-all duration-200"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Redirection...
            </>
          ) : app.directLink ? (
            <>
              Ouvrir
              <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </>
          ) : (
            <>
              Accéder
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

function AppCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-border/60 p-6">
      <Skeleton className="w-14 h-14 rounded-xl mb-4" />
      <Skeleton className="h-5 w-32 mb-2" />
      <Skeleton className="h-4 w-48 mb-5" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const { data: apps, isLoading: appsLoading } = useQuery<AppInfo[]>({
    queryKey: ["/api/apps"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } catch {
      setLoggingOut(false);
    }
  };

  const handleAppAccess = async (app: AppInfo) => {
    setAccessError(null);
    if (app.directLink) {
      window.open(app.url, "_blank");
      return;
    }
    try {
      const { token, redirectUrl } = await generateSsoToken(app.id);
      window.location.href = `${redirectUrl}?token=${token}`;
    } catch (err: any) {
      setAccessError(err.message || "Impossible d'accéder à cette application");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="w-full h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />

      <header className="bg-white/80 backdrop-blur-sm border-b border-border/40 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">FiltrePlante</h2>
              <p className="text-[11px] text-muted-foreground leading-tight">Portail Auth</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                {(user.nom || user.username).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground leading-tight" data-testid="text-username">
                  {user.nom || user.username}
                </p>
                <div className="flex items-center gap-1">
                  {user.role === "admin" && <ShieldCheck className="w-3 h-3 text-emerald-600" />}
                  <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              data-testid="button-logout"
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              {loggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <LayoutGrid className="w-5 h-5 text-emerald-600" />
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
              Mes applications
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Accédez à vos applications FiltrePlante en un clic
          </p>
        </motion.div>

        <AnimatePresence>
          {accessError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3"
            >
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive" data-testid="text-access-error">{accessError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {appsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <AppCardSkeleton key={i} />
            ))}
          </div>
        ) : apps && apps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {apps.map((app, i) => (
              <AppCard key={app.id} app={app} index={i} onAccess={handleAppAccess} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <LayoutGrid className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Aucune application</h3>
            <p className="text-sm text-muted-foreground">
              Contactez l'administrateur pour obtenir accès aux applications.
            </p>
          </motion.div>
        )}
      </main>

      <footer className="mt-auto border-t border-border/30 bg-white/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-muted-foreground">
            FiltrePlante &copy; {new Date().getFullYear()} — Authentification centralisée
          </p>
        </div>
      </footer>
    </div>
  );
}

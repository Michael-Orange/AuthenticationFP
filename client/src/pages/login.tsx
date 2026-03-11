import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { login, generateSsoToken } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Eye, EyeOff, Lock, User, Leaf } from "lucide-react";
import { motion } from "framer-motion";

interface UserOption {
  username: string;
  nom: string;
}

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedUsername, setSelectedUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const redirectApp = params.get("redirect");

  const { data: usersList, isLoading: usersLoading } = useQuery<UserOption[]>({
    queryKey: ["/api/auth/users"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    if (redirectApp) {
      setIsRedirecting(true);
      generateSsoToken(redirectApp)
        .then(({ token, redirectUrl }) => {
          window.location.href = `${redirectUrl}?token=${token}`;
        })
        .catch(() => {
          navigate("/dashboard");
        });
    } else {
      navigate("/dashboard");
    }
  }, [user, authLoading, redirectApp, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedUsername) {
      setError("Veuillez sélectionner un utilisateur");
      return;
    }
    if (!password) {
      setError("Veuillez entrer votre mot de passe");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(selectedUsername, password);

      if (redirectApp) {
        setIsRedirecting(true);
        try {
          const { token, redirectUrl } = await generateSsoToken(redirectApp);
          window.location.href = `${redirectUrl}?token=${token}`;
          return;
        } catch {
          navigate("/dashboard");
        }
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("401")) {
        setError("Identifiants invalides");
      } else {
        setError("Erreur de connexion. Veuillez réessayer.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <p className="text-sm text-muted-foreground">
            {isRedirecting ? "Redirection en cours..." : "Chargement..."}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col">
      <div className="w-full h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[420px]"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-200"
            >
              <Leaf className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              FiltrePlante
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Portail d'authentification centralisée
            </p>
          </div>

          <div className="bg-white rounded-xl border border-border/60 shadow-xl shadow-emerald-100/50 p-7">
            {redirectApp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-5 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg"
              >
                <p className="text-xs text-emerald-700">
                  Connectez-vous pour accéder à <span className="font-semibold capitalize">{redirectApp}</span>
                </p>
              </motion.div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-foreground">
                  Utilisateur
                </Label>
                <div className="relative">
                  <Select
                    value={selectedUsername}
                    onValueChange={(value) => {
                      setSelectedUsername(value);
                      setError(null);
                    }}
                  >
                    <SelectTrigger
                      id="username"
                      data-testid="select-username"
                      className="h-11 pl-10 bg-background"
                    >
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <SelectValue placeholder={usersLoading ? "Chargement..." : "Sélectionnez votre nom"} />
                    </SelectTrigger>
                    <SelectContent>
                      {usersList?.map((u) => (
                        <SelectItem
                          key={u.username}
                          value={u.username}
                          data-testid={`option-user-${u.username}`}
                        >
                          {u.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    data-testid="input-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pl-10 pr-10 h-11 bg-background"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                  />
                  <button
                    type="button"
                    data-testid="button-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-3.5 py-2.5 bg-destructive/10 border border-destructive/20 rounded-lg"
                >
                  <p className="text-sm text-destructive font-medium" data-testid="text-error">{error}</p>
                </motion.div>
              )}

              <Button
                type="submit"
                data-testid="button-login"
                disabled={isSubmitting || usersLoading}
                className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold shadow-md shadow-emerald-200 transition-all duration-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Connexion...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
          </div>

          <p className="text-center mt-6 text-xs text-muted-foreground">
            FiltrePlante &copy; {new Date().getFullYear()} — Authentification sécurisée
          </p>
        </motion.div>
      </div>
    </div>
  );
}

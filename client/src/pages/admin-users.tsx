import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Leaf,
  LogOut,
  ArrowLeft,
  Plus,
  Pencil,
  KeyRound,
  Trash2,
  Search,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  Users,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";

interface AdminUser {
  id: number;
  username: string;
  nom: string;
  email: string | null;
  peut_acces_stock: boolean;
  peut_acces_prix: boolean;
  peut_acces_construction: boolean;
  peut_admin_maintenance: boolean;
  role: string;
  actif: boolean;
  date_creation: string;
  derniere_connexion: string | null;
  created_by: string | null;
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "Jamais";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString("fr-FR");
}

const APP_BADGES = [
  { key: "peut_acces_stock", label: "Stock", icon: "📦", color: "bg-slate-100 text-slate-600 border-slate-200" },
  { key: "peut_acces_prix", label: "Prix", icon: "💰", color: "bg-stone-100 text-stone-600 border-stone-200" },
  { key: "peut_acces_construction", label: "Construction", icon: "🏗️", color: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  { key: "peut_admin_maintenance", label: "Maint. Admin", icon: "🔧", color: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  { key: "peut_acces_shelly", label: "Shelly Admin", icon: "⚡", color: "bg-amber-50 text-amber-700 border-amber-200" },
] as const;

export default function AdminUsersPage() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordResult, setPasswordResult] = useState<{ username: string; password: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    nom: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
    actif: true,
    peut_acces_stock: false,
    peut_acces_prix: false,
    peut_acces_construction: false,
    peut_admin_maintenance: false,
    peut_acces_shelly: false,
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isAuthenticated && user?.role === "admin",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/users", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setCreateOpen(false);
      setPasswordResult({ username: data.user.username, password: data.password });
      toast({ title: "Utilisateur créé", description: `${data.user.nom} a été ajouté.` });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditUser(null);
      toast({ title: "Utilisateur modifié" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, actif }: { id: number; actif: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, { actif });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: data.user.actif ? "Compte activé" : "Compte désactivé", description: data.user.nom });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      const res = await apiRequest("POST", `/api/admin/users/${id}/password`, { password });
      return res.json();
    },
    onSuccess: () => {
      setPasswordTarget(null);
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "Mot de passe modifié" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const openPasswordModal = async (u: AdminUser) => {
    setPasswordTarget(u);
    setCurrentPassword("");
    setNewPassword("");
    setPasswordLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/password`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCurrentPassword(data.password);
      }
    } catch {}
    setPasswordLoading(false);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeleteTarget(null);
      toast({ title: "Utilisateur supprimé" });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      if (search) {
        const s = search.toLowerCase();
        if (!u.username.toLowerCase().includes(s) && !u.nom.toLowerCase().includes(s)) return false;
      }
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "actif" && !u.actif) return false;
      if (statusFilter === "inactif" && u.actif) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const resetForm = () => {
    setFormData({
      username: "", nom: "", email: "", password: "", confirmPassword: "",
      role: "user", actif: true,
      peut_acces_stock: false, peut_acces_prix: false,
      peut_acces_construction: false, peut_admin_maintenance: false,
      peut_acces_shelly: false,
    });
  };

  const handleCreate = () => {
    if (!formData.username || !formData.nom || !formData.password) {
      toast({ title: "Champs requis manquants", variant: "destructive" });
      return;
    }
    if (formData.password.length < 8) {
      toast({ title: "Mot de passe trop court (min 8 caractères)", variant: "destructive" });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      username: formData.username,
      nom: formData.nom,
      email: formData.email || undefined,
      password: formData.password,
      role: formData.role,
      actif: formData.actif,
      permissions: {
        peut_acces_stock: formData.peut_acces_stock,
        peut_acces_prix: formData.peut_acces_prix,
        peut_acces_construction: formData.peut_acces_construction,
        peut_admin_maintenance: formData.peut_admin_maintenance,
        peut_acces_shelly: formData.peut_acces_shelly,
      },
    });
  };

  const handleEdit = () => {
    if (!editUser) return;
    updateMutation.mutate({
      id: editUser.id,
      nom: formData.nom,
      email: formData.email || null,
      role: formData.role,
      actif: formData.actif,
      permissions: {
        peut_acces_stock: formData.peut_acces_stock,
        peut_acces_prix: formData.peut_acces_prix,
        peut_acces_construction: formData.peut_acces_construction,
        peut_admin_maintenance: formData.peut_admin_maintenance,
        peut_acces_shelly: formData.peut_acces_shelly,
      },
    });
  };

  const openEditModal = (u: AdminUser) => {
    setFormData({
      username: u.username,
      nom: u.nom,
      email: u.email || "",
      password: "",
      confirmPassword: "",
      role: u.role,
      actif: u.actif,
      peut_acces_stock: u.peut_acces_stock,
      peut_acces_prix: u.peut_acces_prix,
      peut_acces_construction: u.peut_acces_construction,
      peut_admin_maintenance: u.peut_admin_maintenance,
      peut_acces_shelly: u.peut_acces_shelly,
    });
    setEditUser(u);
  };

  const copyPassword = async () => {
    if (!passwordResult) return;
    await navigator.clipboard.writeText(passwordResult.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    navigate("/login");
    return null;
  }

  if (user.role !== "admin") {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="w-full h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />

      <header className="bg-white/80 backdrop-blur-sm border-b border-border/40 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">FiltrePlante</h2>
              <p className="text-[11px] text-muted-foreground leading-tight">Administration</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              data-testid="button-back-dashboard"
              onClick={() => navigate("/dashboard")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                {(user.nom || user.username).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground leading-tight" data-testid="text-admin-username">
                  {user.nom || user.username}
                </p>
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-emerald-600" />
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-admin-title">
                Gestion des Utilisateurs
              </h1>
              {users && (
                <Badge variant="secondary" className="ml-2">{users.length}</Badge>
              )}
            </div>
            <Button
              data-testid="button-create-user"
              onClick={() => { resetForm(); setCreateOpen(true); }}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nouvel utilisateur
            </Button>
          </div>
        </motion.div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="input-search-users"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[130px] bg-white" data-testid="select-role-filter">
              <SelectValue placeholder="Rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] bg-white" data-testid="select-status-filter">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="actif">Actifs</SelectItem>
              <SelectItem value="inactif">Inactifs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {usersLoading ? (
          <div className="bg-white rounded-xl border border-border/60 p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-users">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Username</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nom</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rôle</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Applications</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Dernière connexion</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors" data-testid={`row-user-${u.id}`}>
                      <td className="px-4 py-3 font-mono text-xs">{u.username}</td>
                      <td className="px-4 py-3 font-medium">{u.nom}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{u.email || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role === "admin" ? "default" : "secondary"} className={u.role === "admin" ? "bg-blue-600" : ""}>
                          {u.role === "admin" && <ShieldCheck className="w-3 h-3 mr-1" />}
                          {u.role === "admin" ? "Admin" : "User"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {APP_BADGES.map((app) =>
                            (u as any)[app.key] ? (
                              <span key={app.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${app.color}`}>
                                {app.icon} {app.label}
                              </span>
                            ) : null
                          )}
                          {!APP_BADGES.some((app) => (u as any)[app.key]) && (
                            <span className="text-muted-foreground text-xs">Aucune</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            data-testid={`switch-active-${u.id}`}
                            checked={u.actif}
                            disabled={user?.id === u.id || toggleActiveMutation.isPending}
                            onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: u.id, actif: checked })}
                          />
                          <span className={`text-xs ${u.actif ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {u.actif ? "Actif" : "Inactif"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden xl:table-cell">
                        {formatRelativeDate(u.derniere_connexion)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-edit-${u.id}`}
                            onClick={() => openEditModal(u)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-password-${u.id}`}
                            onClick={() => openPasswordModal(u)}
                            className="h-8 w-8 text-muted-foreground hover:text-orange-600"
                            title="Voir / modifier le mot de passe"
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-delete-${u.id}`}
                            onClick={() => setDeleteTarget(u)}
                            disabled={user?.id === u.id}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        Aucun utilisateur trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) setCreateOpen(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvel utilisateur</DialogTitle>
            <DialogDescription>Créer un nouveau compte utilisateur</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-username">Username *</Label>
              <Input id="create-username" data-testid="input-create-username" value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="ex: jean" />
            </div>
            <div>
              <Label htmlFor="create-nom">Nom complet *</Label>
              <Input id="create-nom" data-testid="input-create-nom" value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })} placeholder="ex: Jean Dupont" />
            </div>
            <div>
              <Label htmlFor="create-email">Email</Label>
              <Input id="create-email" data-testid="input-create-email" type="email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="ex: jean@filtreplante.com" />
            </div>
            <div>
              <Label htmlFor="create-password">Mot de passe * (min 8 caractères)</Label>
              <Input id="create-password" data-testid="input-create-password" type="password" value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="create-confirm">Confirmer le mot de passe *</Label>
              <Input id="create-confirm" data-testid="input-create-confirm" type="password" value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />
            </div>
            <div>
              <Label>Rôle</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger data-testid="select-create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.actif} onCheckedChange={(v) => setFormData({ ...formData, actif: v })} data-testid="switch-create-actif" />
              <Label>Compte actif</Label>
            </div>
            <div>
              <Label className="mb-2 block">Permissions applications</Label>
              <div className="space-y-2">
                {APP_BADGES.map((app) => (
                  <div key={app.key} className="flex items-center gap-2">
                    <Switch
                      data-testid={`switch-create-${app.key}`}
                      checked={(formData as any)[app.key]}
                      onCheckedChange={(v) => setFormData({ ...formData, [app.key]: v })}
                    />
                    <span className="text-sm">{app.icon} {app.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} data-testid="button-cancel-create">Annuler</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-create"
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>Modifier les informations de {editUser?.username}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input value={formData.username} disabled className="bg-muted" />
            </div>
            <div>
              <Label htmlFor="edit-nom">Nom complet</Label>
              <Input id="edit-nom" data-testid="input-edit-nom" value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" data-testid="input-edit-email" type="email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <Label>Rôle</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}
                disabled={user?.id === editUser?.id}
              >
                <SelectTrigger data-testid="select-edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {user?.id === editUser?.id && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Vous ne pouvez pas modifier votre propre rôle
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.actif}
                onCheckedChange={(v) => setFormData({ ...formData, actif: v })}
                disabled={user?.id === editUser?.id}
                data-testid="switch-edit-actif"
              />
              <Label>Compte actif</Label>
              {user?.id === editUser?.id && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Non modifiable pour vous
                </p>
              )}
            </div>
            <div>
              <Label className="mb-2 block">Permissions applications</Label>
              <div className="space-y-2">
                {APP_BADGES.map((app) => (
                  <div key={app.key} className="flex items-center gap-2">
                    <Switch
                      data-testid={`switch-edit-${app.key}`}
                      checked={(formData as any)[app.key]}
                      onCheckedChange={(v) => setFormData({ ...formData, [app.key]: v })}
                    />
                    <span className="text-sm">{app.icon} {app.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {editUser && (
              <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
                <p>Créé le : {new Date(editUser.date_creation).toLocaleDateString("fr-FR")}</p>
                <p>Dernière connexion : {formatRelativeDate(editUser.derniere_connexion)}</p>
                {editUser.created_by && <p>Créé par : {editUser.created_by}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} data-testid="button-cancel-edit">Annuler</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending} data-testid="button-submit-edit"
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password View/Edit Modal */}
      <Dialog open={!!passwordTarget} onOpenChange={(open) => { if (!open) { setPasswordTarget(null); setCurrentPassword(""); setNewPassword(""); setCopied(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mot de passe — {passwordTarget?.username}</DialogTitle>
            <DialogDescription>
              Mot de passe actuel et possibilité de le changer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Mot de passe actuel</Label>
              {passwordLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <code className="flex-1 font-mono text-base tracking-wider select-all" data-testid="text-current-password">
                    {currentPassword || "—"}
                  </code>
                  <Button variant="ghost" size="icon" onClick={async () => { await navigator.clipboard.writeText(currentPassword); setCopied(true); setTimeout(() => setCopied(false), 2000); }} data-testid="button-copy-password">
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="new-password" className="text-xs text-muted-foreground mb-1 block">Nouveau mot de passe (optionnel)</Label>
              <Input
                id="new-password"
                data-testid="input-new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Laisser vide pour ne pas changer"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => { setPasswordTarget(null); setCurrentPassword(""); setNewPassword(""); setCopied(false); }}>
              Fermer
            </Button>
            {newPassword && (
              <Button
                data-testid="button-save-password"
                onClick={() => passwordTarget && changePasswordMutation.mutate({ id: passwordTarget.id, password: newPassword })}
                disabled={changePasswordMutation.isPending}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              >
                {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Enregistrer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Result Modal (after user creation) */}
      <Dialog open={!!passwordResult} onOpenChange={(open) => { if (!open) { setPasswordResult(null); setCopied(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Utilisateur créé</DialogTitle>
            <DialogDescription>
              Communiquez ce mot de passe à l'utilisateur <strong>{passwordResult?.username}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <code className="flex-1 font-mono text-lg tracking-wider select-all" data-testid="text-password-result">
              {passwordResult?.password}
            </code>
            <Button variant="ghost" size="icon" onClick={copyPassword} data-testid="button-copy-password-result">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => { setPasswordResult(null); setCopied(false); }}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{deleteTarget?.username}</strong> ({deleteTarget?.nom}) ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Annuler</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

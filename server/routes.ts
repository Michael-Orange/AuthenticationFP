import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import jwt from "jsonwebtoken";
import CryptoJS from "crypto-js";
import cookieParser from "cookie-parser";
import { getUserApps, type AuthUser, type AppInfo } from "@shared/schema";

const DEFAULT_APPS: AppInfo[] = [
  { id: "stock", name: "Gestion Stock", url: "https://stock.filtreplante.com", icon: "📦", description: "Gestion des stocks et inventaire" },
  { id: "prix", name: "Prix Référentiel", url: "https://produit.filtreplante.com", icon: "💰", description: "Référentiel des prix produits" },
  { id: "factures", name: "Factures", url: "https://factures-fp.replit.app", icon: "🧾", description: "Consultation des factures", directLink: true },
  { id: "maintenance", name: "Maintenance", url: "https://maintenance.filtreplante.com", icon: "🔧", description: "Suivi des interventions terrain", directLink: true },
  { id: "maintenance-admin", name: "Maintenance Admin", url: "https://maintenance.filtreplante.com/admin", icon: "⚙️", description: "Gestion des interventions de maintenance" },
  { id: "construction", name: "Calculateur Construction", url: "https://calculateur-construction-filtreplante.replit.app", icon: "🏗️", description: "Outil de calcul de matériaux pour projets de construction" },
  { id: "shelly", name: "Shelly Collector", url: "https://shelly-collector.filtreplante.com/dashboard", icon: "📡", description: "Tableau de bord Shelly Collector", directLink: true },
];

const SHELLY_USERS = ["michael", "marine", "fatou", "moussa"];

const FACTURES_USER_LINKS: Record<string, string> = {
  michael: "https://factures-fp.replit.app/michael_66a",
  marine: "https://factures-fp.replit.app/marine_7cf",
  fatou: "https://factures-fp.replit.app/fatou_7f4",
};

function getAvailableApps(): AppInfo[] {
  try {
    const envApps = process.env.AVAILABLE_APPS;
    if (envApps) return JSON.parse(envApps);
  } catch {}
  return DEFAULT_APPS;
}

function verifyPassword(plainPassword: string, encryptedPassword: string): boolean {
  try {
    const cryptoSecret = process.env.CRYPTO_SECRET;
    if (!cryptoSecret) throw new Error("CRYPTO_SECRET not configured");
    const decrypted = CryptoJS.AES.decrypt(encryptedPassword, cryptoSecret).toString(CryptoJS.enc.Utf8);
    return decrypted === plainPassword;
  } catch {
    return false;
  }
}

function encryptPassword(plainPassword: string): string {
  const cryptoSecret = process.env.CRYPTO_SECRET;
  if (!cryptoSecret) throw new Error("CRYPTO_SECRET not configured");
  return CryptoJS.AES.encrypt(plainPassword, cryptoSecret).toString();
}

function generateRandomPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  return secret;
}

function extractSessionUser(req: Request): AuthUser | null {
  const sessionToken = req.cookies.auth_session;
  if (!sessionToken) return null;
  try {
    const decoded = jwt.verify(sessionToken, getJwtSecret()) as any;
    if (decoded.type !== "session") return null;
    return {
      id: decoded.id,
      username: decoded.username,
      nom: decoded.nom,
      role: decoded.role,
      apps: decoded.apps,
    };
  } catch {
    return null;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = extractSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  (req as any).user = user;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthUser;
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Accès refusé : droits administrateur requis" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(cookieParser());

  app.get("/api/auth/users", async (_req, res) => {
    try {
      const activeUsers = await storage.getActiveUsers();
      res.json(activeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis" });
    }

    try {
      const user = await storage.getUserByUsername(username);

      if (!user) {
        return res.status(401).json({ error: "Identifiants invalides" });
      }

      const isPasswordValid = verifyPassword(password, user.password_encrypted);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Identifiants invalides" });
      }

      await storage.updateLastLogin(user.id);

      const apps = getUserApps(user);

      const sessionPayload: AuthUser = {
        id: user.id,
        username: user.username,
        nom: user.nom,
        role: user.role,
        apps,
      };

      const sessionToken = jwt.sign({ ...sessionPayload, type: "session" }, getJwtSecret(), {
        expiresIn: "7d",
      });

      res.cookie("auth_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        user: sessionPayload,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const sessionToken = req.cookies.auth_session;

    if (!sessionToken) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    try {
      const decoded = jwt.verify(sessionToken, getJwtSecret()) as any;
      if (decoded.type !== "session") {
        return res.status(401).json({ error: "Token invalide" });
      }
      const user: AuthUser = {
        id: decoded.id,
        username: decoded.username,
        nom: decoded.nom,
        role: decoded.role,
        apps: decoded.apps,
      };
      res.json(user);
    } catch {
      res.clearCookie("auth_session");
      return res.status(401).json({ error: "Session invalide" });
    }
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.clearCookie("auth_session");
    res.json({ success: true });
  });

  app.get("/api/auth/logout", (_req, res) => {
    const returnUrl = (typeof _req.query.returnUrl === "string" && _req.query.returnUrl) || null;
    res.clearCookie("auth_session");
    if (returnUrl) {
      res.redirect(returnUrl);
    } else {
      res.redirect("/login");
    }
  });

  app.get("/api/sso/generate", (req, res) => {
    const { app: appId } = req.query;

    if (!appId || typeof appId !== "string") {
      return res.status(400).json({ error: "Paramètre 'app' requis" });
    }

    const sessionToken = req.cookies.auth_session;
    if (!sessionToken) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    try {
      const decoded = jwt.verify(sessionToken, getJwtSecret()) as any;
      if (decoded.type !== "session") {
        return res.status(401).json({ error: "Token invalide" });
      }

      const user: AuthUser = {
        id: decoded.id,
        username: decoded.username,
        nom: decoded.nom,
        role: decoded.role,
        apps: decoded.apps,
      };

      const hasAccess = user.role === "admin" || user.apps.includes(appId);
      if (!hasAccess) {
        return res.status(403).json({
          error: `Vous n'avez pas accès à cette application. Contactez l'administrateur.`,
        });
      }

      const availableApps = getAvailableApps();
      const targetApp = availableApps.find((a) => a.id === appId);

      if (!targetApp) {
        return res.status(404).json({ error: "Application inconnue" });
      }

      const ssoToken = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          nom: user.nom,
          role: user.role,
          apps: user.apps,
          type: "sso",
          targetApp: appId,
        },
        getJwtSecret(),
        { expiresIn: "5m" }
      );

      res.json({
        token: ssoToken,
        redirectUrl: `${targetApp.url}/sso/login`,
      });
    } catch {
      res.status(401).json({ error: "Session invalide" });
    }
  });

  app.get("/api/apps", (req, res) => {
    const sessionToken = req.cookies.auth_session;
    if (!sessionToken) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    try {
      const decoded = jwt.verify(sessionToken, getJwtSecret()) as any;
      if (decoded.type !== "session") {
        return res.status(401).json({ error: "Token invalide" });
      }

      const user: AuthUser = {
        id: decoded.id,
        username: decoded.username,
        nom: decoded.nom,
        role: decoded.role,
        apps: decoded.apps,
      };

      const allApps = getAvailableApps();

      const APPS_FOR_ALL = ["maintenance"];

      const userApps = user.role === "admin"
        ? allApps
        : allApps.filter((app) =>
            user.apps.includes(app.id) || APPS_FOR_ALL.includes(app.id) || (app.id === "shelly" && SHELLY_USERS.includes(user.username))
          );

      const personalizedApps = userApps.map((app) => {
        if (app.id === "factures" && FACTURES_USER_LINKS[user.username]) {
          return { ...app, url: FACTURES_USER_LINKS[user.username] };
        }
        return app;
      });

      const facturesLink = FACTURES_USER_LINKS[user.username];
      const hasFactures = personalizedApps.some((a) => a.id === "factures");
      if (!hasFactures && facturesLink) {
        const facturesApp = allApps.find((a) => a.id === "factures");
        if (facturesApp) {
          personalizedApps.push({ ...facturesApp, url: facturesLink });
        }
      }

      res.json(personalizedApps);
    } catch {
      res.status(401).json({ error: "Session invalide" });
    }
  });

  // ==================== ADMIN ROUTES ====================

  app.get("/api/admin/users", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const sanitized = allUsers.map(({ password_encrypted, ...rest }) => rest);
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    const { username, nom, email, password, role, actif, permissions } = req.body;

    if (!username || !nom || !password) {
      return res.status(400).json({ error: "Username, nom et mot de passe requis" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères" });
    }

    try {
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ error: "Ce username existe déjà" });
      }

      const adminUser = (req as any).user as AuthUser;
      const encrypted = encryptPassword(password);

      const newUser = await storage.createUser({
        username: username.toLowerCase().trim(),
        nom,
        email: email || null,
        password_encrypted: encrypted,
        role: role || "user",
        actif: actif !== false,
        peut_acces_stock: permissions?.peut_acces_stock || false,
        peut_acces_prix: permissions?.peut_acces_prix || false,
        peut_acces_construction: permissions?.peut_acces_construction || false,
        peut_admin_maintenance: permissions?.peut_admin_maintenance || false,
        created_by: adminUser.username,
      });

      const { password_encrypted, ...sanitized } = newUser;
      res.json({ success: true, user: sanitized, temporaryPassword: password });
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Username ou email déjà utilisé" });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.patch("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const adminUser = (req as any).user as AuthUser;
    const { nom, email, role, actif, permissions } = req.body;

    if (adminUser.id === userId) {
      if (role && role !== "admin") {
        return res.status(400).json({ error: "Vous ne pouvez pas vous retirer le rôle admin" });
      }
      if (actif === false) {
        return res.status(400).json({ error: "Vous ne pouvez pas désactiver votre propre compte" });
      }
    }

    try {
      const updateData: any = {};
      if (nom !== undefined) updateData.nom = nom;
      if (email !== undefined) updateData.email = email || null;
      if (role !== undefined) updateData.role = role;
      if (actif !== undefined) updateData.actif = actif;
      if (permissions) {
        if (permissions.peut_acces_stock !== undefined) updateData.peut_acces_stock = permissions.peut_acces_stock;
        if (permissions.peut_acces_prix !== undefined) updateData.peut_acces_prix = permissions.peut_acces_prix;
        if (permissions.peut_acces_construction !== undefined) updateData.peut_acces_construction = permissions.peut_acces_construction;
        if (permissions.peut_admin_maintenance !== undefined) updateData.peut_admin_maintenance = permissions.peut_admin_maintenance;
      }

      const updated = await storage.updateUser(userId, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const { password_encrypted, ...sanitized } = updated;
      res.json({ success: true, user: sanitized });
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Email déjà utilisé par un autre utilisateur" });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.get("/api/admin/users/:id/password", requireAuth, requireAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);

    try {
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const cryptoSecret = process.env.CRYPTO_SECRET;
      if (!cryptoSecret) {
        return res.status(500).json({ error: "CRYPTO_SECRET non configuré" });
      }

      const decrypted = CryptoJS.AES.decrypt(user.password_encrypted, cryptoSecret).toString(CryptoJS.enc.Utf8);
      res.json({ password: decrypted });
    } catch (error) {
      console.error("Error decrypting password:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.post("/api/admin/users/:id/password", requireAuth, requireAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { password } = req.body;

    if (!password || password.length < 1) {
      return res.status(400).json({ error: "Mot de passe requis" });
    }

    try {
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      const encrypted = encryptPassword(password);
      await storage.updateUser(userId, { password_encrypted: encrypted });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const adminUser = (req as any).user as AuthUser;

    if (adminUser.id === userId) {
      return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
    }

    try {
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  });

  return httpServer;
}

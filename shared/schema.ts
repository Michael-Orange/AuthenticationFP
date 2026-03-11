import { pgTable, pgSchema, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";

export const referentiel = pgSchema("referentiel");

export const users = referentiel.table("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  nom: text("nom").notNull(),
  email: text("email"),
  password_encrypted: text("password_encrypted").notNull(),
  peut_acces_stock: boolean("peut_acces_stock").notNull().default(false),
  peut_acces_prix: boolean("peut_acces_prix").notNull().default(false),
  role: text("role").notNull().default("user"),
  actif: boolean("actif").notNull().default(true),
  date_creation: timestamp("date_creation").notNull().defaultNow(),
  derniere_connexion: timestamp("derniere_connexion"),
  created_by: text("created_by"),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Nom d'utilisateur requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type User = typeof users.$inferSelect;

export interface AppInfo {
  id: string;
  name: string;
  url: string;
  icon: string;
  description?: string;
}

export interface AuthUser {
  id: number;
  username: string;
  nom: string;
  role: string;
  apps: string[];
}

export function getUserApps(user: User): string[] {
  const apps: string[] = [];
  if (user.peut_acces_stock) apps.push("stock");
  if (user.peut_acces_prix) apps.push("prix");
  return apps;
}

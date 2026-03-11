import { pgTable, pgSchema, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const referentiel = pgSchema("referentiel");

export const users = referentiel.table("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  nom: text("nom"),
  password_hash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  apps: text("apps").array().default([]),
  last_login: timestamp("last_login"),
  created_at: timestamp("created_at").defaultNow(),
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
  nom: string | null;
  role: string;
  apps: string[] | null;
}

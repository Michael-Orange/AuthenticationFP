import { users, type User } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  getUserByUsername(username: string): Promise<User | undefined>;
  getActiveUsers(): Promise<{ username: string; nom: string }[]>;
  updateLastLogin(userId: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(data: {
    username: string;
    nom: string;
    email?: string | null;
    password_encrypted: string;
    role: string;
    actif: boolean;
    peut_acces_stock: boolean;
    peut_acces_prix: boolean;
    peut_acces_construction: boolean;
    peut_admin_maintenance: boolean;
    peut_acces_shelly: boolean;
    created_by?: string;
  }): Promise<User>;
  updateUser(id: number, data: Partial<{
    nom: string;
    email: string | null;
    role: string;
    actif: boolean;
    peut_acces_stock: boolean;
    peut_acces_prix: boolean;
    peut_acces_construction: boolean;
    peut_admin_maintenance: boolean;
    peut_acces_shelly: boolean;
    password_encrypted: string;
  }>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username), eq(users.actif, true)))
      .limit(1);
    return result[0];
  }

  async getActiveUsers(): Promise<{ username: string; nom: string }[]> {
    const result = await db
      .select({ username: users.username, nom: users.nom })
      .from(users)
      .where(eq(users.actif, true))
      .orderBy(users.nom);
    return result;
  }

  async updateLastLogin(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ derniere_connexion: new Date() })
      .where(eq(users.id, userId));
  }

  async getAllUsers(): Promise<User[]> {
    const result = await db
      .select()
      .from(users)
      .orderBy(users.nom);
    return result;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async createUser(data: {
    username: string;
    nom: string;
    email?: string | null;
    password_encrypted: string;
    role: string;
    actif: boolean;
    peut_acces_stock: boolean;
    peut_acces_prix: boolean;
    peut_acces_construction: boolean;
    peut_admin_maintenance: boolean;
    peut_acces_shelly: boolean;
    created_by?: string;
  }): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        username: data.username,
        nom: data.nom,
        email: data.email || null,
        password_encrypted: data.password_encrypted,
        role: data.role,
        actif: data.actif,
        peut_acces_stock: data.peut_acces_stock,
        peut_acces_prix: data.peut_acces_prix,
        peut_acces_construction: data.peut_acces_construction,
        peut_admin_maintenance: data.peut_admin_maintenance,
        peut_acces_shelly: data.peut_acces_shelly,
        created_by: data.created_by || null,
      })
      .returning();
    return result[0];
  }

  async updateUser(id: number, data: Partial<{
    nom: string;
    email: string | null;
    role: string;
    actif: boolean;
    peut_acces_stock: boolean;
    peut_acces_prix: boolean;
    peut_acces_construction: boolean;
    peut_admin_maintenance: boolean;
    peut_acces_shelly: boolean;
    password_encrypted: string;
  }>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ ...data, updated_at: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: number): Promise<void> {
    await db
      .delete(users)
      .where(eq(users.id, id));
  }
}

export const storage = new DatabaseStorage();

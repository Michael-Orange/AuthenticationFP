import { users, type User } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  getUserByUsername(username: string): Promise<User | undefined>;
  updateLastLogin(userId: number): Promise<void>;
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

  async updateLastLogin(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ derniere_connexion: new Date() })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();

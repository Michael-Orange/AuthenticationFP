import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";
import type { AuthUser } from "@shared/schema";

export async function login(username: string, password: string): Promise<{ success: boolean; user: AuthUser }> {
  const res = await apiRequest("POST", "/api/auth/login", { username, password });
  const data = await res.json();
  queryClient.setQueryData(["/api/auth/me"], data.user);
  return data;
}

export async function logout(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout");
  queryClient.setQueryData(["/api/auth/me"], null);
  queryClient.clear();
}

export async function generateSsoToken(appId: string): Promise<{ token: string; redirectUrl: string }> {
  const res = await fetch(`/api/sso/generate?app=${appId}`, { credentials: "include" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Erreur SSO");
  }
  return res.json();
}

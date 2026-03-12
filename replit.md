# FiltrePlante Auth - Portail d'Authentification Centralisée

## Overview
Centralized SSO authentication portal for all FiltrePlante internal applications. Manages login, user permissions, SSO token generation, and admin user management.

## Architecture
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Neon) - uses existing `referentiel.users` table
- **Auth:** JWT (jsonwebtoken) for sessions, CryptoJS AES for password verification (compatibility with existing apps)

## Key Files
- `shared/schema.ts` - Database schema (referentiel.users) and shared types
- `server/routes.ts` - API endpoints (auth, SSO, admin CRUD)
- `server/storage.ts` - Database storage layer with PostgreSQL connection
- `client/src/pages/login.tsx` - Login page with SSO redirect support
- `client/src/pages/dashboard.tsx` - App dashboard showing authorized applications
- `client/src/pages/admin-users.tsx` - Admin interface for user management (CRUD, permissions, password reset)
- `client/src/lib/auth.ts` - Frontend auth utilities (login, logout, SSO token generation)
- `client/src/hooks/use-auth.ts` - React hook for auth state

## API Endpoints
- `POST /api/auth/login` - Authenticate user, set auth_session cookie
- `GET /api/auth/me` - Check current session validity
- `POST /api/auth/logout` - Clear session cookie (API)
- `GET /api/auth/logout` - Clear session cookie and redirect (global logout from client apps)
- `GET /api/auth/users` - List active users (for login dropdown)
- `GET /api/sso/generate?app=<id>` - Generate SSO token for target app
- `GET /api/apps` - List authorized apps for current user
- `GET /api/admin/users` - List all users (admin only)
- `POST /api/admin/users` - Create user (admin only)
- `PATCH /api/admin/users/:id` - Update user (admin only)
- `POST /api/admin/users/:id/reset-password` - Reset password (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)

## SSO Flow
1. Client app redirects to `/login?redirect=<appId>`
2. User logs in (or auto-redirects if session exists)
3. Auth generates SSO token and redirects to target app's `/sso/login?token=XXX`

## Global Logout
Client apps redirect to `https://auth.filtreplante.com/api/auth/logout` to clear central session.

## Registered Apps
- **Stock** (`stock`) - SSO, permission: `peut_acces_stock`
- **Prix** (`prix`) - SSO, permission: `peut_acces_prix`
- **Factures** (`factures`) - Direct link, personalized URLs per user
- **Maintenance** (`maintenance`) - Direct link, visible to all authenticated users
- **Maintenance Admin** (`maintenance-admin`) - SSO, permission: `peut_admin_maintenance`
- **Construction** (`construction`) - SSO, permission: `peut_acces_construction`

## Database Schema (referentiel.users on Neon)
- `password_encrypted` - CryptoJS AES encrypted passwords (not hashed)
- `peut_acces_stock` / `peut_acces_prix` / `peut_acces_construction` / `peut_admin_maintenance` - Boolean permission flags
- `actif` - Boolean to enable/disable users
- `derniere_connexion` - Last login timestamp
- `role` - "admin" or "user"

## Environment Variables
- `DATABASE_URL` - Neon PostgreSQL connection string (shared with all apps)
- `JWT_SECRET` - Shared JWT secret (must be same across all FiltrePlante apps)
- `CRYPTO_SECRET` - AES encryption key for password verification
- `AVAILABLE_APPS` - JSON array of app configurations (optional, has defaults)

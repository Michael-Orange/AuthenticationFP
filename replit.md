# FiltrePlante Auth - Portail d'Authentification Centralisée

## Overview
Centralized SSO authentication portal for all FiltrePlante internal applications. Manages login, user permissions, and SSO token generation for seamless app-to-app navigation.

## Architecture
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Neon) - uses existing `referentiel.users` table
- **Auth:** JWT (jsonwebtoken) for sessions, CryptoJS SHA256 for password hashing (compatibility with existing apps)

## Key Files
- `shared/schema.ts` - Database schema (referentiel.users) and shared types
- `server/routes.ts` - API endpoints (auth/login, auth/me, auth/logout, sso/generate, apps)
- `server/storage.ts` - Database storage layer with PostgreSQL connection
- `client/src/pages/login.tsx` - Login page with SSO redirect support
- `client/src/pages/dashboard.tsx` - App dashboard showing authorized applications
- `client/src/lib/auth.ts` - Frontend auth utilities (login, logout, SSO token generation)
- `client/src/hooks/use-auth.ts` - React hook for auth state

## API Endpoints
- `POST /api/auth/login` - Authenticate user, set auth_session cookie
- `GET /api/auth/me` - Check current session validity
- `POST /api/auth/logout` - Clear session cookie
- `GET /api/sso/generate?app=<id>` - Generate SSO token for target app
- `GET /api/apps` - List authorized apps for current user

## SSO Flow
1. Client app redirects to `/login?redirect=<appId>`
2. User logs in (or auto-redirects if session exists)
3. Auth generates SSO token and redirects to target app's `/sso/login?token=XXX`

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Shared JWT secret (must be same across all FiltrePlante apps)
- `AVAILABLE_APPS` - JSON array of app configurations (optional, has defaults)

## Test Users (seeded)
- `michael` / `admin123` - Admin, access to all apps
- `cheikh` / `user123` - User, access to stock only
- `fatou` / `user123` - User, access to stock + prix

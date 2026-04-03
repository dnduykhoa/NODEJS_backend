# NODEJS_backend

Backend API built with Express + MongoDB, now using environment-based authentication configuration.

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Create environment file from template:

```bash
copy .env.example .env
```

3. Fill required values in `.env`:
- `MONGODB_URI`
- `JWT_SECRET`
- `SESSION_SECRET`
- `DEFAULT_ROLE_ID`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Optional values are documented in `.env.example`, including SMTP config for forgot-password emails.

4. Start server:

```bash
npm start
```

## Auth endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/google`
- `GET /auth/google/callback`

Protected routes (`/roles`, `/users`) require JWT in header:

```http
Authorization: Bearer <token>
```
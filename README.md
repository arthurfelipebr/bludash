# Blu Imports Dashboard

This project is an internal dashboard for Blu Imports. It is split into a React frontend (built with Vite) and a Node.js/Express backend that stores data in PostgreSQL.

## Requirements
- **Node.js** (version 18 or later)
- **PostgreSQL** server

## Quick Start (Development)

Follow the steps below in order:

1. **Clone the repository**
   ```bash
   git clone <repo-url> bluimports
   cd bluimports
   ```

2. **Install dependencies**
   ```bash
   npm install                 # frontend packages
   cd server && npm install    # backend packages
   cd ..
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your PostgreSQL details and a value for `JWT_SECRET`.
   Important keys:
   - `PORT` – backend port (default `3001`)
   - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` – PostgreSQL connection
   - `JWT_SECRET` – any random string used to sign tokens
   - `API_KEY` – optional Gemini API key

4. **Initialize the database**
   ```bash
   cd server
   npm run init-db            # creates tables
   cd ..
   ```

5. **Start the backend**
   ```bash
   cd server
   npm run dev                # uses nodemon
   ```

6. **Start the frontend** (in a new terminal)
   ```bash
   npm run dev                # Vite dev server on http://localhost:5173
   ```
   The dev server automatically proxies requests from `/api` to the backend.

After these steps, open `http://localhost:5173` in your browser to use the dashboard.

## Building for Production
1. Build the frontend:
   ```bash
   npm run build
   ```
   The compiled files are in the `dist/` folder.
2. Start the backend (consider using PM2 or another process manager):
   ```bash
   cd server
   npm start
   ```
3. Serve the `dist/` directory with a web server (Nginx/Apache) and proxy `/api` requests to the backend port.

## Directory Overview
- `App.tsx`, `features/`, `components/` – React source code
- `server/` – Express API and PostgreSQL setup
- `.env.example` – sample environment variables

## Sample `.env`
```env
PORT=3001
PGHOST=localhost
PGPORT=5432
PGUSER=seu_usuario
PGPASSWORD=sua_senha
PGDATABASE=bludb
JWT_SECRET=sua-chave-secreta
API_KEY=sua-chave-gemini
```

After following the steps above you should be able to register a user and start managing orders, clients and suppliers through the web interface.

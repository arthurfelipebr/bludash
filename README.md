# Blu Imports Dashboard

This project is an internal dashboard for Blu Imports. It is split into a React frontend (built with Vite) and a Node.js/Express backend that stores data in PostgreSQL.

## Requirements
- **Node.js** (version 18 or later)
- **PostgreSQL** server

## Quick Start (Development)

1. **Clone the repository**
   ```bash
   git clone <repo-url> bluimports
   cd bluimports
   ```
2. **Install dependencies**
   ```bash
   npm install            # installs frontend packages
   cd server && npm install   # installs backend packages (uses pg)
   cd ..
   ```
3. **Configure environment variables**
   Copy `.env.example` to `.env` and edit it with your PostgreSQL details and a `JWT_SECRET` value.
   ```bash
   cp .env.example .env
   ```
   Important keys:
   - `PORT` – backend port (default `3001`)
   - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` – PostgreSQL connection
   - `JWT_SECRET` – any random string used to sign tokens
   - `API_KEY` – optional Gemini API key
   - `VITE_API_PROXY` – optional URL for the backend when running `npm run dev`
4. **Initialize the database**
   ```bash
   cd server
   npm run init-db        # runs database.js which creates tables
   cd ..
   ```
5. **Run the application**
   - In one terminal, start the backend:
     ```bash
     cd server
     npm run dev          # uses nodemon
     ```
   - In another terminal, start the frontend:
     ```bash
     npm run dev          # Vite dev server on http://localhost:5173
     ```
   The frontend proxies `/api` requests to the URL in `VITE_API_PROXY` (defaults
   to `http://localhost:3001`).

Visit `http://localhost:5173` in your browser to begin using the dashboard.

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
VITE_API_PROXY=http://localhost:3001
```

After following the steps above you should be able to register a user and start managing orders, clients and suppliers through the web interface.

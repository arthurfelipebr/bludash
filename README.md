# Blu Imports Dashboard

An internal dashboard for Blu Imports to manage orders, track deliveries via a calendar, and analyze supplier price lists using Gemini AI.

**MAJOR ARCHITECTURAL CHANGE: This application now uses a Node.js/Express.js backend with an SQLite database instead of Firebase.**

## Technologies & Libraries Used

### Frontend:
*   React (loaded via ESM.sh CDN)
*   React DOM (loaded via ESM.sh CDN)
*   React Router DOM (loaded via ESM.sh CDN)
*   TypeScript (source files are `.tsx`)
*   Tailwind CSS (loaded via CDN)
*   Heroicons (loaded via CDN & inline SVGs)
*   `uuid` (loaded via ESM.sh CDN)

### Backend (New):
*   Node.js
*   Express.js (Web framework)
*   SQLite3 (Database engine, file-based)
*   `bcryptjs` (Password hashing)
*   `jsonwebtoken` (JWT for authentication)
*   `cors` (Cross-Origin Resource Sharing middleware)
*   `dotenv` (Environment variable management)
*   `@google/genai` (Google Gemini API client - **now used on the backend**)

### Development/Build:
*   Node.js and npm (or yarn)
*   `esbuild` (for frontend bundling, as per example)
*   `nodemon` (for backend development, optional)

## Project Structure Overview

*   **`/` (Root):** Contains frontend source files (`.tsx`, `index.html`, etc.) and build configuration (`package.json` for frontend).
*   **`/dist`:** Output directory for the bundled frontend application.
*   **`/server`:** Contains the new Node.js backend application.
    *   `server.js`: Main Express server file.
    *   `database.js`: SQLite database setup and schema initialization.
*   `package.json`: Backend dependencies and scripts.
*   `.env`: (Create this file from `.env.example`) For backend environment variables.

## Guia rápido: instalar e rodar (VPS)

Este é um resumo em português dos passos para colocar o projeto para funcionar em
uma VPS do zero. Consulte a seção seguinte para detalhes adicionais.

1. **Instale o Node.js** (exemplo para distribuições Ubuntu/Debian)
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone o repositório e entre na pasta**
   ```bash
   git clone <URL_DO_REPOSITORIO> bluimports
   cd bluimports
   ```

3. **Instale as dependências**
   ```bash
   npm install                # dependências do frontend
   cd server && npm install   # dependências do backend (inclui sqlite3)
   cd ..
   ```

4. **Crie o arquivo `.env`** a partir de `.env.example` e ajuste os valores
   conforme sua necessidade:
   - `PORT` - porta do backend (ex.: 3001)
   - `DATABASE_PATH` - caminho do arquivo SQLite (ex.: `./bluimports.db`)
   - `JWT_SECRET` - chave secreta para gerar tokens
   - `API_KEY` - chave da API Gemini

   ```bash
   cp .env.example .env
   ```

5. **Inicialize o banco de dados**
   ```bash
   cd server
   node database.js
   cd ..
   ```

6. **Construa o frontend**
   ```bash
   npm run build
   ```

7. **Inicie o backend** (para produção recomenda-se usar um gerenciador como PM2)
   ```bash
   cd server
   npm start
   ```

8. **Configure seu servidor web** (Nginx/Apache) para servir os arquivos de
   `dist` e encaminhar as rotas `/api` para `localhost:PORT`.

Após esses passos, a aplicação deve estar acessível via navegador.

## Setup & Deployment Steps

### 1. Backend Setup (Local Development & VPS Preparation)

1.  **Navigate to Backend Directory:**
    ```bash
    cd server
    ```

2.  **Install Backend Dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    *   Copy `.env.example` (in the project root, or create one in `server/` if preferred then adjust `server.js` `dotenv` path) to a new file named `.env`.
        ```bash
        cp ../.env.example .env 
        # Or, if .env.example is in root and you are in server/: cp ../.env.example .env
        ```
    *   Edit the `.env` file and provide your actual values:
        *   `PORT`: Port for the backend server (e.g., 3001).
        *   `DATABASE_PATH`: Path to your SQLite database file (e.g., `./bluimports.db` or an absolute path on your VPS).
        *   `JWT_SECRET`: **CRITICAL!** Generate a strong, random secret key for JWTs.
        *   `API_KEY`: Your Google Gemini API key. This is now used securely by the backend.

4.  **Initialize Database (First time):**
    The `server/database.js` script attempts to create tables if they don't exist when the server starts or when run directly. You can also run it manually:
    ```bash
    node database.js 
    ```
    This will create the `bluimports.db` (or your configured path) file with the necessary tables.

5.  **Run Backend Server (Development):**
    ```bash
    npm run dev 
    ```
    This uses `nodemon` to automatically restart the server on file changes.
    For production, you'll use `npm start` typically managed by a process manager like PM2.

### 2. Frontend Setup & Build

1.  **Navigate to Frontend (Root) Directory:**
    ```bash
    cd .. 
    ```

2.  **Install Frontend Build Tool (if not already done):**
    (Assuming `esbuild` as per previous `package.json` in root)
    If you have a `package.json` in the root for frontend:
    ```bash
    npm install 
    ```
    If not, set up `esbuild` as per prior README instructions (install `esbuild`, add build script to root `package.json`). The build script **no longer needs to inject the API_KEY**, as it's handled by the backend.
    Modify the frontend `package.json` build script:
    ```json
    "scripts": {
      "build": "esbuild index.tsx --bundle --outfile=dist/bundle.js --format=esm --platform=browser --jsx=automatic --loader:.ts=tsx --sourcemap",
      "start": "esbuild index.tsx --bundle --outfile=dist/bundle.js --servedir=dist --format=esm --platform=browser --jsx=automatic --loader:.ts=tsx --sourcemap"
    },
    ```

3.  **Build the Frontend:**
    ```bash
    npm run build
    ```
    This creates/updates the `/dist` directory with `index.html` and `bundle.js`. Ensure your `index.html` (the one that gets copied or is in `dist`) correctly references `./bundle.js`.

### 3. Deployment to VPS

1.  **Deploy Backend:**
    *   Copy the entire `/server` directory (including `node_modules` or run `npm install` on VPS) and your `.env` file to your VPS (e.g., into `/opt/bluimports-backend`).
    *   **On the VPS, inside the backend directory:**
        *   Ensure Node.js and npm are installed.
        *   Install production dependencies: `npm install --omit=dev`
        *   Use a process manager like PM2 to run your backend server reliably:
            ```bash
            sudo npm install -g pm2 # Install PM2 globally if not already
            pm2 start server.js --name bluimports-backend
            pm2 startup # To make PM2 auto-start on server reboot
            pm2 save
            ```

2.  **Deploy Frontend:**
    *   Copy the contents of your local `/dist` directory to your web server's document root on the VPS (e.g., `/var/www/bluimports`).

3.  **Configure Web Server (Nginx Example):**
    Your Nginx (or Apache) will now typically:
    *   Serve the static frontend files from `/var/www/bluimports`.
    *   Proxy API requests (e.g., requests to `/api/*`) to your backend Node.js server (running on `localhost:3001` or your configured backend port).

    Example Nginx server block (`/etc/nginx/sites-available/bluimports`):
    ```nginx
    server {
        listen 80;
        server_name your_domain_or_vps_ip;

        # Serve static frontend files
        location / {
            root /var/www/bluimports; # Path to frontend `dist` contents
            try_files $uri $uri/ /index.html; # For client-side routing
        }

        # Proxy API requests to the backend Node.js server
        location /api/ {
            proxy_pass http://localhost:3001; # Or your backend PORT
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
        
        # ... other configurations like SSL (HTTPS) ...
    }
    ```
    *   Remember to enable the site and restart Nginx.

4.  **Firewall:** Ensure your VPS firewall allows traffic on port 80 (HTTP), 443 (HTTPS), and potentially your backend port if accessed directly for any reason (though typically only `localhost` access is needed for the backend from Nginx).

### 4. Access Your Application
Navigate to `http://your_domain_or_vps_ip`.

## Important Considerations with SQLite & Backend

*   **Security:**
    *   Your Gemini API key is now much more secure on the backend.
    *   Ensure your `JWT_SECRET` is strong and kept private.
    *   Implement proper input validation and sanitization on all backend API endpoints.
*   **Database Backups:** SQLite is a file. Implement a strategy to regularly back up your `bluimports.db` file (e.g., using cron jobs and `rsync` or `cp`).
*   **Scalability:** SQLite is excellent for many applications but has limitations for very high-concurrency write scenarios. If your application grows significantly, you might eventually consider a client-server database (like PostgreSQL or MySQL).
*   **Real-time Features:** If real-time updates (like Firestore provided) are critical, you would need to implement WebSockets or similar technologies on your backend and frontend, which adds complexity. The current migration assumes a standard request-response API.
*   **Error Handling:** Robust error handling is needed on both the backend (sending appropriate HTTP status codes and error messages) and frontend (displaying user-friendly messages).
*   **Development Workflow:** You'll now typically run both the frontend dev server (e.g., `npm run start` in root) and the backend dev server (e.g., `npm run dev` in `/server`) concurrently. The frontend will make requests to the backend's API.

This new architecture provides more control and can be more cost-effective for hosting but involves managing a backend server.

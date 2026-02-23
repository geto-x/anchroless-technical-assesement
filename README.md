# AnchorLess Technical Assessment - Visa Dossier Upload

This repository contains:

- `visa-dossier-api`: Laravel API for dossier file upload, grouped listing, preview, and delete
- `visa-dossier-web`: React Router frontend (Remix-style data APIs) with Tailwind + shadcn/ui

## Tech Stack

- Backend: Laravel 12 (API only)
- Frontend: React + React Router data APIs (`loader`/`action` + `Form`) + TypeScript (`.ts/.tsx`)
- UI: Tailwind CSS + shadcn/ui components
- Notifications: shadcn toast (`use-toast` + `Toaster`)
- Storage: Laravel filesystem (`local` disk)
- Database: file metadata persisted in `dossier_files` table

## Backend Setup (`visa-dossier-api`)

1. Install dependencies:
   ```bash
   composer install
   ```
2. Create environment file:
   ```bash
   cp .env.example .env
   ```
3. Configure database in `.env`:
   - Recommended default:
   ```env
   DB_CONNECTION=sqlite
   SESSION_DRIVER=file
   CACHE_STORE=file
   QUEUE_CONNECTION=sync
   ```
   - Ensure `database/database.sqlite` exists.
4. Set frontend origin for CORS:
   ```env
   FRONTEND_URL=http://localhost:5173
   ```
5. Run migrations:
   ```bash
   php artisan migrate
   ```
6. Start API server:
   ```bash
   php artisan serve
   ```

API base URL: `http://127.0.0.1:8000/api`

## Frontend Setup (`visa-dossier-web`)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Start frontend:
   ```bash
   npm run dev
   ```

Frontend URL: `http://localhost:5173`

Git note:

- Root `.gitignore` is included for the monorepo workspace.
- Runtime/build artifacts and secrets are gitignored in both apps.
- Keep `.env.example` files committed as setup templates.

## What shadcn/ui and toast are used for

- shadcn/ui is used for consistent base UI primitives:
  - `Button` foundation via `src/components/ui/button.tsx`
  - `Card` sections via `src/components/ui/card.tsx`
  - `Input` for file input shell via `src/components/ui/input.tsx`
  - `Select` for category picker via `src/components/ui/select.tsx`
- Toast is used for non-blocking feedback for all mutations:
  - Upload success (includes uploaded filename + category)
  - Delete success (includes deleted filename + category)
  - Errors returned from API/action
  - Implemented via `src/hooks/use-toast.ts` and mounted `src/components/ui/toaster.tsx` in `src/main.tsx`

Frontend UI notes:

- File upload uses selection only (no drag and drop).
- Selected temporary file can be removed before upload.
- Delete action asks for confirmation and states the target dossier category before submitting.
- File rows are responsive: below `1440px` width, the delete button wraps below the file preview/metadata.
- Custom favicon is served from `visa-dossier-web/public/favicon.png`.
- `src/routes/dossier.tsx` includes concise comments on mutation flow, toast feedback handling, and delete safeguards.

## API Endpoints

- `POST /api/dossier-files`
  - Multipart fields:
    - `category`: `passport | photos | forms`
    - `file`: PDF/PNG/JPG, max 4MB
- `GET /api/dossier-files`
  - Returns files grouped by category
- `GET /api/dossier-files/{id}`
  - Streams file content for preview/download
- `DELETE /api/dossier-files/{id}`
  - Deletes from storage and database

## How To Test Upload & Delete

1. Run backend (`php artisan serve`) and frontend (`npm run dev` in `visa-dossier-web`).
2. Open `http://localhost:5173`.
3. Select category and click `Select file` to choose a valid file.
4. Optional: click `Delete` next to the selected temporary file to clear it before uploading.
5. Click `Upload`.
6. Verify:
   - Success toast appears.
   - File appears under its category section.
   - Images show thumbnail preview; PDFs display as filename link.
7. Click `Delete` on an uploaded file.
8. Verify:
   - Confirmation prompt appears before deletion and includes the file's dossier category.
   - Success toast appears after confirming.
   - File disappears from the list.
   - File row is removed from `dossier_files` database table.

## Backend Tests

Run:

```bash
cd visa-dossier-api
php artisan test
```

Included feature tests cover:

- Upload success + metadata persistence
- Validation (type/size)
- Grouped list response
- Delete from storage + database

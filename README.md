# DynamicFix

## ERP Dashboard and API

DynamicFix ERP includes a React dashboard prototype and a separate TypeScript/Express API backed by PostgreSQL and Prisma. The React app can use browser local storage or connect to the API. Set `VITE_API_BASE_URL` to enable API mode and authenticate against the configured backend.

## Requirements

- Node.js 20.19+ (or 22.12+) and npm
- Docker Compose, or a PostgreSQL 14+ instance

## Start the dashboard and API

Install dependencies and configure the local environment:

```sh
npm install
cp server/.env.example .env
```

Change `JWT_SECRET` to a unique random value of at least 32 characters and set a unique `ADMIN_PASSWORD` of at least 12 characters. Set `VITE_API_BASE_URL` in `.env` to the API origin (for example, `http://localhost:4000`) to enable sign-in and database-backed module records. Leave it empty to use browser-storage prototype mode. Start PostgreSQL and initialize its schema:

```sh
docker compose up -d postgres
npm run db:generate
npm run db:push
npm run db:seed
```

For a versioned initial migration instead of `db:push`, run `npm run db:migrate -- --name init` against a fresh database. Use `npm run db:deploy` to apply checked-in migrations in a deployment environment.

Run the API and dashboard in separate terminals:

```sh
npm run dev:server
npm run dev
```

The dashboard is served at `http://localhost:5173`; the API listens on `http://localhost:4000`. `npm run build` builds both the client and API. Run `npm run test:server` for backend module-validation tests. `npm run db:push` is intended for local development; use reviewed Prisma migrations for a production deployment.

## Backend API

The API uses the shared registry at [`shared/modules.ts`](./shared/modules.ts), so the client and server use the same list of module IDs, fields, and validation rules.

- `GET /api/health` — health check
- `POST /api/auth/login` — authenticate with the seeded administrator email and password
- `GET /api/auth/me` — current account, assigned roles, and permissions
- `GET /api/modules` — module catalog (requires `modules:read`)
- `GET /api/modules/:moduleId/records?page=1&limit=20&search=...` — search and paginate module records. Apply exact filters with `filterField=status&filterValue=Active`; use `includeArchived=true` to include archived items.
- `POST /api/modules/:moduleId/records` — add a validated record
- `GET /api/modules/:moduleId/records/:recordId` — view a record
- `PUT /api/modules/:moduleId/records/:recordId` — update a record
- `DELETE /api/modules/:moduleId/records/:recordId` — archive protected history modules; hard-delete other modules
- `POST /api/modules/:moduleId/records/:recordId/restore` — restore an archived record
- `/api/admin/users` and `/api/admin/roles` — manage API accounts, role assignments, and per-module permissions (requires `access:manage`)
- `GET /api/audit-logs?page=1&limit=20` — review immutable audit events (requires `records:audit-logs:read`)

Module record routes require a bearer access token and a matching permission such as `records:employees:read`, `records:employees:create`, `records:employees:update`, or `records:employees:delete`. A permission key of `*` grants full access. The initial administrator receives wildcard access. Login attempts are rate limited, passwords are hashed with bcrypt, request data is validated on the server, and mutations and role changes are written to the audit log in the same database transaction. The login limiter uses in-memory storage and should be replaced with a shared store when running multiple API instances. Export the currently filtered view to Excel or PDF from the dashboard; the API currently returns JSON records.

Authenticate and create a record with:

```sh
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@dynamicfix.local","password":"YOUR_ADMIN_PASSWORD"}'

curl -X POST http://localhost:4000/api/modules/employees/records \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sam Taylor","employeeId":"EMP-2001","department":"Operations","position":"Coordinator","email":"sam@example.com","status":"Active"}'
```

The API models records in a module-keyed JSON table to support the shared, configurable module registry. Before production use, model high-volume or tightly related business entities explicitly and review access policies, backups, retention, migrations, TLS, and secrets management. The API does not expose audit logs for editing.

## Modules

The dashboard includes administration (users, roles, permissions and departments), HR (employees, attendance, leaves and payroll), daily work (tasks, work logs and comments), projects, tenders (tenders, documents and work orders), training (students, courses, batches and trainers), trading (products, categories, suppliers and purchase orders), import/export (shipments, buyers and export orders), sales (customers, orders, invoices and returns), inventory (stores, warehouses, stock and stock movements), finance (accounts, transactions and expenses), reports (schedules and history), CRM, vendors, documents, notifications, audit logs, and settings.

## Browser prototype

When `VITE_API_BASE_URL` is empty, records in the dashboard are held in `localStorage` under `dynamicfix-erp-records`; **Reset sample data** restores its example data. In API mode, sign in with the seeded administrator account or another provisioned API user. The access token is kept in memory and expires with the API session, after which the app asks you to sign in again. Module lists use server-side search, exact filters, and pagination; Excel and PDF exports include all records matching the current search and filter. Employee, tender, and financial records can be archived and restored rather than permanently deleted.

## Publish the frontend with GitHub Pages

The workflow in `.github/workflows/pages.yml` builds and publishes the static frontend whenever changes are pushed to the `main` branch. In the GitHub repository, enable **Settings → Pages → Build and deployment → GitHub Actions**. The resulting site is available at `https://shaiknagurbabu.github.io/DynamicFix/`.

GitHub Pages hosts only the frontend. With no `VITE_API_BASE_URL` set in the Pages build, visitors use separate browser-local data; it does not publish or share the API, database, accounts, or records.

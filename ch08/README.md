# Chapter 8 Food Menu Manager

This app extends the existing React, Express, Prisma 7, and MariaDB project with JWT authentication, role-based menu management, ratings, and five-second menu polling.

## Configure the backend

Keep local credentials in `backend/.env`; do not commit that file. Start from `backend/.env.example` if needed. The current local `myshop` database already has its original `menu` and `type` tables. The additive migration creates only `user` and `rating`.

Set `JWT_KEY` in `backend/.env` to a private random value of at least 32 bytes. Generate one locally with:

```powershell
node -p "require('crypto').randomBytes(32).toString('hex')"
```

Copy that output into `JWT_KEY=`. The app does not contain or create a production signing key.

For a new empty database, run the migrations from `backend`:

```powershell
npm install
npx prisma migrate deploy
npx prisma generate
```

For another existing Chapter 7 database that has `menu` and `type` but no Prisma migration history, mark the baseline as applied once, then deploy the additive migration:

```powershell
npx prisma migrate resolve --applied 20261028000000_baseline_menu_type
npx prisma migrate deploy
npx prisma generate
```

## Start the app

In separate terminals:

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

The backend defaults to port 5000 and the Vite app to port 5173. Set `FRONTEND_ORIGIN` in the backend environment if the frontend uses a different origin.

## Create the first administrator

Register an ordinary account through `/register`, then promote that existing account from the backend directory:

```powershell
npm run promote-admin -- yourUserName
```

This local command uses the database credentials in `backend/.env`; there is no public administrator-creation endpoint. Registration always assigns the `user` role.

## API

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/menu` and `GET /api/type` are public; menu create/update/delete require an administrator.
- `GET /api/menu/:id/ratings` is public; rating create/update require a regular user.
- `GET /api/users` and `PATCH /api/users/:id/role` require an administrator.

Backend checks: `npm test`. Frontend checks: `npm run lint` and `npm run build`.

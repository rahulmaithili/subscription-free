# Subscriptly frontend

Netlify-ready React/Vite frontend for the subscription management migration.

## Local setup

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Add Firebase Web App values to `.env.local` to replace demo rows with the Firestore `subscriptions` collection. Each document should contain `customer`, `plan`, `amount`, `cycle`, `renewal`, `status`, and `initials` fields. This free setup uses Firebase Authentication and Firestore; Cloud Storage is intentionally not initialized because Firebase currently requires the Blaze plan for Storage.

## Netlify

The root `netlify.toml` already uses `frontend` as the build base. Set the `VITE_FIREBASE_*` values in Netlify environment variables, then deploy from the repository root.

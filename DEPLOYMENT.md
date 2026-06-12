# CVPRO Deployment Guide

## Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Google Cloud Platform (GCP) Account
- Meta Developer Account (for WhatsApp API)

---

## Local Development

### 1. Start Infrastructure
Start the PostgreSQL database and Redis cache using Docker Compose:
```bash
docker-compose up -d
```

### 2. Setup Backend
Navigate to the backend directory, install dependencies, and set up the database:
```bash
cd backend
npm install
cp .env.example .env

# Generate Prisma Client and push schema to the database
npx prisma generate
npx prisma db push

# Start the NestJS development server
npm run start:dev
```
The backend will be available at `http://localhost:3000/api/v1`.

### 3. Setup Frontend
Since the frontend uses native ES Modules and Import Maps, you don't need a bundler like Webpack or Vite. Simply serve the root directory using a static file server:
```bash
# From the root directory
npx serve .
# OR use VS Code Live Server extension
```

---

## Production Deployment (Google Cloud Platform)

### 1. Database (Cloud SQL)
1. Navigate to Cloud SQL in GCP Console.
2. Create a new PostgreSQL 15 instance.
3. Create a database named `cvpro` and a user.
4. Note the connection string for the `DATABASE_URL` environment variable.

### 2. Cache (Memorystore)
1. Navigate to Memorystore for Redis.
2. Create a new Redis instance.
3. Note the IP address and port for `REDIS_HOST` and `REDIS_PORT`.

### 3. Backend (Cloud Run)
1. Build and push the Docker image to Google Artifact Registry:
```bash
gcloud builds submit --tag gcr.io/[YOUR_PROJECT_ID]/cvpro-backend ./backend
```
2. Deploy the image to Cloud Run:
```bash
gcloud run deploy cvpro-backend \
  --image gcr.io/[YOUR_PROJECT_ID]/cvpro-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_URL=your_db_url,JWT_SECRET=your_secret,API_KEY=your_gemini_key"
```

### 4. Frontend Deployment
1. Update `services/api.ts` to point to your new Cloud Run URL instead of `localhost:3000`.
2. Deploy the static files (`index.html`, `*.tsx`, `*.ts`) to Firebase Hosting, Vercel, or a public GCS bucket.

### 5. WhatsApp Webhook Configuration
1. Go to your Meta App Dashboard -> WhatsApp -> Configuration.
2. Click "Edit" under Webhook.
3. Set the Callback URL to `https://[YOUR_CLOUD_RUN_URL]/api/v1/whatsapp/webhook`.
4. Set the Verify Token to the value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in your `.env`.
5. Subscribe to `messages` and `message_template_status_update` events.

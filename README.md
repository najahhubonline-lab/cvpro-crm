# CVPRO - WhatsApp AI CRM ![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)

CVPRO is a comprehensive, unified CRM system that integrates the WhatsApp Business API with Google Vertex AI (Gemini) to provide automated, intelligent customer support and broadcast management.

## Architecture
- **Unified Monolith:** NestJS serves the API, WebSockets, and the static React frontend on a single port (3000).
- **Frontend:** React 18, Tailwind CSS, Recharts.
- **Backend:** NestJS, TypeScript, Prisma ORM, PostgreSQL.
- **Queue/Cache:** Redis, BullMQ.
- **AI:** Google GenAI SDK (`gemini-2.5-flash`).

## Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Meta Developer Account (WhatsApp Business API)
- Google Cloud Platform Account (Vertex AI API Key)

## Quick Start (Local Development)
1. Copy `backend/.env.example` to `backend/.env` and fill in your keys.
2. Start infrastructure (PostgreSQL & Redis): 
   ```bash
   docker-compose up -d
   ```
3. Install dependencies and start the application:
   ```bash
   cd backend
   npm install
   npx prisma db push
   npm run start:dev
   ```
4. Access the application at `http://localhost:3000`

## Production Deployment
This project is fully configured for Google Cloud Run using Terraform. 
Please refer to [DEPLOYMENT.md](./DEPLOYMENT.md) and [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) for detailed infrastructure, CI/CD instructions, and production checklists.

# Railway + Neon deployment

Deploy from `feature/yusuf`; do not deploy from `main` until this branch is reviewed.

## Railway services

Create two Railway services from the same GitHub repo:

1. Backend service
   - Branch: `feature/yusuf`
   - Root Directory: `/`
   - Config File: `/railway.toml`
   - Public domain: generate one after the first deploy
   - Healthcheck: `/actuator/health`

2. Frontend service
   - Branch: `feature/yusuf`
   - Root Directory: `/frontend`
   - Config File: `/frontend/railway.toml`
   - Public domain: generate one after the first deploy
   - Healthcheck: `/api/health`

## Neon

Use the pooled Neon connection string when possible. The backend accepts Neon's
standard URL format:

```text
DATABASE_URL=postgresql://user:password@ep-example-pooler.region.aws.neon.tech/dbname?sslmode=require
```

You can also set Spring's JDBC URL directly:

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://ep-example-pooler.region.aws.neon.tech/dbname?sslmode=require
SPRING_DATASOURCE_USERNAME=user
SPRING_DATASOURCE_PASSWORD=password
```

Flyway runs automatically on backend startup.

## Backend variables

```text
SPRING_PROFILES_ACTIVE=prod
DATABASE_URL=postgresql://user:password@ep-example-pooler.region.aws.neon.tech/dbname?sslmode=require
SURVEYAI_WEB_ALLOWED_ORIGINS=https://your-frontend-domain.up.railway.app
SURVEYAI_SEED_ENABLED=false
SURVEYAI_CALLING_ACTIVE_PROVIDER=MOCK
SURVEYAI_CALLING_MOCK_ENABLED=true
SURVEYAI_CALLING_ELEVENLABS_ENABLED=false
```

For live ElevenLabs calls, also set:

```text
SURVEYAI_CALLING_ACTIVE_PROVIDER=ELEVENLABS
SURVEYAI_CALLING_ELEVENLABS_ENABLED=true
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=...
ELEVENLABS_PHONE_NUMBER_ID=...
ELEVENLABS_WEBHOOK_SECRET=...
PUBLIC_WEBHOOK_BASE_URL=https://your-backend-domain.up.railway.app
```

## Frontend variables

Set these before the frontend build:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.up.railway.app
INTERNAL_API_BASE_URL=https://your-backend-domain.up.railway.app
```

Redeploy the frontend after changing `NEXT_PUBLIC_API_BASE_URL`, because Next.js
inlines `NEXT_PUBLIC_` variables during build.

## First production login

Production disables seed data by default. If the Neon database is empty and you
want the temporary seeded owner account, set these backend variables for one
deploy:

```text
SURVEYAI_SEED_ENABLED=true
SURVEYAI_SEED_OWNER_EMAIL=owner@example.com
SURVEYAI_SEED_OWNER_PASSWORD=replace-with-a-long-random-password
```

After the seed account is created, set `SURVEYAI_SEED_ENABLED=false` again and
redeploy.

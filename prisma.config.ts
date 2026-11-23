// prisma.config.ts
// Prisma ORM v7 — configuration is centralised in this file.
// The `datasource.url` replaces the schema-level `url`/`directUrl` from v5.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'node prisma/seed.js',
  },
});

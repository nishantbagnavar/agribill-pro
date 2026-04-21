const path = require('path');
// Load .env from project root regardless of cwd
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.string().default('5000'),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  DB_PATH: z.string().default('./data/agribill.db'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;

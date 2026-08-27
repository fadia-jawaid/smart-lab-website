// import 'dotenv/config';
// import { z } from 'zod';

// const envSchema = z.object({
//   PORT:                  z.string().default('5000'),
//   NODE_ENV:              z.enum(['development', 'staging', 'production']).default('development'),
//   DATABASE_URL:          z.string().min(1, 'DATABASE_URL is required'),
//   JWT_SECRET:            z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
//   JWT_EXPIRES_IN:        z.string().default('7d'),
//   MQTT_BROKER:           z.string().default('mqtt://localhost:1883'),
//   MQTT_USER:             z.string().default(''),
//   MQTT_PASSWORD:         z.string().default(''),
//   CLIENT_URL:            z.string().default('http://localhost:5173'),
//   ANALYTICS_URL:         z.string().optional(),
//   ALERT_OVERDUE_MINUTES: z.coerce.number().default(30),
//   ALERT_LOW_STOCK_PCT:   z.coerce.number().default(20),
//   ALERT_LEAKAGE_GRAMS:   z.coerce.number().default(50),

// SMTP_HOST: z.string().default('sandbox.smtp.mailtrap.io'),
// SMTP_PORT: z.coerce.number().default(587),
// SMTP_USER: z.string().default(''),
// SMTP_PASS: z.string().default(''),
// SMTP_FROM: z.string().default('SmartLab <noreply@smartlab.com>'),




// });

// const parsed = envSchema.safeParse(process.env);

// if (!parsed.success) {
//   console.error('❌  Missing or invalid environment variables:');
//   console.error(parsed.error.flatten().fieldErrors);
//   process.exit(1);
// }

// export const env = parsed.data;




//new code for fogetton password to the gmail account


import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  MQTT_BROKER: z.string().default('mqtt://localhost:1883'),
  MQTT_USER: z.string().default(''),
  MQTT_PASSWORD: z.string().default(''),

  CLIENT_URL: z.string().default('http://localhost:5173'),
  ANALYTICS_URL: z.string().optional(),

  ALERT_OVERDUE_MINUTES: z.coerce.number().default(30),
  ALERT_LOW_STOCK_PCT: z.coerce.number().default(20),
  ALERT_LEAKAGE_GRAMS: z.coerce.number().default(50),

  // Gmail SMTP
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('SmartLab <noreply@smartlab.com>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Missing or invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
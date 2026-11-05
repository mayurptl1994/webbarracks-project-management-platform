import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  allowedOrigins: (process.env.ALLOWED_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(','),
  jwtSecret: process.env.SUPABASE_JWT_SECRET || 'webbarracks-super-secret-jwt-key-2025-local',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  isProduction: process.env.NODE_ENV === 'production'
};


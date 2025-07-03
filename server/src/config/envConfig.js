require('dotenv').config();

// Default configuration values
const DEFAULT_CONFIG = {
  PORT: 5000,
  NODE_ENV: 'development',
  JWT_ACCESS_TOKEN_SECRET: 'your_jwt_access_token_secret_key_here',
  JWT_ACCESS_TOKEN_EXPIRE: '15', // 15 minutes
  JWT_REFRESH_TOKEN_SECRET: 'your_jwt_refresh_token_secret_key_here',
  JWT_REFRESH_TOKEN_EXPIRE: '7', // 7 days
  COOKIE_EXPIRE: 7, // 7 days
  SMTP_PORT: 587,
  MAX_FILE_UPLOAD: 1000000, // 1MB
  CLIENT_URL: 'http://localhost:3000'
};

// Load environment variables with defaults
const env = {
  ...DEFAULT_CONFIG,
  ...process.env
};

// Required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_ACCESS_TOKEN_SECRET',
  'JWT_REFRESH_TOKEN_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'FILE_UPLOAD_PATH'
];

// Check for missing required variables
const missingVars = requiredEnvVars.filter(varName => !env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Export configuration
module.exports = {
  // Server configuration
  server: {
    port: parseInt(env.PORT, 10),
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    clientUrl: env.CLIENT_URL
  },
  
  // Database configuration
  database: {
    uri: env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false
    }
  },
  
  // JWT configuration
  jwt: {
    accessToken: {
      secret: env.JWT_ACCESS_TOKEN_SECRET,
      expiresIn: `${env.JWT_ACCESS_TOKEN_EXPIRE}m` // minutes
    },
    refreshToken: {
      secret: env.JWT_REFRESH_TOKEN_SECRET,
      expiresIn: `${env.JWT_REFRESH_TOKEN_EXPIRE}d` // days
    },
    cookieOptions: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: parseInt(env.COOKIE_EXPIRE) * 24 * 60 * 60 * 1000, // days to ms
      path: '/',
      domain: env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined
    }
  },
  
  // Email configuration
  email: {
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT, 10),
    secure: env.SMTP_SECURE === 'true',
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    },
    from: `"${env.EMAIL_FROM_NAME || 'MERN Blog'}" <${env.EMAIL_FROM}>`
  },
  
  // File upload configuration
  upload: {
    path: env.FILE_UPLOAD_PATH,
    maxFileSize: parseInt(env.MAX_FILE_UPLOAD, 10), 
  },
};

console.log(`Running in ${process.env.NODE_ENV} mode`);

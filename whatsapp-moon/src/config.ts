import dotenv from 'dotenv'
dotenv.config()

export const config = {
  lmsApiUrl: process.env.LMS_API_URL || 'http://localhost:8080/api',
  moonApiKey: process.env.MOON_API_KEY || '',
  logLevel: process.env.LOG_LEVEL || 'info',
}

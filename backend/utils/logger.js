import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  base: undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.newPassword',
      'token',
      'password',
      'password_hash',
    ],
    censor: '[REDACTED]',
  },
});

export default logger;

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, json } = format;
const config = require('@config/envConfig');

const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level}]: ${message} ${metaString}`.trim();
});

const productionFormat = combine(timestamp(), json());

const developmentFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  consoleFormat
);

const logger = createLogger({
  level: config.server.isProduction ? 'info' : 'debug',
  format: config.server.isProduction ? productionFormat : developmentFormat,
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
  exitOnError: false
});

if (!config.server.isProduction) {
  logger.add(new transports.Console({
    format: developmentFormat
  }));
}

const fs = require('fs');
const path = require('path');
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

module.exports = logger;

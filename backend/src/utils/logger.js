'use strict';

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const env = require('../config/env');
const { getRequestId } = require('./requestContext');

const { combine, timestamp, colorize, printf, json, errors, splat, format } = winston.format;

/**
 * Auto-tag every log line with the current request's requestId
 * (pulled from AsyncLocalStorage). Outside a request, no-op.
 */
const addRequestId = format((info) => {
  if (!info.requestId) {
    const rid = getRequestId();
    if (rid) info.requestId = rid;
  }
  return info;
});

const devFormat = combine(
  addRequestId(),
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss.SSS' }),
  errors({ stack: true }),
  splat(),
  printf(({ level, message, timestamp: ts, stack, requestId, ...meta }) => {
    const reqStr = requestId ? ` [${String(requestId).slice(0, 8)}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${ts}${reqStr} ${level}: ${message}${metaStr}${stackStr}`;
  })
);

const prodFormat = combine(
  addRequestId(),
  timestamp(),
  errors({ stack: true }),
  splat(),
  json()
);

const transports = [
  new winston.transports.Console({
    format: env.isProduction ? prodFormat : devFormat,
    handleExceptions: true,
    handleRejections: true,
  }),
];

if (env.isProduction) {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d',
      maxSize: '20m',
      zippedArchive: true,
      format: prodFormat,
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
      zippedArchive: true,
      format: prodFormat,
    })
  );
}

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  transports,
  exitOnError: false,
  silent: env.isTest,
});

module.exports = logger;

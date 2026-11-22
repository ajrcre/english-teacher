import pino from "pino";

/**
 * Structured logger. Convention: the message is static text and all dynamic
 * data goes in the fields object, e.g.
 *   logger.info("answer graded", { studentId, itemId, verdict })
 */
const base = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
  base: undefined,
});

type Fields = Record<string, unknown>;

export const logger = {
  debug: (message: string, fields: Fields = {}) => base.debug(fields, message),
  info: (message: string, fields: Fields = {}) => base.info(fields, message),
  warn: (message: string, fields: Fields = {}) => base.warn(fields, message),
  error: (message: string, fields: Fields = {}) => base.error(fields, message),
};

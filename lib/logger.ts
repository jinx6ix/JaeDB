// lib/logger.ts - Centralized logging utility
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  error?: Error;
  stack?: string;
  [key: string]: any;
}

export interface LoggerOptions {
  userId?: string;
  userEmail?: string;
  context?: LogContext;
  ipAddress?: string;
  userAgent?: string;
}

export async function log(
  level: LogLevel,
  message: string,
  options: LoggerOptions = {}
): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress = options.ipAddress || headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = options.userAgent || headersList.get('user-agent') || 'unknown';

    let contextString: string | null = null;
    if (options.context) {
      if (options.context.error instanceof Error) {
        contextString = JSON.stringify({
          ...options.context,
          error: {
            name: options.context.error.name,
            message: options.context.error.message,
            stack: options.context.error.stack,
          },
        });
      } else {
        contextString = JSON.stringify(options.context);
      }
    }

    await prisma.log.create({
      data: {
        level,
        message,
        context: contextString,
        userId: options.userId || null,
        userEmail: options.userEmail || null,
        ipAddress: ipAddress !== 'unknown' ? ipAddress : null,
        userAgent: userAgent !== 'unknown' ? userAgent : null,
      },
    });
  } catch (err) {
    console.error('[Logger] Failed to write log to database:', err);
  }
}

export async function logInfo(message: string, options?: LoggerOptions): Promise<void> {
  await log('INFO', message, options);
}

export async function logWarn(message: string, options?: LoggerOptions): Promise<void> {
  await log('WARN', message, options);
}

export async function logError(message: string, options?: LoggerOptions): Promise<void> {
  await log('ERROR', message, options);
}

export async function logDebug(message: string, options?: LoggerOptions): Promise<void> {
  await log('DEBUG', message, options);
}

export function createLogger(defaultOptions: LoggerOptions = {}) {
  return {
    info: (message: string, opts?: LoggerOptions) => logInfo(message, { ...defaultOptions, ...opts }),
    warn: (message: string, opts?: LoggerOptions) => logWarn(message, { ...defaultOptions, ...opts }),
    error: (message: string, opts?: LoggerOptions) => logError(message, { ...defaultOptions, ...opts }),
    debug: (message: string, opts?: LoggerOptions) => logDebug(message, { ...defaultOptions, ...opts }),
  };
}
import type { LogLevel } from '../types/canvasTypes';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
}

const MAX_LOGS = 1000;
const logs: LogEntry[] = [];
const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

function addLog(level: LogLevel, message: string, data?: any) {
  const entry: LogEntry = { level, message, data, timestamp: Date.now() };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
  if (isDev) {
    const fn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
    fn(`[Canvas ${level}] ${message}`, data ?? '');
  }
}

export const logger = {
  debug: (msg: string, data?: any) => addLog('DEBUG', msg, data),
  info: (msg: string, data?: any) => addLog('INFO', msg, data),
  warn: (msg: string, data?: any) => addLog('WARN', msg, data),
  error: (msg: string, data?: any) => addLog('ERROR', msg, data),
  getLogs: () => [...logs],
};

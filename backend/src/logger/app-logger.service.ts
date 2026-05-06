import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

export interface LogEntry {
  timestamp: string;
  module: string;
  type: string;
  url: string;
  action: string;
  status: 'success' | 'error';
  statusCode?: number;
  message?: string;
  email?: string;
}

@Injectable()
export class AppLoggerService {
  private readonly logsDir = path.join(process.cwd(), 'logs');

  private getMoscowTime(): string {
    return new Date().toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  private getLogFileName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `logs-${year}-${month}-${day}.json`;
  }

  async log(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
    const logFilePath = path.join(this.logsDir, this.getLogFileName());
    const fullEntry: LogEntry = {
      timestamp: this.getMoscowTime(),
      ...entry,
    };

    if (!existsSync(this.logsDir)) {
      await fs.mkdir(this.logsDir, { recursive: true });
    }

    let logs: LogEntry[] = [];

    if (existsSync(logFilePath)) {
      try {
        const fileContent = await fs.readFile(logFilePath, 'utf8');
        logs = fileContent ? JSON.parse(fileContent) : [];
      } catch (e) {
        logs = [];
      }
    }

    logs.push(fullEntry);

    await fs.writeFile(logFilePath, JSON.stringify(logs, null, 2), 'utf8');
  }
}
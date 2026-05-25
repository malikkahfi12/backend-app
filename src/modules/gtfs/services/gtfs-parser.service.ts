import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GtfsParserService {
  parseDirectory(dirPath: string): Map<string, Record<string, string>[]> {
    const result = new Map<string, Record<string, string>[]>();
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.txt'));

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const rows = this.parseFile(filePath);
      result.set(file, rows);
    }

    return result;
  }

  parseFile(filePath: string): Record<string, string>[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = this.splitLines(content);
    if (lines.length === 0) return [];

    const headers = this.parseRow(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = this.parseRow(line);
      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = j < values.length ? values[j].trim() : '';
      }
      rows.push(row);
    }

    return rows;
  }

  private splitLines(content: string): string[] {
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  }

  private parseRow(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
}

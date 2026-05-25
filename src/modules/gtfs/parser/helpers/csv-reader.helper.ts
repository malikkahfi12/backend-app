import { Injectable } from '@nestjs/common';
import * as csv from 'fast-csv';

@Injectable()
export class CsvReaderHelper {
  async parseBuffer(buffer: Buffer): Promise<Record<string, string>[]> {
    const rows: Record<string, string>[] = [];

    return new Promise((resolve, reject) => {
      csv
        .parseString(buffer.toString('utf-8'), {
          headers: true,
          trim: true,
          ignoreEmpty: true,
        })
        .on('error', (error: Error) => reject(error))
        .on('data', (row: Record<string, string>) => rows.push(row))
        .on('end', () => resolve(rows));
    });
  }
}

import { Injectable } from '@nestjs/common';
import AdmZip = require('adm-zip');
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class GtfsZipExtractorService {
  extract(buffer: Buffer): Map<string, Buffer> {
    const files = new Map<string, Buffer>();
    const zip = new AdmZip(buffer);

    const entries = zip.getEntries();
    for (const entry of entries) {
      if (!entry.isDirectory && entry.entryName.endsWith('.txt')) {
        const fileName = path.basename(entry.entryName);
        files.set(fileName, entry.getData());
      }
    }

    return files;
  }

  extractToTemp(buffer: Buffer): {
    dirPath: string;
    files: Map<string, string>;
  } {
    const dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'gtfs-import-'));
    const files = new Map<string, string>();
    const zip = new AdmZip(buffer);

    const entries = zip.getEntries();
    for (const entry of entries) {
      if (!entry.isDirectory && entry.entryName.endsWith('.txt')) {
        const fileName = path.basename(entry.entryName);
        const filePath = path.join(dirPath, fileName);
        fs.writeFileSync(filePath, entry.getData());
        files.set(fileName, filePath);
      }
    }

    return { dirPath, files };
  }

  cleanup(dirPath: string): void {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
    } catch {
      // best effort cleanup
    }
  }
}

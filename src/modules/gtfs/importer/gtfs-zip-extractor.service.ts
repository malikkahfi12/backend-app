import { Injectable } from '@nestjs/common';
import { unzipSync } from 'fflate';
import * as path from 'path';

@Injectable()
export class GtfsZipExtractorService {
  extract(buffer: Buffer): Map<string, Buffer> {
    const files = new Map<string, Buffer>();
    const entries = unzipSync(new Uint8Array(buffer), {
      filter(file) {
        return file.name.endsWith('.txt');
      },
    });

    for (const [entryName, data] of Object.entries(entries)) {
      const fileName = path.basename(entryName);
      files.set(fileName, Buffer.from(data));
    }

    return files;
  }
}

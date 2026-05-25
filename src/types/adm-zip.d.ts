declare module 'adm-zip' {
  interface AdmZipEntry {
    entryName: string;
    isDirectory: boolean;
    getData(): Buffer;
  }

  class AdmZip {
    constructor(buffer: Buffer);
    getEntries(): AdmZipEntry[];
  }

  export = AdmZip;
}

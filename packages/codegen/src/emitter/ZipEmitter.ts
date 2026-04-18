import type { OutputFile } from '../types';
import type JSZip from 'jszip';

export async function createZip(
  files: OutputFile[],
  folderName: string,
): Promise<Blob> {
  const JSZipModule = await import('jszip');
  const JSZip = JSZipModule.default;
  const zip = new JSZip();
  const folder = zip.folder(folderName)!;
  for (const file of files) {
    folder.file(file.path, file.content);
  }
  return zip.generateAsync({ type: 'blob' });
}

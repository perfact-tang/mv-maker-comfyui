import { ParsedProjectFile, parseProjectFile } from './projectArchive';

export const parseMVData = (jsonString: string): Promise<ParsedProjectFile> => (
  Promise.resolve().then(() => parseProjectFile(jsonString))
);

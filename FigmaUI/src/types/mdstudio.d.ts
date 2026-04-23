interface MdStudioFileResult {
  canceled: boolean;
  path?: string;
  name?: string;
  content?: string;
}

interface MdStudioSaveResult {
  canceled: boolean;
  path?: string;
  name?: string;
}

interface MdStudioApi {
  openFileDialog: () => Promise<MdStudioFileResult>;
  saveFile: (payload: { path?: string | null; suggestedName?: string; content: string }) => Promise<MdStudioSaveResult>;
  readFile: (filePath: string) => Promise<MdStudioFileResult>;
  getLaunchFile: () => Promise<string | null>;
  onOpenFilePath: (callback: (filePath: string) => void) => () => void;
}

interface Window {
  mdStudio?: MdStudioApi;
}

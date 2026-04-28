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

interface MdStudioPdfResult {
  canceled: boolean;
  path?: string;
  error?: string;
}

interface MdStudioCloseStatePayload {
  hasUnsavedChanges: boolean;
  fileName: string;
  canOverwrite: boolean;
}

interface MdStudioCloseSaveRequestPayload {
  requestId: string;
  mode: 'save' | 'saveAs';
}

interface MdStudioCloseSaveResultPayload {
  requestId: string;
  success: boolean;
}

interface MdStudioApi {
  openFileDialog: () => Promise<MdStudioFileResult>;
  saveFile: (payload: { path?: string | null; suggestedName?: string; content: string }) => Promise<MdStudioSaveResult>;
  readFile: (filePath: string) => Promise<MdStudioFileResult>;
  getLaunchFile: () => Promise<string | null>;
  confirmSaveBeforePdf: () => Promise<number>;
  exportPdf: (payload: { suggestedFileName: string }) => Promise<MdStudioPdfResult>;
  setCloseState: (payload: MdStudioCloseStatePayload) => void;
  reportCloseSaveResult: (payload: MdStudioCloseSaveResultPayload) => void;
  onCloseSaveRequest: (callback: (payload: MdStudioCloseSaveRequestPayload) => void) => () => void;
  onOpenFilePath: (callback: (filePath: string) => void) => () => void;
}

interface Window {
  mdStudio?: MdStudioApi;
}

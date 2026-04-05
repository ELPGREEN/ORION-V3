export interface TemplateDocumentData {
  title?: string;
  content?: string;
  [key: string]: any;
}

export async function generateTemplateDocumentPDF(data: TemplateDocumentData): Promise<Blob> {
  return new Blob(["Template Document"], { type: "application/pdf" });
}

export default generateTemplateDocumentPDF;

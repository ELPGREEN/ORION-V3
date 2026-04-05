export async function generateLOI(data: any): Promise<Blob> {
  return new Blob(["LOI Document"], { type: "application/pdf" });
}

export const generateLOIPDF = generateLOI;

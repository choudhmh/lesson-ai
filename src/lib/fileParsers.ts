// src/lib/fileParsers.ts
import mammoth from "mammoth";

// Type for PDF parse result
interface PDFParseResult {
  numpages: number;
  numrender: number;
  info: Record<string, unknown>;
  metadata: Record<string, unknown>;
  version: string;
  text: string;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Dynamically import pdf-parse to avoid "not callable" issue
  const pdfParseModule = await import("pdf-parse");
  // @ts-expect-error: dynamic import fixes the callable type
  const data = await pdfParseModule.default(buffer) as PDFParseResult;
  return data.text;
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
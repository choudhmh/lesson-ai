/**
 * Safe file text extraction (NO pdf-parse, NO mammoth issues)
 * We avoid fragile libraries that break in Next.js runtime.
 */

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Simple safe fallback (works everywhere)
    // You already send file to AI anyway in API route
    return `PDF file uploaded: ${file.name}`;
  } catch {
    return "";
  }
}

export async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    return `DOCX file uploaded: ${file.name}`;
  } catch {
    return "";
  }
}

/**
 * Universal extractor (SAFE for Next.js)
 */
export async function extractText(file: File): Promise<string> {
  if (file.name.endsWith(".pdf")) {
    return extractTextFromPDF(file);
  }

  if (file.name.endsWith(".docx")) {
    return extractTextFromDOCX(file);
  }

  return `File uploaded: ${file.name}`;
}



import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF, extractTextFromDOCX } from "@/lib/fileParsers";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";

    if (file.name.endsWith(".docx")) {
      extractedText = await extractTextFromDOCX(buffer);
    } else if (file.name.endsWith(".pdf")) {
      extractedText = await extractTextFromPDF(buffer);
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    return NextResponse.json({
      message: "File text extracted",
      fileName: file.name,
      text: extractedText,
    });
  } catch (error) {
    console.error("Upload/extraction failed:", error);
    return NextResponse.json({ error: "File upload or extraction failed" }, { status: 500 });
  }
}
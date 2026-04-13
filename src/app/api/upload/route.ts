import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF, extractTextFromDOCX } from "@/lib/fileParsers";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    let extractedText = "";

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".docx")) {
      extractedText = await extractTextFromDOCX(file);
    } else if (fileName.endsWith(".pdf")) {
      extractedText = await extractTextFromPDF(file);
    } else {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "File text extracted",
      fileName: file.name,
      text: extractedText,
    });
  } catch (error) {
    console.error("Upload/extraction failed:", error);

    return NextResponse.json(
      { error: "File upload or extraction failed" },
      { status: 500 }
    );
  }
}
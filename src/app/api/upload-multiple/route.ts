export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return Response.json({ error: "No files uploaded" }, { status: 400 });
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "text/plain",
    ];

    // Validate types
    const invalidFiles = files.filter((file) => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      return Response.json(
        {
          error: "Invalid file type",
          invalidFiles: invalidFiles.map((f) => ({ name: f.name, type: f.type })),
        },
        { status: 400 }
      );
    }

    // Validate sizes
    const MAX_SIZE = 5 * 1024 * 1024;
    const oversizedFiles = files.filter((file) => file.size > MAX_SIZE);
    if (oversizedFiles.length > 0) {
      return Response.json(
        {
          error: "File too large (max 5MB per file)",
          oversizedFiles: oversizedFiles.map((f) => ({ name: f.name, size: f.size })),
        },
        { status: 400 }
      );
    }

    // Process contents
    const combinedTextParts: string[] = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (file.type === "text/plain") {
        combinedTextParts.push(buffer.toString("utf-8"));
      } else {
        // Placeholder until you add PDF/Word parsing
        combinedTextParts.push(`[${file.name} uploaded: ${file.type}]`);
      }
    }
    const combinedText = combinedTextParts.join("\n\n");

    // Normalize info
    const processedFiles = files.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      category: getFileCategory(file.type),
    }));

    return Response.json(
      {
        message: "Files uploaded and validated successfully",
        count: processedFiles.length,
        files: processedFiles,
        text: combinedText, // frontend uses this for question generation
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Upload error:", err);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}

function getFileCategory(type: string) {
  if (type === "application/pdf") return "pdf";
  if (
    type === "application/msword" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "document";
  }
  if (type.startsWith("image/")) return "image";
  if (type === "text/plain") return "text";
  return "other";
}

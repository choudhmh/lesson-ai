import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Clean ```json
function clean(content: string) {
  return content
    .replace(/^```json\s*/i, "")
    .replace(/^```/i, "")
    .replace(/```$/, "")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const { lessonText } = await req.json();

    if (!lessonText) {
      return NextResponse.json(
        { error: "Missing lessonText" },
        { status: 400 }
      );
    }

    const prompt = `
    You are an expert instructional coach helping a teacher IMPROVE their lesson BEFORE teaching it.
    
    Lesson Plan:
    ${lessonText}
    
    The teacher has NOT taught this lesson yet.
    
    Your role is to help the teacher refine, strengthen, and anticipate issues in the lesson plan.
    
    Use these 5 reflection categories:
    
    1. Notice → What stands out in the lesson design
    2. Appreciate → What is already strong and worth keeping
    3. Probe → Identify gaps, risks, or unclear areas
    4. Connect → Connect the lesson to student needs, prior knowledge, or context
    5. Extend → Suggest ways to improve or deepen the lesson
    
    IMPORTANT:
    - ALL questions must be PRE-TEACHING (planning stage)
    - DO NOT assume the lesson has already happened
    - Focus on improving the lesson BEFORE delivery
    - Questions must help the teacher think ahead, not reflect backwards
    
    BAD example (avoid):
    "How did students respond to the activity?"
    
    GOOD example:
    "What potential challenges might students face during this activity?"
    
    Return ONLY JSON:
    
    [
      { "key": "Notice", "question": "..." },
      { "key": "Appreciate", "question": "..." },
      { "key": "Probe", "question": "..." },
      { "key": "Connect", "question": "..." },
      { "key": "Extend", "question": "..." }
    ]
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    let content = response.choices[0].message?.content || "";
    content = clean(content);

    try {
      const parsed = JSON.parse(content);

      // 🔥 Ensure it's correct format
      if (!Array.isArray(parsed)) {
        throw new Error("Not an array");
      }

      return NextResponse.json({ questions: parsed });
    } catch (err) {
      console.error("JSON parse failed:", err);

      return NextResponse.json(
        {
          error: "Invalid JSON from AI",
          raw: content, // 👈 SUPER IMPORTANT FOR DEBUGGING
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Generate questions failed:", error);

    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }
}
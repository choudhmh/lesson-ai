import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const mode = formData.get("mode");

    const files = formData.getAll("files") as File[];
    const combinedText = files
      .map((f) => `Processed file: ${f.name}`)
      .join("\n");

    /* =========================
       MODE 1: GENERATE QUESTIONS
    ========================= */
    if (mode === "generate") {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `
You are an expert teacher coach.

Generate 5 reflection questions based on lesson materials.

Return ONLY JSON:
[
  { "category": "Notice", "question": "..." },
  { "category": "Appreciate", "question": "..." },
  { "category": "Probe", "question": "..." },
  { "category": "Connect", "question": "..." },
  { "category": "Extend", "question": "..." }
]
              `,
            },
            { role: "user", content: combinedText },
          ],
        }),
      });

      const data = await aiRes.json();
      const content = data.choices[0].message.content.replace(/```json|```/g, "");

      return NextResponse.json({
        combinedText,
        questions: JSON.parse(content),
      });
    }

    /* =========================
       MODE 2: FEEDBACK + SAVE
    ========================= */
    if (mode === "feedback") {
      const answersRaw = formData.get("answers") as string;
      const answers = JSON.parse(answersRaw);

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `
You are an expert instructional coach.

Return ONLY JSON:
{
  "feedback": [
    { "category": "Notice", "comment": "..." },
    { "category": "Appreciate", "comment": "..." },
    { "category": "Probe", "comment": "..." },
    { "category": "Connect", "comment": "..." },
    { "category": "Extend", "comment": "..." }
  ],
  "finalSuggestion": "..."
}
              `,
            },
            {
              role: "user",
              content: `
Lesson Materials:
${combinedText}

Teacher Reflections:
${JSON.stringify(answers, null, 2)}
              `,
            },
          ],
        }),
      });

      const data = await aiRes.json();
      const content = data.choices[0].message.content.replace(/```json|```/g, "");

      const parsed = JSON.parse(content);

      /* =========================
         SAVE TO SUPABASE (🔥 FIX)
      ========================= */

      const { userId } = await auth();

      if (userId) {
        const { error } = await supabase.from("reflections").insert({
          user_id: userId,
          lesson_text: combinedText,
          questions: [],
          answers,
          feedback: parsed,
          type: "post", // ⭐ THIS FIXES YOUR DASHBOARD ISSUE
          created_at: new Date().toISOString(),
        });

        if (error) {
          console.error("Supabase insert error:", error);
        }
      }

      return NextResponse.json(parsed);
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const mode = formData.get("mode");
    
    const files = formData.getAll("files") as unknown as File[];
    
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
              You are an expert instructional coach working with a teacher after a lesson.
              
              Your goal is to provide DEEP, DETAILED, and ACTIONABLE feedback.
              
              For EACH category (Notice, Appreciate, Probe, Connect, Extend):
              
              - Write a MINIMUM of 4–6 sentences
              - Include:
                1. What the teacher did well (specific strengths)
                2. What could be improved (clear critique)
                3. Why it matters for student learning
                4. A concrete, practical suggestion
              
              Avoid generic phrases like "good job" — be precise and insightful.
              
              Use professional teaching language.
              
              Then provide a FINAL SUGGESTION:
              - At least 5–7 sentences
              - Summarise key improvements
              - Suggest clear next steps for future lessons
              
              IMPORTANT:
              - Be specific to the teacher’s responses
              - Do NOT be repetitive
              - Do NOT be vague
              - Focus on real classroom impact
              
              Return ONLY valid JSON in this exact format:
              
              {
                "feedback": [
                  { "category": "Notice", "comment": "detailed paragraph..." },
                  { "category": "Appreciate", "comment": "detailed paragraph..." },
                  { "category": "Probe", "comment": "detailed paragraph..." },
                  { "category": "Connect", "comment": "detailed paragraph..." },
                  { "category": "Extend", "comment": "detailed paragraph..." }
                ],
                "finalSuggestion": "detailed paragraph..."
              }
              `
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
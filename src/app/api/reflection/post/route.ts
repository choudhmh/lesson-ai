import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

type QuestionItem = {
  category: "Notice" | "Appreciate" | "Probe" | "Connect" | "Extend";
  question: string;
};

type OpenAIResponse = {
  choices: {
    message: {
      content: string;
    };
  }[];
};

function cleanJson(text: string) {
  return text.replace(/```json|```/g, "").trim();
}

function hasEnglish(text: string) {
  return /[A-Za-z]{4,}/.test(text);
}

/* =========================
   MAIN ROUTE
========================= */

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const mode = formData.get("mode")?.toString();
    const files = formData.getAll("files") as File[];

    const combinedText = files.map((f) => `File: ${f.name}`).join("\n");

    /* =========================
       MODE 1: GENERATE QUESTIONS
    ========================= */

    if (mode === "generate") {
      const generate = async () => {
        return fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            temperature: 0,
            messages: [
              {
                role: "system",
                content: `
СІЗ — ТЕК ҚАЗАҚ ТІЛІНДЕ ЖАУАП БЕРЕТІН ПЕДАГОГИКАЛЫҚ КОУЧСЫЗ.

🚨 ҚАТАҢ ЕРЕЖЕ:
- ТЕК қазақ тілі
- ЕШҚАНДАЙ ағылшын сөз жоқ

МІНДЕТ:
5 рефлексия сұрағы

JSON:
[
  { "category": "Notice", "question": "..." },
  { "category": "Appreciate", "question": "..." },
  { "category": "Probe", "question": "..." },
  { "category": "Connect", "question": "..." },
  { "category": "Extend", "question": "..." }
]
`.trim(),
              },
              {
                role: "user",
                content: `
ТЕК ҚАЗАҚША.

Lesson:
${combinedText}
                `.trim(),
              },
            ],
          }),
        });
      };

      let aiRes = await generate();
      let data: OpenAIResponse = await aiRes.json();

      let content = cleanJson(data?.choices?.[0]?.message?.content || "");
      let parsed: QuestionItem[];

      try {
        parsed = JSON.parse(content);
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON from AI" },
          { status: 500 }
        );
      }

      // 🔥 AUTO FIX PIPELINE
      if (hasEnglish(JSON.stringify(parsed))) {
        // retry ONCE automatically
        aiRes = await generate();
        data = await aiRes.json();
        content = cleanJson(data?.choices?.[0]?.message?.content || "");

        parsed = JSON.parse(content);

        // final safety check
        if (hasEnglish(JSON.stringify(parsed))) {
          return NextResponse.json(
            { error: "English still detected after retry" },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        combinedText,
        questions: parsed,
      });
    }

    /* =========================
       MODE 2: FEEDBACK
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
          temperature: 0,
          messages: [
            {
              role: "system",
              content: `
СІЗ — ТЕК ҚАЗАҚ ТІЛІНДЕ ЖАУАП БЕРЕТІН ПЕДАГОГИКАЛЫҚ КОУЧСЫЗ.

Барлық жауап 100% қазақ тілінде болуы керек.

JSON ONLY:
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
`.trim(),
            },
            {
              role: "user",
              content: `
Lesson:
${combinedText}

Answers:
${JSON.stringify(answers)}
              `.trim(),
            },
          ],
        }),
      });

      const data = await aiRes.json();
      const content = cleanJson(data?.choices?.[0]?.message?.content || "");

      const parsed = JSON.parse(content);

      const { userId } = await auth();

      if (userId) {
        await supabase.from("reflections").insert({
          user_id: userId,
          lesson_text: combinedText,
          answers,
          feedback: parsed,
          type: "post",
          created_at: new Date().toISOString(),
        });
      }

      return NextResponse.json(parsed);
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
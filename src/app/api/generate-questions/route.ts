import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* =========================
   ZOD SCHEMA
========================= */

const QuestionSchema = z.object({
  key: z.enum(["Notice", "Appreciate", "Probe", "Connect", "Extend"]),
  question: z.string().min(5),
});

const ResponseSchema = z.object({
  questions: z.array(QuestionSchema),
});

/* =========================
   HELPERS
========================= */

function clean(content: string) {
  return content
    .replace(/^```json\s*/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}



/* =========================
   MAIN ROUTE
========================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lessonText = body?.lessonText;

    if (!lessonText || typeof lessonText !== "string") {
      return NextResponse.json(
        { error: "Invalid lessonText" },
        { status: 400 }
      );
    }

    console.log("📘 Lesson received");

    /* =========================
       OPENAI CALL (WITH RETRY)
    ========================= */

    const runOpenAI = async () => {
      return openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `
СІЗ — ТЕК ҚАЗАҚ ТІЛІНДЕ ЖАУАП БЕРЕТІН ПЕДАГОГИКАЛЫҚ КОУЧСЫЗ.

🚨 ҚАТАҢ ЕРЕЖЕ:
- Барлық мәтін 100% қазақ тілінде
- Ешқандай ағылшын сөз қолданылмайды
- Бір ағылшын сөз = жарамсыз жауап

🎯 МІНДЕТ:
5 рефлексия сұрағын құру

📦 JSON форматы:
{
  "questions": [
    { "key": "Notice", "question": "..." },
    { "key": "Appreciate", "question": "..." },
    { "key": "Probe", "question": "..." },
    { "key": "Connect", "question": "..." },
    { "key": "Extend", "question": "..." }
  ]
}
            `.trim(),
          },
          {
            role: "user",
            content: `ТЕК ҚАЗАҚША. Lesson:\n${lessonText}`,
          },
        ],
      });
    };

    /* =========================
       FIRST ATTEMPT
    ========================= */

    let response = await runOpenAI();
    let content = response.choices?.[0]?.message?.content || "";

    if (!content) {
      return NextResponse.json(
        { error: "Empty AI response" },
        { status: 500 }
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(clean(content));
    } catch (err) {
      console.error("❌ JSON parse failed, retrying...");

      response = await runOpenAI();
      content = response.choices?.[0]?.message?.content || "";

      parsed = JSON.parse(clean(content));
    }

    /* =========================
       VALIDATION
    ========================= */

    const validated = ResponseSchema.safeParse(parsed);

    if (!validated.success) {
      console.error("❌ ZOD VALIDATION FAILED:", validated.error.flatten());

      return NextResponse.json(
        {
          error: "Invalid structure from AI",
          details: validated.error.flatten(),
        },
        { status: 500 }
      );
    }

    const finalQuestions = validated.data.questions;

    /* =========================
       LANGUAGE CHECK
    ========================= */

  

    return NextResponse.json({
      questions: finalQuestions,
    });
  } catch (error: unknown) {
    console.error("🔥 SERVER ERROR:", error);

    return NextResponse.json(
      {
        error: "Server error",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}
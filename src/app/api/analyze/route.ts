import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

/* ================= TYPES ================= */

interface Answers {
  Q1: string;
  Q2: string;
  Q3: string;
  Q4: string;
  Q5: string;
}

interface QuestionItem {
  key: "Notice" | "Appreciate" | "Probe" | "Connect" | "Extend";
  question: string;
}

interface AnalysisResult {
  feedback: Record<keyof Answers, string>;
  generalSuggestions: string;
}

/* ================= CONSTANTS ================= */

const allowedKeys = [
  "Notice",
  "Appreciate",
  "Probe",
  "Connect",
  "Extend",
] as const;

type AllowedKey = (typeof allowedKeys)[number];

/* ================= CONFIG ================= */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ================= HELPERS ================= */

function cleanGPTContent(content: string) {
  return content
    .replace(/^```json\s*/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

function getOpenAIErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "Unknown error";
  }

  const errObj = error as { error?: { message?: string } };

  return errObj.error?.message ?? "Unknown OpenAI error";
}

/* ================= API ROUTE ================= */

export async function POST(req: NextRequest) {
  try {
    const { lessonText, answers, questions } = await req.json();

    if (!lessonText || !answers || !questions) {
      return NextResponse.json(
        { error: "Missing lessonText, questions, or answers" },
        { status: 400 }
      );
    }

    /* ================= VALIDATE QUESTIONS ================= */

    const formattedQuestions: QuestionItem[] = Array.isArray(questions)
      ? questions.filter(
          (q: unknown): q is QuestionItem =>
            typeof q === "object" &&
            q !== null &&
            "key" in q &&
            "question" in q &&
            typeof (q as QuestionItem).key === "string" &&
            typeof (q as QuestionItem).question === "string"
        )
      : [];

    const isValidQuestions =
      formattedQuestions.length === 5 &&
      formattedQuestions.every((q) =>
        (allowedKeys as readonly string[]).includes(q.key)
      );

    if (!isValidQuestions) {
      return NextResponse.json(
        { error: "Invalid reflection questions format" },
        { status: 400 }
      );
    }

    /* ================= OPENAI PROMPT ================= */

    const prompt = `
    Сіз тәжірибелі педагогикалық коучсыз.
    
    Сабақ жоспарына негізделген 5 рефлексия сұрағын қазақ тілінде құрастырыңыз.
    
    Әр сұрақ келесі категориялардың біріне сәйкес болуы керек:
    - Notice
    - Appreciate
    - Probe
    - Connect
    - Extend
    
    МАҢЫЗДЫ:
    - Барлық сұрақтар ТЕК қазақ тілінде болсын
    - Сұрақтар мұғалімнің терең рефлексия жасауына көмектессін
    - Сұрақтар нақты, кәсіби және түсінікті болсын
    - Әр сұрақ кемінде 1-2 сөйлемнен тұрсын
    
    ТЕК МЫНАДАЙ JSON ҚАЙТАРЫҢЫЗ:
    
    [
      {
        "key": "Notice",
        "question": "Сабақ жоспарыңызда қандай оқыту стратегиялары айқын көрінеді және олардың оқушыларға әсері қандай болады деп ойлайсыз?"
      },
      {
        "key": "Appreciate",
        "question": "Сабақ жоспарыңыздың қай бөліктері оқушылардың қызығушылығын арттырады деп ойлайсыз және неліктен?"
      },
      {
        "key": "Probe",
        "question": "Сабақ барысында қандай қиындықтар туындауы мүмкін және оларды қалай шешуді жоспарлап отырсыз?"
      },
      {
        "key": "Connect",
        "question": "Бұл сабақ оқушылардың алдыңғы білімдерімен және өмірлік тәжірибесімен қалай байланысады?"
      },
      {
        "key": "Extend",
        "question": "Оқушылардың тереңірек ойлауын дамыту үшін сабақты тағы қалай кеңейтуге болады?"
      }
    ]
    `;

    /* ================= OPENAI CALL ================= */

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    let content = response.choices[0].message?.content ?? "";
    content = cleanGPTContent(content);

    let parsed: AnalysisResult;

    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({
        analysis: {
          feedback: {
            Q1: "⚠️ Failed to parse AI response",
            Q2: "",
            Q3: "",
            Q4: "",
            Q5: "",
          },
          generalSuggestions: content,
        },
      });
    }

    /* ================= SAVE TO SUPABASE ================= */

    const { userId } = await auth();

    if (userId) {
      const { error } = await supabase.from("reflections").insert({
        user_id: userId,
        lesson_text: lessonText,
        questions: formattedQuestions,
        answers,
        feedback: parsed,
        type: "pre",
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Supabase insert error:", error);
      }
    }

    /* ================= RESPONSE ================= */

    return NextResponse.json({ analysis: parsed });
  } catch (error) {
    console.error("Analyze API failed:", error);

    return NextResponse.json(
      { error: "Analyze API failed" },
      { status: 500 }
    );
  }
}
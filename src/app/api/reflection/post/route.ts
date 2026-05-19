import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

type QuestionItem = {
  category: "Notice" | "Appreciate" | "Probe" | "Connect" | "Extend";
  question: string;
};

type FeedbackItem = {
  category: "Notice" | "Appreciate" | "Probe" | "Connect" | "Extend";
  comment: string;
};

type FeedbackResponse = {
  feedback: FeedbackItem[];
  finalSuggestion: string;
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

/* =========================
   AUTO LANGUAGE DETECTION
========================= */

function detectLanguage(text: string): "english" | "kazakh" {
  const englishMatches = text.match(/[A-Za-z]/g)?.length || 0;

  // if lots of English letters → English mode
  if (englishMatches > 30) {
    return "english";
  }

  return "kazakh";
}

/* =========================
   MAIN ROUTE
========================= */

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const mode = formData.get("mode")?.toString();

    const files = formData.getAll("files") as File[];

    // ⚠️ IMPORTANT:
    // Replace this later with REAL extracted lesson text
    const combinedText = files
      .map((f) => `File: ${f.name}`)
      .join("\n");

    const language = detectLanguage(combinedText);

    const isEnglish = language === "english";

    /* =========================
       MODE 1: GENERATE QUESTIONS
    ========================= */

    if (mode === "generate") {
      const systemPrompt = isEnglish
        ? `
You are an expert instructional coach.

TASK:
Generate 5 deep pre-teaching reflection questions.

RULES:
- ALL output must be in English
- Questions must help improve the lesson BEFORE teaching
- Questions must be pedagogically meaningful
- Questions must be 1-2 sentences

RETURN JSON ONLY:

[
  { "category": "Notice", "question": "..." },
  { "category": "Appreciate", "question": "..." },
  { "category": "Probe", "question": "..." },
  { "category": "Connect", "question": "..." },
  { "category": "Extend", "question": "..." }
]
`
        : `
СІЗ — ТЕК ҚАЗАҚ ТІЛІНДЕ ЖАУАП БЕРЕТІН ПЕДАГОГИКАЛЫҚ КОУЧСЫЗ.

МІНДЕТ:
Сабаққа дейінгі 5 рефлексия сұрағын құру.

ЕРЕЖЕ:
- Барлық жауап қазақ тілінде болуы керек
- Сұрақтар мұғалімге сабақты жақсартуға көмектесуі керек
- Әр сұрақ 1–2 сөйлемнен тұруы керек

ТЕК JSON ҚАЙТАРЫҢЫЗ:

[
  { "category": "Notice", "question": "..." },
  { "category": "Appreciate", "question": "..." },
  { "category": "Probe", "question": "..." },
  { "category": "Connect", "question": "..." },
  { "category": "Extend", "question": "..." }
]
`;

      const userPrompt = isEnglish
        ? `
Lesson Content:
${combinedText}
`
        : `
Сабақ материалы:
${combinedText}
`;

      const aiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
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
                content: systemPrompt,
              },
              {
                role: "user",
                content: userPrompt,
              },
            ],
          }),
        }
      );

      const data: OpenAIResponse = await aiRes.json();

      const content = cleanJson(
        data?.choices?.[0]?.message?.content || ""
      );

      let parsed: QuestionItem[];

      try {
        parsed = JSON.parse(content);
      } catch {
        console.error("INVALID JSON:", content);

        return NextResponse.json(
          { error: "Invalid JSON from AI" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        language,
        questions: parsed,
      });
    }

    /* =========================
       MODE 2: FEEDBACK
    ========================= */

    if (mode === "feedback") {
      const answersRaw = formData.get("answers") as string;

      const answers = JSON.parse(answersRaw);

      const systemPrompt = isEnglish
        ? `
You are an expert instructional coach.

TASK:
Provide deep professional feedback for the teacher reflections.

RULES:
- ALL output must be in English
- Feedback must be specific and actionable
- Avoid generic praise
- Focus on student learning and lesson improvement

RETURN JSON ONLY:

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
`
        : `
СІЗ — ТЕК ҚАЗАҚ ТІЛІНДЕ ЖАУАП БЕРЕТІН ПЕДАГОГИКАЛЫҚ КОУЧСЫЗ.

МІНДЕТ:
Мұғалімнің рефлексиясына кәсіби кері байланыс беру.

ЕРЕЖЕ:
- Барлық жауап қазақ тілінде болуы керек
- Нақты педагогикалық ұсыныстар беру
- Жалпы мақтау сөздерді қолданбау

ТЕК JSON ҚАЙТАРЫҢЫЗ:

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
`;

      const userPrompt = isEnglish
        ? `
Lesson:
${combinedText}

Teacher Answers:
${JSON.stringify(answers)}
`
        : `
Сабақ материалы:
${combinedText}

Мұғалім жауаптары:
${JSON.stringify(answers)}
`;

      const aiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
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
                content: systemPrompt,
              },
              {
                role: "user",
                content: userPrompt,
              },
            ],
          }),
        }
      );

      const data: OpenAIResponse = await aiRes.json();

      const content = cleanJson(
        data?.choices?.[0]?.message?.content || ""
      );

      let parsed: FeedbackResponse;

      try {
        parsed = JSON.parse(content);
      } catch {
        console.error("INVALID FEEDBACK JSON:", content);

        return NextResponse.json(
          { error: "Invalid JSON from AI" },
          { status: 500 }
        );
      }

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

    return NextResponse.json(
      { error: "Invalid mode" },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error(err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
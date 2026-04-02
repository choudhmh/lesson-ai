import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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

const USE_OPENAI = true;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Extract OpenAI error message safely
function getOpenAIErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "error" in error) {
    const maybeError = (error as { error?: { message?: string } }).error;
    if (maybeError && typeof maybeError.message === "string") {
      return maybeError.message;
    }
  }
  return "Unknown error";
}

// Clean markdown ```json blocks
function cleanGPTContent(content: string) {
  return content
    .replace(/^```json\s*/i, "")
    .replace(/^```/i, "")
    .replace(/```$/, "")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const { lessonText, answers, questions } = await req.json();

    if (!lessonText || !answers || !questions) {
      return NextResponse.json(
        { error: "Missing lessonText, questions, or answers" },
        { status: 400 }
      );
    }

    // Ensure correct structure
    const formattedQuestions: QuestionItem[] = questions;

    // DEV MODE
    if (!USE_OPENAI) {
      return NextResponse.json({
        analysis: {
          feedback: {
            Q1: "Notice feedback sample",
            Q2: "Appreciate feedback sample",
            Q3: "Probe feedback sample",
            Q4: "Connect feedback sample",
            Q5: "Extend feedback sample",
          },
          generalSuggestions: "Sample general suggestions",
        },
      });
    }

    // 🔥 STRONG CATEGORY-AWARE PROMPT
    const prompt = `
You are an expert instructional coach providing deep, thoughtful feedback.

Lesson Plan:
${lessonText}

Reflection Questions (with categories):
${JSON.stringify(formattedQuestions, null, 2)}

Teacher Answers:
${JSON.stringify(answers, null, 2)}

IMPORTANT:
Each question belongs to ONE category:
- Notice → identify what stands out
- Appreciate → highlight strengths
- Probe → deepen thinking with questions
- Connect → relate to experience
- Extend → push thinking further

TASK:

Provide detailed feedback for EACH response:

For EACH Q1–Q5:
- Reference the lesson plan
- Reference the teacher's answer
- Align feedback with the category purpose
- Identify strengths
- Identify gaps or missed opportunities
- Suggest specific improvements
- Write at least 3–5 sentences

Then provide GENERAL FEEDBACK:
- Overall strengths of the lesson
- Key gaps or risks
- Clear actionable improvements

Respond ONLY in valid JSON:

{
  "feedback": {
    "Q1": "...",
    "Q2": "...",
    "Q3": "...",
    "Q4": "...",
    "Q5": "..."
  },
  "generalSuggestions": "..."
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      let content = response.choices[0].message?.content ?? "";
      content = cleanGPTContent(content);

      try {
        const parsed: AnalysisResult = JSON.parse(content);
        return NextResponse.json({ analysis: parsed });
      } catch (parseError) {
        console.warn("JSON parse failed:", parseError);

        return NextResponse.json({
          analysis: {
            feedback: {
              Q1: "⚠️ Parsing failed — see raw output below",
              Q2: "",
              Q3: "",
              Q4: "",
              Q5: "",
            },
            generalSuggestions: content,
          },
        });
      }
    } catch (openAIError: unknown) {
      const message = getOpenAIErrorMessage(openAIError);

      return NextResponse.json({
        analysis: {
          feedback: {
            Q1: "AI error: " + message,
            Q2: "",
            Q3: "",
            Q4: "",
            Q5: "",
          },
          generalSuggestions: "",
        },
      });
    }
  } catch (error) {
    console.error("Analyze API failed:", error);

    return NextResponse.json(
      { error: "Analyze API failed" },
      { status: 500 }
    );
  }
}
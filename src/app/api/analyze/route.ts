import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

interface Answers {
  Q1: string;
  Q2: string;
  Q3: string;
  Q4: string;
  Q5: string;
}

interface AnalysisResult {
  feedback: Record<keyof Answers, string>;
  generalSuggestions: string;
}

// Toggle this to true to use OpenAI API, false to use dev stub
const USE_OPENAI = true;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Safely extract error message from OpenAI
function getOpenAIErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "error" in error) {
    const maybeError = (error as { error?: { message?: string } }).error;
    if (maybeError && typeof maybeError.message === "string") {
      return maybeError.message;
    }
  }
  return "Unknown error";
}

// Remove Markdown code fences from GPT response
function cleanGPTContent(content: string) {
  return content
    .replace(/^```json\s*/, "") // opening ```json
    .replace(/^```\s*/, "")     // opening ```
    .replace(/```$/, "")        // closing ```
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const { lessonText, answers } = (await req.json()) as {
      lessonText?: string;
      answers?: Answers;
    };

    if (!lessonText || !answers) {
      return NextResponse.json({ error: "Missing lessonText or answers" }, { status: 400 });
    }

    // Dev stub
    if (!USE_OPENAI) {
      const sample: AnalysisResult = {
        feedback: {
          Q1: "Sample feedback for Q1",
          Q2: "Sample feedback for Q2",
          Q3: "Sample feedback for Q3",
          Q4: "Sample feedback for Q4",
          Q5: "Sample feedback for Q5",
        },
        generalSuggestions: "Sample general suggestions for the lesson plan.",
      };
      return NextResponse.json({ analysis: sample });
    }

    // GPT prompt
    const prompt = `
    You are an expert teacher and pedagogy consultant. 
    Analyze the following lesson plan and the teacher's answers in depth.
    
    Lesson Plan:
    ${lessonText}
    
    Teacher Answers:
    ${JSON.stringify(answers, null, 2)}
    
    Please provide a **detailed, constructive, and thorough** feedback, following these rules:
    
    1. Feedback for each question (Q1–Q5). For each:
       - Give specific examples or reasoning from the lesson plan.
       - Suggest improvements where appropriate.
       - Explain why the point matters for student learning.
    
    2. General suggestions:
       - Summarize overall strengths and weaknesses of the lesson plan.
       - Suggest actionable steps to improve engagement, clarity, or learning outcomes.
    
    Respond ONLY in JSON format exactly like this:
    
    {
      "feedback": {
        "Q1": "... detailed feedback for Q1 ...",
        "Q2": "... detailed feedback for Q2 ...",
        "Q3": "... detailed feedback for Q3 ...",
        "Q4": "... detailed feedback for Q4 ...",
        "Q5": "... detailed feedback for Q5 ..."
      },
      "generalSuggestions": "... detailed general suggestions ..."
    }
    `;
    

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      let content = response.choices[0].message?.content ?? "";
      content = cleanGPTContent(content);

      try {
        const parsed: AnalysisResult = JSON.parse(content);
        return NextResponse.json({ analysis: parsed });
      } catch (parseError) {
        console.warn("Failed to parse GPT output as JSON:", parseError);
        return NextResponse.json({
          analysis: {
            feedback: { Q1: "Could not parse AI response", Q2: "", Q3: "", Q4: "", Q5: "" },
            generalSuggestions: content, // raw content fallback
          },
        });
      }
    } catch (openAIError: unknown) {
      console.error("OpenAI request failed:", openAIError);
      const message = getOpenAIErrorMessage(openAIError);
      return NextResponse.json({
        analysis: {
          feedback: { Q1: "AI request failed: " + message, Q2: "", Q3: "", Q4: "", Q5: "" },
          generalSuggestions: "",
        },
      });
    }
  } catch (error) {
    console.error("Analyze API failed:", error);
    return NextResponse.json({ error: "Analyze API failed" }, { status: 500 });
  }
}
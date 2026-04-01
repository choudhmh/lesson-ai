import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeLesson(lessonText: string, answers: Record<string, string>) {
    const prompt = `
  You are an expert teacher. Analyze the following lesson plan and the teacher's answers.
  Lesson Plan:
  ${lessonText}
  
  Teacher Answers:
  ${JSON.stringify(answers, null, 2)}
  
  Give:
  1. Feedback for each answer
  2. General suggestions
  Respond ONLY in JSON format like:
  {
    "feedback": { "Q1": "...", "Q2": "...", "Q3": "..." },
    "generalSuggestions": "..."
  }
  `;
  
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });
  
      const content = response.choices[0].message?.content || "";
  
      try {
        return JSON.parse(content);
      } catch (err) {
        console.error("JSON parse error:", err, content);
        // fallback if GPT response is invalid JSON
        return {
          feedback: { Q1: "Could not parse AI response", Q2: "", Q3: "" },
          generalSuggestions: content,
        };
      }
    } catch (err) {
      console.error("OpenAI request failed:", err);
      throw new Error("AI analysis failed");
    }
  }
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

/* ================= TYPES ================= */

interface QuestionItem {
  key: "Notice" | "Appreciate" | "Probe" | "Connect" | "Extend";
  question: string;
}

interface Reflection {
  id: string;
  user_id: string;
  lesson_text: string;
  questions: QuestionItem[];
  answers: Record<string, string>;
  feedback: {
    feedback: Record<string, string>;
    generalSuggestions: string;
  };
  type: "pre" | "post";
  created_at: string;
}

/* ================= PAGE ================= */

export default async function ReflectionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { userId } = await auth();

  const { data, error } = await supabase
    .from("reflections")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return notFound();
  }

  const reflection = data as Reflection;

  /* 🔒 SECURITY CHECK */
  if (reflection.user_id !== userId) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              📄 Reflection Detail
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Review your lesson reflection and AI feedback
            </p>
          </div>

          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${
              reflection.type === "pre"
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {reflection.type === "pre"
              ? "Pre-Teaching"
              : "Post-Teaching"}
          </span>
        </div>

        {/* META */}
        <div className="text-xs text-gray-400">
          Created: {new Date(reflection.created_at).toLocaleString()}
        </div>

        {/* LESSON */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">
            📘 Lesson Plan
          </h2>

          <div className="max-h-60 overflow-y-auto text-sm text-gray-600 whitespace-pre-wrap leading-relaxed border-t pt-3">
            {reflection.lesson_text}
          </div>
        </div>

        {/* QUESTIONS + ANSWERS */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">
            ✍️ Your Reflection
          </h2>

          <div className="space-y-5">
            {reflection.questions?.map((q, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-gray-50 border"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-blue-700">
                    {q.key}
                  </p>

                  <span className="text-xs text-gray-400">
                    Q{i + 1}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-2">
                  {q.question}
                </p>

                <div className="bg-white p-3 rounded-lg border text-sm text-gray-600">
                  <strong className="text-gray-800">Answer:</strong>{" "}
                  {reflection.answers?.[`Q${i + 1}`] || "No answer provided"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI FEEDBACK */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">
            🧠 AI Feedback
          </h2>

          <div className="space-y-4">
            {Object.entries(reflection.feedback?.feedback || {}).map(
              ([key, value]) => (
                <div
                  key={key}
                  className="p-4 rounded-xl bg-green-50 border"
                >
                  <p className="font-semibold text-green-800 mb-1">
                    {key}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {value}
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        {/* GENERAL FEEDBACK */}
        <div className="bg-blue-50 p-6 rounded-2xl border shadow-sm">
          <h2 className="font-semibold text-blue-800 mb-2">
            📌 General Suggestions
          </h2>

          <p className="text-sm text-gray-700 leading-relaxed">
            {reflection.feedback?.generalSuggestions}
          </p>
        </div>

      </div>
    </div>
  );
}
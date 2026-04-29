import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";

/* ================= TYPES ================= */

interface QuestionItem {
  key: "Notice" | "Appreciate" | "Probe" | "Connect" | "Extend";
  question: string;
}

type PreFeedback = {
  feedback: Record<string, string>;
  generalSuggestions: string;
};

type PostFeedback = {
  feedback: { category: string; comment: string }[];
  finalSuggestion: string;
};

type ReflectionFeedback = PreFeedback | PostFeedback;

interface Reflection {
  id: string;
  user_id: string;
  lesson_text: string;
  questions: QuestionItem[];
  answers: Record<string, string>;
  feedback: ReflectionFeedback;
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

  if (error || !data) return notFound();

  const reflection = data as Reflection;

  if (reflection.user_id !== userId) return notFound();

  const isPost =
    Array.isArray((reflection.feedback as PostFeedback)?.feedback);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100">

      {/* ================= FULL WIDTH NAVBAR ================= */}
      <div className="w-full flex justify-between items-center px-6 py-4 bg-white shadow-sm">

        {/* LEFT */}
        <div className="flex items-center gap-3">
          <Image
            src="/nis.jpg"
            alt="Logo"
            width={40}
            height={40}
            className="rounded-md"
          />
          <h1 className="font-semibold text-lg text-gray-700">
            Lesson AI Assistant
          </h1>
        </div>

        {/* CENTER LINKS */}
        <div className="flex gap-6">
          <Link href="/" className="text-gray-600 hover:text-blue-600">
            Pre-Teaching
          </Link>

          <Link
            href="/post-teaching"
            className={`${
              reflection.type === "post"
                ? "text-blue-600 font-medium"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            Post-Teaching
          </Link>

          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-blue-600"
          >
            Dashboard
          </Link>
        </div>

        {/* RIGHT */}
        <UserButton />
      </div>

      {/* ================= PAGE CONTENT ================= */}
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Reflection Detail
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
            {reflection.type === "pre" ? "Pre-Teaching" : "Post-Teaching"}
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
        {reflection.questions?.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-4">
              ✍️ Your Reflection
            </h2>

            <div className="space-y-5">
              {reflection.questions.map((q, i) => (
                <div key={i} className="p-4 rounded-xl bg-gray-50 border">
                  <p className="font-semibold text-blue-700">{q.key}</p>
                  <p className="text-sm text-gray-700 mb-2">
                    {q.question}
                  </p>

                  <div className="bg-white p-3 rounded-lg border text-sm text-gray-600">
                    <strong>Answer:</strong>{" "}
                    {reflection.answers?.[`Q${i + 1}`] ||
                      "No answer provided"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI FEEDBACK */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4">
            🧠 AI Feedback
          </h2>

          <div className="space-y-4">

            {/* POST */}
            {isPost &&
              (reflection.feedback as PostFeedback).feedback.map(
                (item, i) => (
                  <div key={i} className="p-4 bg-green-50 border rounded-xl">
                    <p className="font-semibold text-green-800">
                      {item.category}
                    </p>
                    <p className="text-sm text-gray-700">
                      {item.comment}
                    </p>
                  </div>
                )
              )}

            {/* PRE */}
            {!isPost &&
              Object.entries(
                (reflection.feedback as PreFeedback).feedback || {}
              ).map(([key, value]) => (
                <div key={key} className="p-4 bg-green-50 border rounded-xl">
                  <p className="font-semibold text-green-800">{key}</p>
                  <p className="text-sm text-gray-700">{value}</p>
                </div>
              ))}
          </div>
        </div>

        {/* FINAL */}
        <div className="bg-blue-50 p-6 rounded-2xl border shadow-sm">
          <h2 className="font-semibold text-blue-800 mb-2">
            📌 Suggestions
          </h2>

          <p className="text-sm text-gray-700">
            {isPost
              ? (reflection.feedback as PostFeedback).finalSuggestion
              : (reflection.feedback as PreFeedback).generalSuggestions}
          </p>
        </div>

      </div>
    </div>
  );
}
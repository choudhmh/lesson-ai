"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";

/* ================= TYPES ================= */

type Question = {
  category: "Notice" | "Appreciate" | "Probe" | "Connect" | "Extend";
  question: string;
};

type FeedbackItem = {
  category: Question["category"];
  comment: string;
};

type FeedbackResponse = {
  feedback: FeedbackItem[];
  finalSuggestion: string;
};

/* ================= COMPONENT ================= */

export default function PostTeaching() {
  const { isSignedIn } = useAuth();

  const [files, setFiles] = useState<File[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {}, []);

  const openFileDialog = () => fileInputRef.current?.click();

  /* ================= FILE UPLOAD ================= */

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);

    // ✅ файл өлшемін тексеру
    const tooLarge = selectedFiles.some((f) => f.size > 4_000_000);

    if (tooLarge) {
      alert("Бір немесе бірнеше файл 4MB шегінен асып кетті.");
      return;
    }

    setFiles(selectedFiles);
    setQuestions([]);
    setAnswers({});
    setFeedback(null);
    setError("");

    const formData = new FormData();

    selectedFiles.forEach((f) => formData.append("files", f));

    formData.append("mode", "generate");
    formData.append("type", "post");

    setUploading(true);

    try {
      const res = await fetch("/api/reflection/post", {
        method: "POST",
        body: formData,
      });

      let data: unknown;

      try {
        data = await res.json();
      } catch {
        const text = await res.text();

        throw new Error(
          text || "Файл жүктеу кезінде қате пайда болды"
        );
      }

      if (!res.ok) {
        const errMsg =
          typeof data === "object" &&
          data !== null &&
          "error" in data
            ? (data as { error?: string }).error
            : "Файл жүктеу сәтсіз аяқталды";

        throw new Error(errMsg);
      }

      const parsed = data as { questions?: Question[] };

      setQuestions(parsed.questions || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Файл жүктеу сәтсіз аяқталды"
      );
    } finally {
      setUploading(false);
    }
  };

  /* ================= ANSWERS ================= */

  const handleAnswerChange = (
    category: string,
    value: string
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    const invalid = questions.filter(
      (q) =>
        !answers[q.category]?.trim() ||
        answers[q.category].trim().length < 15
    );

    if (invalid.length > 0) {
      alert("Әр жауап кемінде 15 таңбадан тұруы керек.");
      return;
    }

    setLoadingFeedback(true);

    const formData = new FormData();

    files.forEach((f) => formData.append("files", f));

    formData.append("mode", "feedback");
    formData.append("answers", JSON.stringify(answers));
    formData.append("type", "post");

    try {
      const res = await fetch("/api/reflection/post", {
        method: "POST",
        body: formData,
      });

      let data: unknown;

      try {
        data = await res.json();
      } catch {
        const text = await res.text();

        throw new Error(
          text || "Кері байланыс жасау кезінде қате пайда болды"
        );
      }

      if (!res.ok) {
        throw new Error("AI кері байланысын жасау сәтсіз аяқталды");
      }

      setFeedback(data as FeedbackResponse);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "AI кері байланысын жасау сәтсіз аяқталды"
      );
    } finally {
      setLoadingFeedback(false);
    }
  };

  /* ================= NOT SIGNED IN ================= */

  if (!isSignedIn) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-6 text-center">
        <div className="absolute top-6 left-6">
          <Image
            src="/nis.jpg"
            alt="Logo"
            width={80}
            height={80}
            className="rounded-lg shadow-md"
          />
        </div>

        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Сабақтан кейінгі рефлексия
        </h1>

        <p className="max-w-xl text-gray-600">
          Сабақ материалдарын жүктеп,
          AI арқылы кәсіби кері байланыс алыңыз.
        </p>
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NAVBAR */}
      <div className="flex justify-between items-center px-6 py-4 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/nis.jpg"
            alt="Logo"
            width={40}
            height={40}
            className="rounded-md"
          />

          <h1 className="font-semibold text-lg text-gray-700">
            Lesson AI Көмекшісі
          </h1>
        </div>

        <div className="flex gap-6">
          <Link href="/">Сабаққа дейін</Link>

          <Link
            href="/post-teaching"
            className="text-blue-600 font-medium"
          >
            Сабақтан кейін
          </Link>

          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-blue-600"
          >
            Басқару панелі
          </Link>
        </div>

        <UserButton />
      </div>

      {/* CONTENT */}
      <div className="p-6 max-w-5xl mx-auto">
        {/* UPLOAD */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-3">
            Сабағыңызға рефлексия жасаңыз
          </h1>

          <button
            onClick={openFileDialog}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl"
          >
            {uploading
              ? "Жүктелуде..."
              : "Материалдарды жүктеу"}
          </button>

          <h6 className="mt-4 text-sm text-gray-600">
            Файл өлшемі 4MB-тан аспауы керек
          </h6>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={handleFileSelect}
          />

          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {files.length > 0 && (
            <ul className="mt-4 text-sm text-gray-600">
              {files.map((f, i) => (
                <li key={i}>📄 {f.name}</li>
              ))}
            </ul>
          )}
        </div>

        {/* QUESTIONS */}
        {questions.length > 0 && (
          <div className="bg-blue-50 rounded-2xl p-6 mb-6">
            {questions.map((q, i) => (
              <div
                key={i}
                className="mb-4 bg-white p-4 rounded-xl border"
              >
                <p className="text-blue-600 font-semibold">
                  {q.category}
                </p>

                <p>{q.question}</p>

                <textarea
                  className="mt-3 w-full p-3 border rounded-lg"
                  rows={4}
                  placeholder="Жауабыңызды жазыңыз..."
                  value={answers[q.category] || ""}
                  onChange={(e) =>
                    handleAnswerChange(
                      q.category,
                      e.target.value
                    )
                  }
                />
              </div>
            ))}

            <button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl"
            >
              Рефлексияны жіберу
            </button>
          </div>
        )}

        {/* FEEDBACK */}
        {loadingFeedback && (
          <p>AI кері байланысы жасалуда...</p>
        )}

        {feedback && (
          <div className="bg-white rounded-2xl p-6">
            {feedback.feedback.map((f, i) => (
              <div key={i} className="mb-3">
                <p className="font-semibold text-blue-600">
                  {f.category}
                </p>

                <p>{f.comment}</p>
              </div>
            ))}

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="font-semibold">
                Қорытынды ұсыныс
              </p>

              <p>{feedback.finalSuggestion}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
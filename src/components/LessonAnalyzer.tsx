"use client";

import React, { useState, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

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

/* ================= COMPONENT ================= */

const LessonAnalyzer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [lessonText, setLessonText] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<Answers>({
    mode: "onChange",
  });

  /* ================= HELPERS ================= */

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  /* ================= UPLOAD + GENERATE ================= */

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFile = e.target.files[0];

    setFile(selectedFile);
    setAnalysis(null);
    setQuestions([]);
    reset();

    setUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // Upload
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.text) {
        throw new Error(uploadData.error || "Upload failed");
      }

      setLessonText(uploadData.text);

      // Generate Questions
      setLoadingQuestions(true);

      const qRes = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonText: uploadData.text }),
      });

      const qData = await qRes.json();

      if (!qRes.ok || !Array.isArray(qData.questions)) {
        throw new Error(qData.error || "Invalid questions format");
      }

      if (qData.questions.length !== 5) {
        throw new Error("Must return exactly 5 questions");
      }

      setQuestions(qData.questions);
    } catch (err) {
      console.error("UPLOAD FLOW ERROR:", err);
      alert("Upload or question generation failed");
    } finally {
      setUploading(false);
      setLoadingQuestions(false);
    }
  };

  /* ================= ANALYZE ================= */

  const onSubmit: SubmitHandler<Answers> = async (answers) => {
    if (!lessonText || questions.length !== 5) {
      alert("Lesson or questions missing");
      return;
    }

    setAnalyzing(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonText, questions, answers }),
      });

      const data = await res.json();

      if (!res.ok || !data.analysis) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysis(data.analysis);
    } catch (err) {
      console.error("ANALYSIS ERROR:", err);
      alert("AI analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col">

      {/* HEADER */}
      <header className="bg-white shadow-sm border-b px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-gray-800">LessonAI</h1>
            <p className="text-xs text-gray-500">Pre-Teaching Reflection Tool</p>
          </div>
        </div>
        <div className="text-sm text-gray-500">Teacher Dashboard</div>
      </header>

      {/* MAIN */}
      <main className="flex-1 py-10 px-4">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* TITLE */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">Pre-Teaching Lesson Analyzer</h1>
            <p className="text-gray-600 mt-2">Reflect, refine, and strengthen your lesson before teaching</p>
          </div>

          {/* UPLOAD */}
          <div className="bg-white shadow-md rounded-2xl p-6 border">
            <h2 className="text-lg font-semibold mb-3 text-gray-700">1️⃣ Upload Your Lesson Plan</h2>

            <button
              type="button"
              onClick={openFileDialog}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload File"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf"
              hidden
              onChange={handleFileSelect}
            />

            {file && <p className="mt-3 text-sm text-gray-500">📄 {file.name}</p>}
          </div>

          {/* LESSON PREVIEW */}
          {lessonText && (
            <div className="bg-white shadow-md rounded-2xl p-4 border">
              <div className="flex justify-between items-center">
                <h2 className="text-md font-semibold text-gray-700">📖 Lesson Preview</h2>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showPreview ? "Hide" : "View"}
                </button>
              </div>
              {showPreview && (
                <div className="mt-3 max-h-40 overflow-y-auto text-sm text-gray-600 whitespace-pre-wrap border-t pt-2">
                  {lessonText}
                </div>
              )}
            </div>
          )}

          {/* LOADING */}
          {loadingQuestions && (
            <div className="text-center text-blue-600 font-medium">🤖 Generating reflective questions...</div>
          )}

          {/* QUESTIONS */}
          {questions.length === 5 && (
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-md rounded-2xl p-6 border space-y-6">
              <h2 className="text-lg font-semibold text-gray-700">2️⃣ Reflect on Your Lesson</h2>

              {questions.map((q, index) => {
                const fieldName = `Q${index + 1}` as keyof Answers;
                return (
                  <div key={q.key} className="p-4 border rounded-xl bg-gray-50">
                    <h3 className="font-semibold text-blue-700 mb-1">{q.key}</h3>
                    <p className="text-sm text-gray-700 mb-3">{q.question}</p>
                    <textarea
                      {...register(fieldName, {
                        required: "This question must be answered",
                        minLength: {
                          value: 15,
                          message: "Please write a more thoughtful response (min 15 characters)",
                        },
                      })}
                      placeholder="Write your reflection..."
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                      rows={3}
                    />
                    {errors[fieldName] && (
                      <p className="text-red-500 text-sm mt-1">{errors[fieldName]?.message}</p>
                    )}
                  </div>
                );
              })}

              <button
                type="submit"
                disabled={analyzing || !isValid}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
              >
                {analyzing ? "Analyzing your lesson..." : "✨ Generate AI Feedback"}
              </button>
            </form>
          )}

          {/* RESULTS */}
          {analysis && (
            <div className="bg-white shadow-md rounded-2xl p-6 border">
              <h2 className="text-xl font-bold mb-4 text-gray-800">🧠 AI Feedback</h2>
              {(Object.keys(analysis.feedback) as (keyof Answers)[]).map((key, i) => (
                <div key={key} className="mb-4 p-4 border rounded-lg bg-green-50">
                  <h3 className="font-semibold text-green-800">{questions[i]?.key}</h3>
                  <p className="text-sm text-gray-700 mt-1">{analysis.feedback[key]}</p>
                </div>
              ))}

              <div className="mt-6 p-4 border rounded-lg bg-blue-50">
                <h3 className="font-semibold text-blue-800">📌 General Suggestions</h3>
                <p className="text-gray-700 mt-1">{analysis.generalSuggestions}</p>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t text-center py-3 text-sm text-gray-500">
        © {new Date().getFullYear()} LessonAI. All rights reserved.
      </footer>
    </div>
  );
};

export default LessonAnalyzer;
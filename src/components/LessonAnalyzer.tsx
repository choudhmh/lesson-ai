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
  feedback: Record<string, string>;
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

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<Answers>({ mode: "onChange" });

  const openFileDialog = () => fileInputRef.current?.click();

  /* ================= UPLOAD ================= */

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const selectedFile = e.target.files[0];

    setFile(selectedFile);
    setAnalysis(null);
    setQuestions([]);
    reset();

    setUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.text) {
        throw new Error(uploadData.error || "Файлды жүктеу қатесі");
      }

      setLessonText(uploadData.text);
      setLoadingQuestions(true);

      const qRes = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonText: uploadData.text }),
      });

      const qData = await qRes.json();

      if (!qRes.ok || !Array.isArray(qData.questions)) {
        throw new Error("Сұрақтар генерациясы сәтсіз аяқталды");
      }

      setQuestions(qData.questions);
    } catch (err) {
      console.error(err);
      alert("Қате: файл жүктеу немесе сұрақ генерациялау сәтсіз болды");
    } finally {
      setUploading(false);
      setLoadingQuestions(false);
    }
  };

  /* ================= ANALYZE ================= */

  const onSubmit: SubmitHandler<Answers> = async (answers) => {
    setAnalyzing(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonText, questions, answers }),
      });

      const data = await res.json();

      if (!res.ok || !data.analysis) {
        throw new Error("Талдау қатесі");
      }

      setAnalysis(data.analysis);
    } catch (err) {
      console.error(err);
      alert("AI талдау қатесі");
    } finally {
      setAnalyzing(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-gray-100">

      <main className="flex-1 py-10 px-4">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* TITLE */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">
              Сабақалды талдау жүйесі
            </h1>

            <p className="text-gray-600 mt-2">
              Сабақты өткізбей тұрып оны талдап, жақсартыңыз
            </p>
          </div>

          {/* UPLOAD */}
          <div className="bg-white shadow-md rounded-2xl p-6 border">
            <h2 className="text-lg font-semibold mb-3 text-gray-700">
              1️⃣ Сабақ жоспарын жүктеу
            </h2>

            <p className="text-sm text-gray-500 mb-4">
              Бір ғана файл жүктеуге болады
            </p>

            <button
              onClick={openFileDialog}
              disabled={uploading}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? "Жүктелуде..." : "Файл жүктеу"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFileSelect}
            />

            {file && (
              <p className="mt-3 text-sm text-gray-500">
                📄 {file.name}
              </p>
            )}
          </div>

          {/* PREVIEW */}
          {lessonText && (
            <div className="bg-white shadow-md rounded-2xl p-4 border">
              <div className="flex justify-between">
                <h2 className="text-md font-semibold text-gray-700">
                  📖 Сабақ жоспары
                </h2>

                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm text-blue-600"
                >
                  {showPreview ? "Жасыру" : "Көру"}
                </button>
              </div>

              {showPreview && (
                <div className="mt-3 text-sm text-gray-600 whitespace-pre-wrap border-t pt-2">
                  {lessonText}
                </div>
              )}
            </div>
          )}

          {/* LOADING */}
          {loadingQuestions && (
            <p className="text-center text-blue-600">
              🤖 Сұрақтар жасалуда...
            </p>
          )}

          {/* QUESTIONS */}
          {questions.length === 5 && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="bg-white shadow-md rounded-2xl p-6 space-y-6"
            >
              <h2 className="text-lg font-semibold text-gray-700">
                2️⃣ Сабақ бойынша рефлексия
              </h2>

              {questions.map((q, i) => {
                const field = `Q${i + 1}` as keyof Answers;

                return (
                  <div key={q.key} className="p-4 bg-gray-50 border rounded-xl">
                    <p className="font-semibold text-blue-700">{q.key}</p>
                    <p className="text-sm mb-2">{q.question}</p>

                    <textarea
                      {...register(field, {
                        required: "Жауап міндетті",
                        minLength: {
                          value: 15,
                          message: "Кемінде 15 таңба жазыңыз",
                        },
                      })}
                      className="w-full p-3 border rounded-lg"
                      rows={3}
                      placeholder="Рефлексия жазыңыз..."
                    />

                    {errors[field] && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors[field]?.message}
                      </p>
                    )}
                  </div>
                );
              })}

              <button
                type="submit"
                disabled={analyzing}
                className="w-full bg-green-600 text-white py-3 rounded-xl"
              >
                {analyzing ? "Талдау..." : "AI талдау алу"}
              </button>
            </form>
          )}

          {/* ANALYSIS */}
          {analysis && (
            <div className="bg-white p-6 rounded-2xl border">
              <h2 className="text-xl font-bold mb-4">
                ✨ AI кері байланыс
              </h2>

              {Object.entries(analysis.feedback).map(([k, v]) => (
                <div key={k} className="mb-3">
                  <p className="font-semibold">{k}</p>
                  <p className="text-sm text-gray-600">{v}</p>
                </div>
              ))}

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="font-bold">Жалпы ұсыныс</p>
                <p className="text-sm">{analysis.generalSuggestions}</p>
              </div>
            </div>
          )}

        </div>
      </main>

      <footer className="text-center text-sm text-gray-500 py-4 bg-white border-t">
        © {new Date().getFullYear()} LessonAI
      </footer>

    </div>
  );
};

export default LessonAnalyzer;
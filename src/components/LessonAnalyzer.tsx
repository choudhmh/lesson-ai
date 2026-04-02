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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<Answers>({
    mode: "onChange", // 🔥 enables live validation
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
      // 1️⃣ Upload
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.text) {
        throw new Error(uploadData.error || "Upload failed");
      }

      setLessonText(uploadData.text);

      // 2️⃣ Generate Questions
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
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Lesson Plan Analyzer</h1>

      {/* Upload */}
      <div className="mb-4">
        <button
          type="button"
          onClick={openFileDialog}
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload Lesson Plan"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.pdf"
          hidden
          onChange={handleFileSelect}
        />

        {file && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: {file.name}
          </p>
        )}
      </div>

      {/* Preview */}
      {lessonText && (
        <div className="mb-4 p-3 border rounded bg-gray-50">
          <h2 className="font-semibold mb-2">Lesson Preview:</h2>
          <p className="text-sm whitespace-pre-wrap">
            {lessonText.slice(0, 300)}...
          </p>
        </div>
      )}

      {/* Loading */}
      {loadingQuestions && (
        <p className="text-blue-600">Generating reflection questions...</p>
      )}

      {/* Questions */}
      {questions.length === 5 && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {questions.map((q, index) => {
            const fieldName = `Q${index + 1}` as keyof Answers;

            return (
              <div key={q.key}>
                <label className="block font-semibold mb-1">
                  {q.key}:
                </label>

                <p className="text-sm mb-2 text-gray-700">
                  {q.question}
                </p>

                <textarea
                  {...register(fieldName, {
                    required: "This question must be answered",
                    minLength: {
                      value: 15,
                      message: "Answer must be at least 15 characters",
                    },
                  })}
                  placeholder="Write a thoughtful reflection..."
                  className="w-full p-2 border rounded"
                  rows={3}
                />

                {/* 🔥 ERROR DISPLAY (FIXED) */}
                {errors[fieldName] && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors[fieldName]?.message}
                  </p>
                )}
              </div>
            );
          })}

          <button
            type="submit"
            disabled={analyzing || !isValid}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {analyzing ? "Analyzing..." : "Submit for Feedback"}
          </button>
        </form>
      )}

      {/* Results */}
      {analysis && (
        <div className="mt-6 p-4 border rounded bg-green-50">
          <h2 className="text-xl font-bold mb-3">AI Feedback</h2>

          {(Object.keys(analysis.feedback) as (keyof Answers)[]).map(
            (key, i) => (
              <div key={key} className="mb-3">
                <strong>
                  {questions[i]?.key} ({key}):
                </strong>
                <p>{analysis.feedback[key]}</p>
              </div>
            )
          )}

          <div className="mt-4">
            <strong>General Suggestions:</strong>
            <p>{analysis.generalSuggestions}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonAnalyzer;
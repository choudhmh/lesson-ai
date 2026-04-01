"use client";

import React, { useState, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

interface Answers {
  Q1: string;
  Q2: string;
  Q3: string;
  Q4: string;
  Q5: string;
 
}

interface AnalysisResult {
  feedback: Record<string, string>;
  generalSuggestions: string;
}

const LessonAnalyzer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [lessonText, setLessonText] = useState<string>("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit } = useForm<Answers>();

  // Open file picker
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection and auto-upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setAnalysis(null);

    // Auto-upload
    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || `Upload failed with status ${res.status}`);
        setUploading(false);
        return;
      }

      const data = await res.json();
      if (data.text) setLessonText(data.text);
      else alert("No text extracted from file");
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Submit answers + lesson text
  const onSubmit: SubmitHandler<Answers> = async (answers) => {
    if (!lessonText) {
      alert("Please upload a lesson plan first");
      return;
    }

    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonText, answers }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || `Analysis failed with status ${res.status}`);
        return;
      }

      const data = await res.json();
      if (data.analysis) setAnalysis(data.analysis);
      else alert("No analysis returned from API");
    } catch (err) {
      console.error("ANALYSIS ERROR:", err);
      alert("AI analysis failed. See console for details.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Lesson Plan Analyzer</h1>

      {/* Single File Upload Button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={openFileDialog}
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 disabled:opacity-50"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Choose & Upload File"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.pdf"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        {file && (
          <p className="mt-2 text-sm text-gray-600">Selected file: {file.name}</p>
        )}
      </div>

      {/* Lesson Preview */}
      {lessonText && (
        <div className="mb-4 p-3 border rounded bg-gray-50">
          <h2 className="font-semibold mb-2">Lesson Text Preview:</h2>
          <p className="text-sm whitespace-pre-wrap">
            {lessonText.slice(0, 500)}
            {lessonText.length > 500 ? "..." : ""}
          </p>
        </div>
      )}

      {/* Questions Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-semibold">Q1: What is the main learning focus in the lesson?</label>
          <textarea {...register("Q1")} className="w-full p-2 border rounded" rows={2} />
        </div>
        <div>
          <label className="block font-semibold">Q2: What are already strong in this lesson design?</label>
          <textarea {...register("Q2")} className="w-full p-2 border rounded" rows={2} />
        </div>
        <div>
          <label className="block font-semibold">Q3: What difficulties might learners face?</label>
          <textarea {...register("Q3")} className="w-full p-2 border rounded" rows={2} />
        </div>
        <div>
          <label className="block font-semibold">Q4: How does each ctivity supports the learning objectives?</label>
          <textarea {...register("Q4")} className="w-full p-2 border rounded" rows={2} />
        </div>
        <div>
          <label className="block font-semibold">Q5: What else can strengthen the lesson before teaching?</label>
          <textarea {...register("Q5")} className="w-full p-2 border rounded" rows={2} />
        </div>

        <button
          type="submit"
          disabled={analyzing || !lessonText}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {analyzing ? "Analyzing..." : "Submit for Analysis"}
        </button>
      </form>

      {/* AI Feedback */}
      {analysis && (
        <div className="mt-6 p-4 border rounded bg-green-50">
          <h2 className="text-xl font-bold mb-2">AI Feedback</h2>

          {Object.entries(analysis.feedback).map(([key, value]) => (
            <div key={key} className="mb-2">
              <strong>{key}:</strong> {value}
            </div>
          ))}

          <div className="mt-3">
            <strong>General Suggestions:</strong>
            <p>{analysis.generalSuggestions}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonAnalyzer;
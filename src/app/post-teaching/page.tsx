"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";


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

export default function PostTeaching() {
  const { isSignedIn } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setIsMounted(true), []);
  // Check if user is signed in on the post teaching page
  console.log("Signed in (Post-Teaching):", isSignedIn);

  const openFileDialog = () => fileInputRef.current?.click();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
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
     
      
      const tooLarge = files.some((f) => f.size > 4_000_000);
    
      if (tooLarge) {
        alert("One or more files exceed 4MB limit.");
        setUploading(false);
        return;
      }
    
      const res = await fetch("/api/reflection/post", {
        method: "POST",
        body: formData,
      });
    
      let data;
    
      // ✅ Handle non-JSON (Vercel 413, etc.)
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        throw new Error(text || "Upload failed (non-JSON response)");
      }
    
      // ✅ Handle HTTP errors properly
      if (!res.ok) {
        throw new Error(data?.error || "Upload failed");
      }
    
      setQuestions(data.questions || []);
    
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }

  const handleAnswerChange = (category: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [category]: value }));

  const handleSubmit = async () => {
    const invalid = questions.filter(
      (q) => !answers[q.category]?.trim() || answers[q.category].trim().length < 15
    );
    if (invalid.length > 0) return alert("Each answer must be at least 15 characters.");

    setLoadingFeedback(true);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    formData.append("mode", "feedback");
    formData.append("answers", JSON.stringify(answers));
    formData.append("type", "post");

    try {
      const res = await fetch("/api/reflection/post", { method: "POST", body: formData });
      const data: FeedbackResponse = await res.json();
      if (!res.ok) throw new Error();
      setFeedback(data);
    } catch {
      setError("Failed to generate feedback");
    } finally {
      setLoadingFeedback(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-6 text-center">
        <div className="absolute top-6 left-6">
          <Image src="/nis.jpg" alt="Logo" width={80} height={80} className="rounded-lg shadow-md" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Post-Teaching Reflection</h1>
        <p className="max-w-xl text-gray-600 mb-8">
          Upload your lesson resources and receive AI feedback to reflect on your teaching.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <div className="flex justify-between items-center px-6 py-4 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Image src="/nis.jpg" alt="Logo" width={40} height={40} className="rounded-md" />
          <h1 className="font-semibold text-lg text-gray-700">Lesson AI Assistant</h1>
        </div>
        <div className="flex gap-6">
          <Link href="/">Pre-Teaching</Link>
          <Link href="/post-teaching" className="text-blue-600 font-medium">Post-Teaching</Link>
          <Link
    href="/dashboard"
    className="text-gray-600 hover:text-blue-600 font-medium transition">
    Dashboard
  </Link>
        </div>
        <UserButton />
      </div>

      {/* HERO */}
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Reflect on Your Teaching</h2>
          <p className="text-gray-600 mb-4">
            Upload your lesson resources and answer reflection questions to improve future lessons.
          </p>
          <button
            onClick={openFileDialog}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl shadow"
          >
            {uploading ? "Uploading..." : "Upload Resources"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            // accept=".pdf,.docx"
            hidden
            onChange={handleFileSelect}
          />
          {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
          {files.length > 0 && (
            <ul className="mt-4 list-disc ml-5 text-sm text-gray-600">
              {files.map((f, i) => <li key={i}>{f.name}</li>)}
            </ul>
          )}
        </div>

        {/* REFLECTION QUESTIONS */}
        {questions.length > 0 && (
          <div className="bg-blue-50 rounded-2xl shadow-md p-6 mb-6">
            {questions.map((q, i) => (
              <div key={i} className="p-4 border rounded-xl bg-white mb-4">
                <p className="text-sm font-semibold text-blue-600">{q.category}</p>
                <p className="text-gray-800 mt-1">{q.question}</p>
                <textarea
                  className="mt-3 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-200"
                  rows={4}
                  value={answers[q.category] || ""}
                  onChange={(e) => handleAnswerChange(q.category, e.target.value)}
                />
              </div>
            ))}
            <button
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl shadow"
            >
              Submit Reflections
            </button>
          </div>
        )}

        {/* LOADING */}
        {loadingFeedback && <p className="mt-4 text-gray-600">Generating AI feedback...</p>}

        {/* FEEDBACK */}
        {feedback && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            {feedback.feedback.map((f, i) => (
              <div key={i} className="p-4 border rounded-lg mb-3">
                <p className="font-semibold text-blue-600">{f.category}</p>
                <p className="text-gray-700">{f.comment}</p>
              </div>
            ))}
            <div className="p-4 bg-blue-50 border rounded-lg">
              <p className="font-semibold">Final Suggestion</p>
              <p>{feedback.finalSuggestion}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
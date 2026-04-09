"use client";

import React, { useState, useRef, useEffect } from "react";

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

const PostTeaching = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    formData.append("mode", "generate"); // ✅ IMPORTANT

    setUploading(true);

    try {
      const res = await fetch("/api/reflection/post", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setQuestions(data.questions || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      console.error(err);
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleAnswerChange = (category: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async () => {
    const invalid = questions.filter(
      (q) =>
        !answers[q.category]?.trim() ||
        answers[q.category].trim().length < 15
    );

    if (invalid.length > 0) {
      alert("Each answer must be at least 15 characters.");
      return;
    }

    setLoadingFeedback(true);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    formData.append("mode", "feedback");
    formData.append("answers", JSON.stringify(answers));

    try {
      const res = await fetch("/api/reflection/post", {
        method: "POST",
        body: formData,
      });

      const data: FeedbackResponse = await res.json();

      if (!res.ok) throw new Error("Failed to generate feedback");

      setFeedback(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to generate feedback";
      console.error(err);
      setError(message);
    } finally {
      setLoadingFeedback(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-4">
          Post-Teaching Reflection
        </h1>

        <p className="text-gray-600 mb-6">
          Upload lesson resources and reflect on your teaching.
        </p>

        <button
          onClick={openFileDialog}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg"
        >
          {uploading ? "Uploading..." : "Upload Resources"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx"
          hidden
          onChange={handleFileSelect}
        />

        {isMounted && error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {isMounted && files.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium">Uploaded files:</p>
            <ul className="list-disc ml-5">
              {files.map((f, i) => (
                <li key={i}>{f.name}</li>
              ))}
            </ul>
          </div>
        )}

        {/* QUESTIONS */}
        {isMounted && questions.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3">
              Reflection Questions
            </h2>

            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={i} className="p-4 border rounded-lg bg-gray-50">
                  <p className="text-sm font-semibold text-blue-600">
                    {q.category}
                  </p>

                  <p className="text-gray-800 mt-1">{q.question}</p>

                  <textarea
                    placeholder="Write your reflection (min 15 characters)..."
                    className="mt-2 w-full p-2 border rounded"
                    rows={4}
                    value={answers[q.category] || ""}
                    onChange={(e) =>
                      handleAnswerChange(q.category, e.target.value)
                    }
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              className="mt-6 bg-green-600 text-white px-5 py-2 rounded-lg"
            >
              Submit Reflections
            </button>
          </div>
        )}

        {/* LOADING */}
        {isMounted && loadingFeedback && (
          <p className="mt-6">Generating AI feedback...</p>
        )}

        {/* FEEDBACK */}
        {isMounted && feedback && (
          <div className="mt-6 border p-4 rounded-lg bg-gray-50">
            <h2 className="text-lg font-semibold mb-3">
              AI Feedback
            </h2>

            <div className="space-y-3">
              {feedback.feedback.map((f, i) => (
                <div key={i}>
                  <p className="font-semibold text-blue-600">
                    {f.category}
                  </p>
                  <p className="text-gray-700">{f.comment}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-green-50 border rounded">
              <p className="font-semibold">Final Suggestion</p>
              <p>{feedback.finalSuggestion}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostTeaching;
"use client";

import { useAuth, SignInButton, UserButton } from "@clerk/nextjs";
import LessonAnalyzer from "@/components/LessonAnalyzer";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const { isSignedIn } = useAuth();
 // Check if user is signed in on the post teaching page
 console.log("Signed in (Post-Teaching):", isSignedIn);
 
  // 🔒 NOT SIGNED IN
  if (!isSignedIn) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-6 text-center">
        
        {/* Logo (top-left) */}
        <div className="absolute top-6 left-6">
          <Image
            src="/nis.jpg"
            alt="Logo"
            width={80}
            height={80}
            className="rounded-lg shadow-md"
          />
        </div>

        {/* Hero */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          Teach Smarter with AI Feedback
        </h1>

        <p className="max-w-xl text-gray-600 mb-8">
          Plan better lessons, get instant AI feedback before teaching,
          and reflect with insights after your class.
        </p>

        <SignInButton mode="modal">
          <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg shadow-lg transition">
            Login as Teacher
          </button>
        </SignInButton>

        {/* Steps */}
        <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl">
          {[
            {
              title: "1. Plan",
              desc: "Upload your lesson plan, answer a few questions and get instant suggestions",
            },
            {
              title: "2. Teach",
              desc: "Deliver your lesson with confidence",
            },
            {
              title: "3. Reflect",
              desc: "Receive AI-powered feedback to improve",
            },
          ].map((step, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl shadow-md"
            >
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ✅ SIGNED IN
  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header / Navbar */}
      <div className="flex justify-between items-center px-6 py-4 bg-white shadow-sm">
        
        {/* LEFT: Logo + Title */}
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

        {/* CENTER: Navigation */}
        <div className="flex gap-6">
        <Link href="/" className="text-blue-600 font-medium">
            Pre-Teaching
          </Link>

          <Link
            href="/post-teaching"
            className="text-gray-600 hover:text-blue-600 font-medium transition"
          >
            Post-Teaching
          </Link>
        </div>

        {/* RIGHT: User */}
        <UserButton />
      </div>

      {/* Content */}
      <div className="p-6 max-w-5xl mx-auto">
      

        <div className="bg-white rounded-2xl shadow-md p-6">
          <LessonAnalyzer />
        </div>
      </div>
    </div>
  );
}
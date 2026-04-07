"use client";

import { useAuth, SignInButton, UserButton } from "@clerk/nextjs";
import LessonAnalyzer from "@/components/LessonAnalyzer";

export default function Home() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SignInButton mode="modal">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg">
            Login as Teacher
          </button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="absolute top-4 right-4">
        <UserButton />
      </div>
      <LessonAnalyzer />
    </div>
  );
}
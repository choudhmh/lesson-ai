"use client";

import { useAuth, SignInButton, UserButton } from "@clerk/nextjs";
import LessonAnalyzer from "@/components/LessonAnalyzer";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const { isSignedIn } = useAuth();

  console.log("Signed in (Post-Teaching):", isSignedIn);

  if (!isSignedIn) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-6 text-center">

        <div className="absolute top-6 left-6">
          <Image
            src="/nis.jpg"
            alt="Логотип"
            width={80}
            height={80}
            className="rounded-lg shadow-md"
          />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          AI арқылы тиімді оқыту
        </h1>

        <p className="max-w-xl text-gray-600 mb-8">
          Сабақ жоспарын жақсартыңыз, сабаққа дейін AI кері байланыс алыңыз және
          сабақтан кейін рефлексия жасаңыз.
        </p>

        <SignInButton mode="modal">
          <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg shadow-lg transition">
            Мұғалім ретінде кіру
          </button>
        </SignInButton>

        <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl">
          {[
            {
              title: "1. Жоспарлау",
              desc: "Сабақ жоспарын жүктеңіз және ұсыныстар алыңыз",
            },
            {
              title: "2. Сабақ өткізу",
              desc: "Сабақты сенімді түрде өткізіңіз",
            },
            {
              title: "3. Рефлексия",
              desc: "AI арқылы кері байланыс алыңыз",
            },
          ].map((step, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-md">
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="flex justify-between items-center px-6 py-4 bg-white shadow-sm">

        <div className="flex items-center gap-3">
          <Image src="/nis.jpg" alt="Логотип" width={40} height={40} className="rounded-md" />
          <h1 className="font-semibold text-lg text-gray-700">
            Сабақ AI көмекшісі
          </h1>
        </div>

        <div className="flex gap-6">
          <Link href="/" className="text-blue-600 font-medium">
            Сабаққа дейін
          </Link>

          <Link href="/post-teaching" className="text-gray-600 hover:text-blue-600">
            Сабақтан кейін
          </Link>

          <Link href="/dashboard" className="text-gray-600 hover:text-blue-600">
            Бақылау тақтасы
          </Link>
        </div>

        <UserButton />
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <LessonAnalyzer />
        </div>
      </div>
    </div>
  );
}
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";

interface Reflection {
  id: string;
  lesson_text: string;
  type: "pre" | "post";
  created_at: string;
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  const { userId } = await auth();

  if (!userId) redirect("/sign-in");

  const filterType = searchParams?.type;

  let query = supabase
    .from("reflections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (filterType === "pre" || filterType === "post") {
    query = query.eq("type", filterType);
  }

  const { data } = await query;
  const reflections = (data as Reflection[]) || [];

  const total = reflections.length;
  const pre = reflections.filter(r => r.type === "pre").length;
  const post = reflections.filter(r => r.type === "post").length;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ================= NAVBAR ================= */}
      <div className="flex justify-between items-center px-6 py-4 bg-white shadow-sm sticky top-0 z-50">

        {/* LEFT */}
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

     {/* CENTER LINKS */}
<div className="flex gap-6">
  <Link
    href="/"
    className={`font-medium transition ${
      filterType === "post"
        ? "text-blue-600"
        : "text-gray-600 hover:text-blue-600"
    }`}
  >
    Pre-Teaching
  </Link>

  <Link
    href="/post-teaching"
    className={`font-medium transition ${
      filterType === "post"
        ? "text-blue-600"
        : "text-gray-600 hover:text-blue-600"
    }`}
  >
    Post-Teaching
  </Link>

  <Link
    href="/dashboard"
    className={`font-medium transition ${
      !filterType
        ? "text-blue-600"
        : "text-gray-600 hover:text-blue-600"
    }`}
  >
    Dashboard
  </Link>
</div>

<UserButton />
      </div>

      {/* ================= CONTENT ================= */}
      <main className="px-6 py-10">
        <div className="max-w-6xl mx-auto">

          {/* HEADER */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900">
              Your Teaching Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              Track your reflections and AI feedback over time
            </p>
          </div>

          {/* STATS */}
          <div className="flex gap-3 mb-10">

<div className="w-[180px] bg-white border shadow-sm rounded-xl px-4 py-3 flex flex-col gap-1">
  <p className="text-[11px] text-gray-500">Total Reflections</p>
  <p className="text-lg font-semibold text-gray-900">{total}</p>
</div>

<div className="w-[180px] bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex flex-col gap-1">
  <p className="text-[11px] text-blue-600">Pre-Teaching</p>
  <p className="text-lg font-semibold text-blue-700">{pre}</p>
</div>

<div className="w-[180px] bg-green-50 border border-blue-100 rounded-xl px-4 py-3 flex flex-col gap-1">
  <p className="text-[11px] text-green-600">Post-Teaching</p>
  <p className="text-lg font-semibold text-green-700">{post}</p>
</div>

</div>
          <br></br>

          {/* LIST */}
          <div className="space-y-4">
            {reflections.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>

                  <span
                    className={`px-3 py-1 rounded-full font-medium ${
                      item.type === "pre"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {item.type}
                  </span>
                </div>

                <p className="text-sm text-gray-700 line-clamp-2">
                  {item.lesson_text}
                </p>

                <div className="mt-4 flex justify-end">
                  <Link
                    href={`/dashboard/${item.id}`}
                    className="text-sm font-medium text-black hover:text-blue-600"
                  >
                    View analysis →
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}
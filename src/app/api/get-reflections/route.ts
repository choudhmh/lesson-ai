import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("reflections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ data, error });
}
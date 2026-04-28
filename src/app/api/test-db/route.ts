import { supabase } from "../../../lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("reflections")
    .select("*");

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return Response.json({
    data: data ?? [],
    count: data?.length ?? 0,
  });
}
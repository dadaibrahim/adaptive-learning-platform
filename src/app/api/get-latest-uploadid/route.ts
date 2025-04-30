// /app/api/get-latest-uploadid/route.ts

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://6807abe0942707d722dc100d.mockapi.io/topics");

    if (!res.ok) {
      console.error("Failed to fetch topics from MockAPI");
      return new Response("Failed to fetch topics", { status: 502 });
    }

    const topics = await res.json();

    // Extract uploadids and find the highest one
    const uploadIds = topics
      .map((topic: any) => topic.uploadid)
      .filter((id: any) => typeof id === "number");

    const latestUploadId = uploadIds.length > 0 ? Math.max(...uploadIds) : 0;

    return NextResponse.json({ latestUploadId });
  } catch (error) {
    console.error("Error in get-latest-uploadid:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

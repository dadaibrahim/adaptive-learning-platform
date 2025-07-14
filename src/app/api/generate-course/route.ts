import { google } from "@ai-sdk/google";
import { streamObject } from "ai";
import { z } from "zod";
import axios from "axios";

export const maxDuration = 60;

// Course module validation
const courseModuleSchema = z.object({
  topic: z.string(),
  description: z.string().min(5),
  learning_objectives: z.array(z.string()).min(1),
  recommended_resources: z.array(z.string()).min(1),
});

// Full course schema validation
const courseSchema = z.object({
  course_title: z.string(),
  weak_modules: z.array(courseModuleSchema),
  strong_modules: z.array(courseModuleSchema),
});

// Helper: Extract course domain
function extractCourseDomain(topic: string): string {
  if (!topic.includes("(course-name-is)")) {
    return "General";
  }
  const parts = topic.split("(course-name-is)");
  return parts[1]?.trim() || "General";
}

export async function POST(req: Request) {
  const { uploadid, weakTopics, strongTopics, interests } = await req.json();

  if (!uploadid || (!Array.isArray(weakTopics) && !Array.isArray(strongTopics)) || !Array.isArray(interests)) {
    return new Response("Missing or invalid parameters", { status: 400 });
  }

  if (weakTopics.length === 0 && strongTopics.length === 0) {
    return new Response("No topics provided for course generation", { status: 400 });
  }

  const sampleTopic = weakTopics[0] || strongTopics[0];
  const courseDomain = sampleTopic ? extractCourseDomain(sampleTopic) : "General";

  const result = streamObject({
    model: google("gemini-1.5-pro-latest"),
    messages: [
      {
        role: "system",
        content: `
You are an expert educational course generator.

Objective: Create a personalized learning course in the domain of "${courseDomain}" based on user's WEAK and STRONG topics, while aligning the course as much as possible with the user's INTERESTS.

Instructions for WEAK Topics:
- Write a detailed description (3–5 lines).
- Create 3–5 learning objectives.
- **Mandatory:** Include at least one real-world problem as a learning objective. Preferably tie it to user's interests; if not, general real-world challenge.
- Recommend exactly 3–5 resources, where:
  - **First resource must be a YouTube/video link** related to the topic.
  - **Second resource must be a book (Name + Author)**.
  - Others can be articles, podcasts, or tools.

Instructions for STRONG Topics:
- Write a brief description (1–2 lines).
- Create 1–2 learning objectives.
- Same resource rules apply (video first, book second).

Constraints:
- Always reflect the course domain ("${courseDomain}") naturally in descriptions and resource suggestions.
- If no matching video/book exists, create a realistic placeholder.
- Strictly output valid JSON. No extra explanation, no commentary.
        `.trim(),
      },
      {
        role: "user",
        content: `
Weak Topics: ${weakTopics.length > 0 ? weakTopics.join(", ") : "None"}
Strong Topics: ${strongTopics.length > 0 ? strongTopics.join(", ") : "None"}
User Interests: ${interests.length > 0 ? interests.join(", ") : "None"}
        `.trim(),
      },
    ],
    schema: courseSchema,
    output: "object",
    async onFinish({ object }) {
      const validated = courseSchema.safeParse(object);
      if (!validated.success) {
        throw new Error(validated.error.errors.map((e) => e.message).join("\n"));
      }
    
      const { course_title, weak_modules, strong_modules } = validated.data;
      const timestamp = Math.floor(Date.now() / 1000);
    
      const modules = [...weak_modules, ...strong_modules];
    
      // ✅ PRE-CHECK: See if any course already exists for this uploadid
      try {
        const existing = await axios.get(
          `https://6874ad03dd06792b9c94b75e.mockapi.io/courses?uploadid=${uploadid}`
        );
    
        if (existing.data && existing.data.length > 0) {
          console.warn(`Course for uploadid ${uploadid} already exists. Skipping generation.`);
          return; // ❌ Prevent duplicate entries
        }
      } catch (err) {
        console.error(`Error checking existing course for uploadid ${uploadid}`, err);
        throw new Error("Failed to verify course duplication.");
      }
    
      // 🟢 No existing course, proceed to save
      for (const module of modules) {
        try {
          await axios.post("https://680e3ff2c47cb8074d92884a.mockapi.io/courses", {
            uploadid,
            course_title,
            topic: module.topic,
            description: module.description,
            learning_objectives: module.learning_objectives,
            recommended_resources: module.recommended_resources,
            createdAt: timestamp,
          });
        } catch (err) {
          console.error(`Error posting module for topic ${module.topic}`, err);
        }
      }
    },
  });

  const streamResponse = result.toTextStreamResponse();

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const reader = streamResponse.body?.getReader();
  const encoder = new TextEncoder();

  if (!reader) {
    return new Response("Stream error", { status: 500 });
  }

  (async () => {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      await writer.write(value);
    }

    const metadata = `\n\n${JSON.stringify({ uploadid, status: "course-generation-complete" })}`;
    await writer.write(encoder.encode(metadata));

    await writer.close();
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

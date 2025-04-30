import { google } from "@ai-sdk/google";
import { streamObject } from "ai";
import { z } from "zod";
import axios from "axios";

export const maxDuration = 60;

const allTopicsSchema = z.object({
  topics: z.array(z.string().min(1)).min(5),
});

export async function POST(req: Request) {
  const { files, uploadid = 1, age = 16 } = await req.json();
  const firstFile = files[0].data;

  let partCount = 0;

  const result = streamObject({
    model: google("gemini-1.5-pro-latest"),
    messages: [
      {
        role: "system",
        content: `
You are an AI assistant inside an adaptive learning platform.

The user is approximately ${age} years old. Tailor the educational **topic complexity** to match this age group.

Task: You must systematically extract all **Units** and their major subtopics from the document.

Specifically:
- Identify every Unit heading (e.g., "Unit 1: Number Systems") and create no more than 2-3 topics from the subtopics listed inside it.
- Do not skip any Unit, even if it's far down the document.
- Assume Units are important chapters to be captured.

Format each topic like:
"[Subtopic Name] (course-name-is) [Course Name]"

The Course Name should be the logical academic course (e.g., Mathematics).

Ensure full syllabus coverage — no missing Units.
Return strict JSON format: 
{
  "topics": [
    "Formatted Topic 1",
    "Formatted Topic 2",
    "Formatted Topic 3"
  ]
}

Important Instructions:
- Ensure topics are age-appropriate.
- Each topic must reflect a meaningful concept from the document.
- Avoid duplication.
- Avoid overly technical language for younger learners.
- Only return the JSON. No explanations, no extra text, no commentary.
`.trim(),
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract as many suitable educational topics as possible from this PDF.",
          },
          {
            type: "file",
            data: firstFile,
            mimeType: "application/pdf",
          },
        ],
      },
    ],
    schema: allTopicsSchema,
    output: "object",
    async onFinish({ object }) {
      const validated = allTopicsSchema.safeParse(object);
      if (!validated.success) {
        throw new Error(validated.error.errors.map(e => e.message).join("\n"));
      }

      const { topics } = validated.data;

      const chunks = [];
      for (let i = 0; i < topics.length; i += 5) {
        if (topics.slice(i, i + 5).length === 5) {
          const [t1, t2, t3, t4, t5] = topics.slice(i, i + 5);
          chunks.push({
            part: chunks.length + 1,
            topic1: t1,
            topic2: t2,
            topic3: t3,
            topic4: t4,
            topic5: t5,
            uploadid,
            age,
          });
        }
      }

      partCount = chunks.length;

      for (const part of chunks) {
        try {
          await axios.post("https://6807abe0942707d722dc100d.mockapi.io/topics", part);
        } catch (err) {
          console.error(`Failed pushing Part ${part.part}`, err);
          throw new Error(`Push failed for Part ${part.part}`);
        }
      }
    },
  });

  // After streaming, return metadata
  const streamResponse = result.toTextStreamResponse();

  const { readable, writable } = new TransformStream();
const writer = writable.getWriter();
const reader = streamResponse.body?.getReader();

if (!reader) {
  return new Response("Stream reading failed", { status: 500 });
}

const encoder = new TextEncoder();

(async () => {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    await writer.write(value);
  }

  // Append final JSON metadata
  const metadata = `\n\n${JSON.stringify({ uploadid, lastPart: partCount })}`;
  await writer.write(encoder.encode(metadata));

  await writer.close();
})();

return new Response(readable, {
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
  },
});
}

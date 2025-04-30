import { google } from "@ai-sdk/google";
import { streamObject } from "ai";
import { z } from "zod";
import axios from "axios";

export const maxDuration = 60;

const questionSchema = z.object({
  question: z.string().min(5),
  topic: z.string(),
  option_a: z.string(),
  option_b: z.string(),
  option_c: z.string(),
  option_d: z.string(),
  correct_answer: z.enum(["a", "b", "c", "d"]),
});

const questionsSchema = z.object({
  questions: z.array(questionSchema).min(1),
});

export async function POST(req: Request) {
  const { uploadid, part } = await req.json();

  const topicRes = await axios.get("https://6807abe0942707d722dc100d.mockapi.io/topics");
  const topicData = topicRes.data.find((t: { uploadid: any; part: any; }) => t.uploadid === uploadid && t.part === part);
  if (!topicData) {
    return new Response("Topic not found", { status: 404 });
  }

  const topics = [topicData.topic1, topicData.topic2, topicData.topic3, topicData.topic4, topicData.topic5];

  const result = streamObject({
    model: google("gemini-1.5-pro-latest"),
    messages: [
      {
        role: "system",
        content: `You are a quiz generator for an adaptive learning system. For each topic provided, generate exactly ONE multiple-choice question (MCQ). 
  Each question must have the following options:
  - Option A
  - Option B
  - Option C
  - Option D: "I don't know"
  
  The correct answer must only be A, B, or C. Never mark D as correct. 
  Return the response strictly as a JSON object matching the expected schema.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Generate one MCQ per topic from the following list: ${topics.join(", ")}`,
          },
        ],
      },
    ],
    schema: questionsSchema,
    output: "object",
    async onFinish({ object }) {
      const validated = questionsSchema.safeParse(object);
      if (!validated.success) {
        throw new Error(validated.error.errors.map((e) => e.message).join("\n"));
      }
  
      const questions = validated.data.questions;
  
      for (const q of questions) {
        try {
          await axios.post("https://6807abe0942707d722dc100d.mockapi.io/quiz", {
            uploadid,
            part,
            topic: q.topic,
            question: q.question,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: "I don't know", // Ensure this is consistent
            correct_answer: q.correct_answer,
            user_answer: "",
          });
        } catch (err) {
          console.error(`Error pushing quiz question for topic ${q.topic}`, err);
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

    const metadata = `\n\n${JSON.stringify({ uploadid, part, status: "complete" })}`;
    await writer.write(encoder.encode(metadata));

    await writer.close();
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

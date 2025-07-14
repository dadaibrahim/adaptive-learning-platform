"use client";

import { useRouter, useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import axios from "axios";

interface TopicPart {
  part: number;
  topic1: string;
  topic2: string;
  topic3: string;
  topic4: string;
  topic5: string;
  uploadid: number;
  age: number;
}

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const [topics, setTopics] = useState<TopicPart[]>([]);
  const [allCompleted, setAllCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Safely extract id from params
  const id = params?.id as string;

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const combinedId = parseInt(id, 10);
    if (isNaN(combinedId)) {
      setLoading(false);
      return;
    }

    const uploadid = Math.floor(combinedId / 10);
    const lastPart = combinedId % 10;

    const fetchData = async () => {
      try {
        const res = await axios.get("https://6874a427dd06792b9c9494c0.mockapi.io/topics", {
          headers: { "Cache-Control": "no-store" },
        });
        const allData: TopicPart[] = res.data;
        const filtered = allData
          .filter((d) => d.uploadid === uploadid && d.part <= lastPart)
          .sort((a, b) => a.part - b.part);
        setTopics(filtered);

        const responses = await Promise.all(
          filtered.map(async (entry) => {
            try {
              const quizRes = await axios.get(
                `https://6874a427dd06792b9c9494c0.mockapi.io/quiz?uploadid=${entry.uploadid}&part=${entry.part}`
              );
              const data = quizRes.data;

              if (Array.isArray(data)) {
                const status = data.filter((q: any) => q.user_answer && q.user_answer.trim() !== "");
                return status.length > 0;
              } else {
                console.warn("Quiz data is not an array:", data);
                return false;
              }
            } catch (error) {
              console.warn("Failed to fetch individual quiz status:", error);
              return false;
            }
          })
        );

        setAllCompleted(responses.every(Boolean));
      } catch (err) {
        console.error("Error fetching topics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!id) return <div className="p-6 text-red-500">Invalid ID parameter.</div>;

  const combinedUploadId = parseInt(id, 10);
  if (isNaN(combinedUploadId)) {
    return <div className="p-6 text-red-500">Invalid ID format.</div>;
  }

  const uploadid = Math.floor(combinedUploadId / 10);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Topics for Upload ID {id}</h1>
      {topics.map((entry) => (
        <QuizCard key={entry.part} entry={entry} />
      ))}

      {allCompleted && (
        <div className="mt-10 text-center">
          <button
            onClick={() => router.push(`/analysis/${uploadid}`)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
          >
            Analyze Results
          </button>
        </div>
      )}
    </div>
  );
}

function QuizCard({ entry }: { entry: TopicPart }) {
  const router = useRouter();
  const params = useParams();
  const [generationStatus, setGenerationStatus] = useState("Not Generated");
  const [completionStatus, setCompletionStatus] = useState("Not Taken");
  const [loading, setLoading] = useState(false);

  const id = params?.id as string;
  const quizPath = `/${id}/${entry.uploadid * 10 + entry.part}`;

  const checkQuizStatus = async () => {
    try {
      const res = await axios.get(
        `https://6874a427dd06792b9c9494c0.mockapi.io/quiz?uploadid=${entry.uploadid}&part=${entry.part}`
      );
      const data = res.data;

      if (Array.isArray(data) && data.length > 0) {
        setGenerationStatus("Generated");
        const answeredQuizzes = data.filter((q: any) => q.user_answer && q.user_answer.trim() !== "");
        setCompletionStatus(answeredQuizzes.length > 0 ? "Taken" : "Not Taken");
      } else {
        setGenerationStatus("Not Generated");
        setCompletionStatus("Not Taken");
      }
    } catch (err) {
      setGenerationStatus("Not Generated");
    }
  };

  useEffect(() => {
    checkQuizStatus();
  }, [entry.uploadid, entry.part]);

  const handleGenerateQuiz = async () => {
    setLoading(true);
    try {
      await axios.post("/api/quiz-generator", {
        uploadid: entry.uploadid,
        part: entry.part,
      });

      setTimeout(() => {
        checkQuizStatus();
      }, 5000);
    } catch (err) {
      console.error("Failed to generate quiz:", err);
      setGenerationStatus("Error");
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const base = "text-sm px-3 py-1 rounded-full";
    if (status === "Generated" || status === "Taken") return `${base} bg-green-100 text-green-700`;
    if (status === "Not Generated" || status === "Not Taken") return `${base} bg-yellow-100 text-yellow-700`;
    return `${base} bg-red-100 text-red-700`;
  };

  return (
    <div className="mb-6 p-6 border border-gray-300 rounded-xl shadow-sm bg-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-xl">Part {entry.part}</h2>
        <div className="flex gap-4 mb-4">
          <span className={statusBadge(generationStatus)}>{generationStatus}</span>
          <span className={statusBadge(completionStatus)}>{completionStatus}</span>
        </div>
      </div>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>{entry.topic1.split('(course-name-is)')[0].trim()}</li>
        <li>{entry.topic2.split('(course-name-is)')[0].trim()}</li>
        <li>{entry.topic3.split('(course-name-is)')[0].trim()}</li>
        <li>{entry.topic4.split('(course-name-is)')[0].trim()}</li>
        <li>{entry.topic5.split('(course-name-is)')[0].trim()}</li>
      </ul>

      {generationStatus === "Generated" ? (
        <button
          onClick={() => router.push(quizPath)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Start Quiz
        </button>
      ) : (
        <button
          onClick={handleGenerateQuiz}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading || generationStatus === "Generated"}
        >
          {loading ? "Generating..." : "Generate Quiz"}
        </button>
      )}
    </div>
  );
}
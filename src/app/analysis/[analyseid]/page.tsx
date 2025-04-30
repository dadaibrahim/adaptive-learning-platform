// app/analysis/[analyseid]/page.tsx
"use client";

import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";

interface Question {
  uploadid: number;
  part: number;
  topic: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  user_answer: string;
  id: string;
}

interface TopicStats {
  topic: string;
  total: number;
  correct: number;
}

export default function AnalysisPage() {
  const { analyseid } = useParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysisData = async () => {
      try {
        const res = await fetch(`https://6807abe0942707d722dc100d.mockapi.io/quiz?uploadid=${analyseid}`);
        const data: Question[] = await res.json();
        setQuestions(data);
      } catch (err) {
        console.error("Failed to fetch analysis data", err);
      } finally {
        setLoading(false);
      }
    };

    if (analyseid) fetchAnalysisData();
  }, [analyseid]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (questions.length === 0) return <div className="p-6 text-red-500">No data available for analysis.</div>;

  const total = questions.length;
  const correct = questions.filter((q) => q.user_answer === q.correct_answer).length;

  const parts = Array.from(new Set(questions.map(q => q.part))).sort((a, b) => a - b);

  // === Topic Level Evaluation ===
  const topicMap = new Map<string, TopicStats>();

  for (const q of questions) {
    const isCorrect = q.user_answer === q.correct_answer;
    if (!topicMap.has(q.topic)) {
      topicMap.set(q.topic, { topic: q.topic, total: 0, correct: 0 });
    }
    const stats = topicMap.get(q.topic)!;
    stats.total += 1;
    if (isCorrect) stats.correct += 1;
  }

  const sortedTopics = Array.from(topicMap.values()).sort((a, b) => a.correct / a.total - b.correct / b.total);
  const weakTopics = sortedTopics.filter(t => t.correct / t.total < 0.6);
  const strongTopics = sortedTopics.filter(t => t.correct / t.total >= 0.8);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Quiz Analysis for Upload ID {analyseid}</h1>

      <div className="mb-6 space-y-1">
        <p>Total Questions: {total}</p>
        <p className="text-green-600">Correct: {correct}</p>
        <p className="text-red-600">Incorrect: {total - correct}</p>
        <p className="text-blue-600 font-semibold">Score: {(correct / total * 100).toFixed(2)}%</p>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Strengths</h2>
        {strongTopics.length === 0 ? (
          <p className="text-gray-600">No strong topics identified yet. Keep practicing!</p>
        ) : (
          <ul className="list-disc ml-6 text-green-700">
            {strongTopics.map((t) => (
              <li key={t.topic}>
                {t.topic.split('(course-name-is)')[0].trim()}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Weak Areas</h2>
        {weakTopics.length === 0 ? (
          <p className="text-gray-600">No weak areas detected. Excellent performance!</p>
        ) : (
          <ul className="list-disc ml-6 text-red-700">
            {weakTopics.map((t) => (
              <li key={t.topic}>
                {t.topic.split('(course-name-is)')[0].trim()}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mb-6">
        <button
          onClick={async () => {
            if (!analyseid) return;

            const confirmed = window.confirm("Generate a personalized course based on this analysis?");
            if (!confirmed) return;

            const interestsInput = window.prompt("Please enter your areas of interest (separated by commas):", "");
            if (interestsInput === null) return; // User cancelled

            const interests = interestsInput
              .split(",")
              .map((i) => i.trim())
              .filter((i) => i.length > 0);

            try {
              const res = await fetch("/api/generate-course", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  uploadid: analyseid,
                  strongTopics: strongTopics.map((t) => t.topic),
                  weakTopics: weakTopics.map((t) => t.topic),
                  interests, // send the new interests array
                }),
              });

              if (!res.ok) {
                throw new Error("Failed to generate course");
              }

              alert("Personalized course generation has been initiated successfully.");
            } catch (error) {
              console.error(error);
              alert("Something went wrong. Please try again.");
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md"
        >
          🎯 Generate Personalized Course
        </button>
      </div>
      <div className="space-y-6">
        {parts.map(part => {
          const partQuestions = questions.filter(q => q.part === part);
          const partCorrect = partQuestions.filter(q => q.user_answer === q.correct_answer).length;
          return (
            <div key={part} className="border p-4 rounded-lg shadow-sm bg-white">
              <h2 className="text-xl font-semibold mb-2">
                Part {part} - Score: {(partCorrect / partQuestions.length * 100).toFixed(2)}%
              </h2>
              <ul className="list-disc ml-6 space-y-1">
                {partQuestions.map(q => (
                  <li key={q.id}>
                    <strong>Q:</strong> {q.question}<br />
                    <span className={`${q.user_answer === q.correct_answer ? "text-green-600" : "text-red-600"}`}>
                      Your Answer: {q[`option_${q.user_answer}` as keyof Question] || "Not answered"}
                    </span><br />
                    Correct Answer: {q[`option_${q.correct_answer}` as keyof Question]}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

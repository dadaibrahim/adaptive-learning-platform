"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

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

export default function QuizPage() {
  const params= useParams();
  const id=params.id;
  const quizid=params.quizid;
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    if (!quizid) return;

    const numericId = parseInt(quizid as string, 10);
    const uploadid = Math.floor(numericId / 10);
    const part = numericId % 10;

    const fetchQuizData = async () => {
      try {
        const res = await fetch(
          `https://6807abe0942707d722dc100d.mockapi.io/quiz?uploadid=${uploadid}&part=${part}`
        );
        const data: Question[] = await res.json();
        setQuestions(data);

        const allAnswered = data.every((q) => q.user_answer !== "");
        setAlreadySubmitted(allAnswered);
        setSubmitted(allAnswered);
      } catch (err) {
        console.error("Failed to fetch quiz data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizData();
  }, [quizid]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, user_answer: answer } : q
      )
    );
  };

  const handleSubmit = async () => {
    try {
      await Promise.all(
        questions.map((q) =>
          fetch(`https://6807abe0942707d722dc100d.mockapi.io/quiz/${q.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_answer: q.user_answer }),
          })
        )
      );
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit answers", err);
    }
  };

  const handleGoBack = () => {
    router.push(`/${id}`);
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (questions.length === 0) return <div className="p-6 text-red-500">No questions found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        Quiz: {questions[0]?.topic.split('(course-name-is)')[0].trim()} (Part {questions[0]?.part})
      </h1>

      {alreadySubmitted ? (
        <div className="text-red-600 text-lg font-semibold mb-6">
          This quiz has already been completed. You cannot retake it.
        </div>
      ) : (
        <form className="space-y-8">
          {questions.map((q, index) => (
            <div key={q.id} className="border p-4 rounded shadow-sm">
              <h2 className="text-lg font-semibold mb-4">
                Q{index + 1}: {q.question}
              </h2>
              {["a", "b", "c", "d"].map((opt) => (
                <label key={opt} className="block mb-2">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={opt}
                    checked={q.user_answer === opt}
                    disabled={submitted}
                    onChange={() => handleAnswerChange(q.id, opt)}
                    className="mr-2"
                  />
                  {q[`option_${opt}` as keyof Question]}
                </label>
              ))}

              {submitted && (
                <div className={`mt-2 text-sm ${q.user_answer === q.correct_answer ? "text-green-600" : "text-red-500"}`}>
                  Your answer: {q[`option_${q.user_answer}` as keyof Question] || "Not answered"} <br />
                  Correct answer: {q[`option_${q.correct_answer}` as keyof Question]}
                </div>
              )}
            </div>
          ))}

          {!submitted && (
            <button
              type="button"
              onClick={handleSubmit}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Submit Answers
            </button>
          )}
        </form>
      )}

      {submitted && (
        <>
          <div className="mt-6 text-xl font-semibold text-center">
            Score: {questions.filter((q) => q.user_answer === q.correct_answer).length} / {questions.length}
          </div>
          <div className="text-center mt-4">
            <button
              className="mt-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
              onClick={handleGoBack}
            >
              Go Back to Parts
            </button>
          </div>
        </>
      )}
    </div>
  );
}

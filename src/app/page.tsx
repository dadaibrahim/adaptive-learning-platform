"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TopicGeneratorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [age, setAge] = useState<number>(16);
  const [uploadid, setUploadId] = useState<number | null>(null);
  const [lastPart, setLastPart] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const getNewUploadId = async (): Promise<number> => {
    const res = await fetch("/api/get-latest-uploadid");
    const data = await res.json();
    return data.latestUploadId + 1; // generate a unique new ID
  };

  const handleSubmit = async () => {
    if (!file) return alert("Please select a file");

    setLoading(true);

    try {
      const newUploadId = await getNewUploadId();

      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = btoa(
          new Uint8Array(reader.result as ArrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        const res = await fetch("/api/topics-generator", {
          method: "POST",
          body: JSON.stringify({
            files: [{ data: base64Data }],
            uploadid: newUploadId,
            age: age,
          }),
        });

        const text = await res.text();
        const jsonMatch = text.match(/\{.*?\}$/);
        if (jsonMatch) {
          const metadata = JSON.parse(jsonMatch[0]);
          setUploadId(metadata.uploadid);
          setLastPart(metadata.lastPart);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRedirect = () => {
    if (uploadid !== null && lastPart !== null) {
      const id = uploadid * 10 + lastPart;
      router.push(`/${id}`);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Topic Generator</h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="block w-full p-2 border rounded"
      />

      <input
        type="number"
        value={age}
        onChange={(e) => setAge(Number(e.target.value))}
        className="block w-full p-2 border rounded"
        placeholder="Enter learner age"
      />

      <button
        onClick={handleSubmit}
        disabled={loading || !file}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        {loading ? "Generating topics..." : "Generate Topics"}
      </button>

      {uploadid && lastPart && (
        <button
          onClick={handleRedirect}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
        >
          Proceed
        </button>
      )}
    </div>
  );
}

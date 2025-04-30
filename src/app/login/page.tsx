"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const { data: users } = await axios.get("https://680e3ff2c47cb8074d92884a.mockapi.io/users");

      const user = users.find((u: any) => u.email === email);

      if (!user) {
        setError("User not found.");
        return;
      }

      if (user.password_hash !== password) {
        setError("Incorrect password.");
        return;
      }

      if (user.account_active === false) {
        setError("Account is inactive. Please contact support.");
        return;
      }

      // ✅ Save user session in cookie
      document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/;`;

      // Admin Check
      if (user.name?.toLowerCase() === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }

    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-2xl"
      >
        <h2 className="text-center text-2xl font-bold text-gray-800">Login to Your Account</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}

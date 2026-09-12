"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OperatorPage() {
  const router = useRouter();

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== "1234") {
      setError("Incorrect password.");
      return;
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("operators")
      .select(`
        id,
        employee_id,
        name,
        assigned_center_id,
        procurement_centers (
          name,
          address,
          district,
          mandal
        )
      `)
      .eq("employee_id", employeeId)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      setError("Operator not found.");
      return;
    }

    localStorage.setItem(
      "krishaksamay-operator",
      JSON.stringify(data)
    );

    router.push("/operator/dashboard");
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-stone-900">
            Operator Login
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            Sign in using your employee ID.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-stone-700">
                Employee ID
              </label>

              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="EMP001"
                className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-green-600"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-stone-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="1234"
                className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-green-600"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white transition hover:bg-green-800"
            >
              Login
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-stone-400">
            Development login · Real authentication will be added later
          </p>
        </div>
      </div>
    </main>
  );
}
"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function FarmerLoginPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedPhone) {
      return;
    }

    if (!/^\d{10}$/.test(trimmedPhone)) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: farmerError } = await supabase.rpc(
        "get_or_create_farmer",
        {
          p_phone: trimmedPhone,
        }
      );

      if (farmerError) {
        throw farmerError;
      }

      const farmer = data?.[0];

      if (!farmer?.farmer_id) {
        throw new Error("Unable to create or find farmer.");
      }

      localStorage.setItem(
        "krishaksamay-farmer",
        JSON.stringify({
          id: farmer.farmer_id,
          name: trimmedName,
          phone: trimmedPhone,
        })
      );

      if (farmer.state && farmer.district && farmer.mandal) {
        localStorage.setItem(
          "krishaksamay-farmer-location",
          JSON.stringify({
            state: farmer.state,
            stateLabel: farmer.state,
            district: farmer.district,
            districtLabel: farmer.district,
            mandal: farmer.mandal,
            mandalLabel: farmer.mandal,
          })
        );

        window.location.href = "/farmer/dashboard";
      } else {
        localStorage.removeItem("krishaksamay-farmer-location");
        window.location.href = "/farmer/location";
      }
    } catch (err) {
      console.error("Farmer login error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8f3] px-4 py-6 text-stone-900">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col">

        {/* Back */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-stone-500 transition hover:text-stone-800"
          >
            ← Back
          </Link>
        </div>

        {/* Header */}
        <section className="mt-10">
          <div className="mb-3 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            Farmer
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-stone-900">
            Welcome to KrishakSamay
          </h1>

          <p className="mt-3 leading-6 text-stone-500">
            Enter your details to continue to your farmer dashboard.
          </p>
        </section>

        {/* Form */}
        <section className="mt-8 space-y-5">

          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-semibold text-stone-700"
            >
              Your name
            </label>

            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-4 text-base outline-none transition placeholder:text-stone-400 focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-semibold text-stone-700"
            >
              Phone number
            </label>

            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(event) => {
                const value = event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10);

                setPhone(value);
                setError("");
              }}
              placeholder="Enter your phone number"
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-4 text-base outline-none transition placeholder:text-stone-400 focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </div>

        </section>

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        {/* Continue */}
        <section className="mt-7">
          <button
            type="button"
            onClick={handleContinue}
            disabled={
              !name.trim() ||
              phone.length !== 10 ||
              loading
            }
            className="w-full rounded-2xl bg-green-700 px-5 py-4 text-base font-semibold text-white shadow-[0_8px_24px_rgba(22,101,52,0.16)] transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Continuing..." : "Continue"}
          </button>
        </section>

        {/* Development notice */}
        <p className="mt-5 text-center text-xs leading-5 text-stone-400">
          Development login — real OTP authentication will be added later.
        </p>

        <footer className="mt-auto pt-8 text-center">
          <p className="text-[11px] text-stone-400">
            KrishakSamay · A KrishiSync project
          </p>
        </footer>

      </div>
    </main>
  );
}
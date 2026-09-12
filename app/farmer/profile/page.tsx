"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Farmer = {
  name: string;
  phone: string;
};

type FarmerLocation = {
  stateLabel: string;
  districtLabel: string;
  mandalLabel: string;
  village: string;
};

export default function FarmerProfilePage() {
  const [farmer, setFarmer] = useState<Farmer>({
    name: "",
    phone: "",
  });

  const [location, setLocation] = useState<FarmerLocation | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedFarmer = localStorage.getItem("krishaksamay-farmer");
    const savedLocation = localStorage.getItem(
      "krishaksamay-farmer-location"
    );

    if (savedFarmer) {
      try {
        setFarmer(JSON.parse(savedFarmer));
      } catch {
        setFarmer({ name: "", phone: "" });
      }
    }

    if (savedLocation) {
      try {
        setLocation(JSON.parse(savedLocation));
      } catch {
        setLocation(null);
      }
    }
  }, []);

  function handleSave() {
    if (!farmer.name.trim() || !farmer.phone.trim()) {
      return;
    }

    const updatedFarmer = {
      name: farmer.name.trim(),
      phone: farmer.phone.trim(),
    };

    localStorage.setItem(
      "krishaksamay-farmer",
      JSON.stringify(updatedFarmer)
    );

    setFarmer(updatedFarmer);
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

  return (
    <main className="min-h-screen bg-[#f6f8f3] px-4 py-6 text-stone-900">
      <div className="mx-auto w-full max-w-md">

        {/* Back */}
        <Link
          href="/farmer/dashboard"
          className="inline-flex items-center text-sm font-medium text-stone-500 transition hover:text-stone-800"
        >
          ← Back to dashboard
        </Link>

        {/* Header */}
        <section className="mt-8">
          <div className="mb-3 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            Farmer profile
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-stone-900">
            Your profile
          </h1>

          <p className="mt-2 text-sm leading-6 text-stone-500">
            Keep your details and location up to date.
          </p>
        </section>

        {/* Personal details */}
        <section className="mt-7 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-stone-900">
            Personal details
          </h2>

          {/* Name */}
          <div className="mt-5">
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-semibold text-stone-700"
            >
              Your name
            </label>

            <input
              id="name"
              type="text"
              value={farmer.name}
              onChange={(event) =>
                setFarmer({
                  ...farmer,
                  name: event.target.value,
                })
              }
              placeholder="Enter your name"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-base outline-none transition placeholder:text-stone-400 focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Phone */}
          <div className="mt-5">
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
              value={farmer.phone}
              onChange={(event) =>
                setFarmer({
                  ...farmer,
                  phone: event.target.value,
                })
              }
              placeholder="Enter your phone number"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-base outline-none transition placeholder:text-stone-400 focus:border-green-600 focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!farmer.name.trim() || !farmer.phone.trim()}
            className="mt-5 w-full rounded-xl bg-green-700 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save changes
          </button>

          {saved && (
            <p className="mt-3 text-center text-sm font-medium text-green-700">
              Profile updated successfully.
            </p>
          )}
        </section>

        {/* Location */}
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start">
            <div className="mr-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl">
              📍
            </div>

            <div className="flex-1">
              <h2 className="font-bold text-stone-900">
                Your location
              </h2>

              {location ? (
                <>
                  <p className="mt-2 font-semibold text-stone-800">
                    {location.village}
                  </p>

                  <p className="mt-1 text-sm text-stone-500">
                    {location.mandalLabel}, {location.districtLabel}
                  </p>

                  <p className="text-sm text-stone-500">
                    {location.stateLabel}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm leading-5 text-stone-500">
                  No location selected yet.
                </p>
              )}
            </div>
          </div>

          <Link
            href="/farmer/location"
            className="mt-5 flex w-full items-center justify-center rounded-xl border border-green-200 px-4 py-3 text-sm font-semibold text-green-700 transition hover:bg-green-50"
          >
            {location ? "Change location" : "Select location"}
          </Link>
        </section>

        {/* Navigation */}
        <nav className="mt-8 flex items-center justify-center gap-6 pb-6 text-sm">
          <Link
            href="/farmer/dashboard"
            className="text-stone-500 hover:text-stone-800"
          >
            Home
          </Link>

          <span className="font-semibold text-green-700">
            Profile
          </span>
        </nav>

        {/* Footer */}
        <footer className="pb-6 text-center">
          <p className="text-[11px] text-stone-400">
            KrishakSamay · A KrishiSync project
          </p>
        </footer>

      </div>
    </main>
  );
}
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Language = "en" | "te" | "hi";

const translations = {
  en: {
    category: "Agricultural procurement",
    title: "KrishakSamay",
    tagline: "Procurement, made simpler.",
    description:
      "Know where to go, know when to go, and plan your procurement visit with confidence.",
    farmer: "I am a Farmer",
    farmerDescription: "Find a procurement center",
    center: "Procurement Center",
    centerDescription: "Manage center operations",
    admin: "Administrator",
    adminDescription: "Manage the system",
    footer: "Making procurement visits simpler for farmers.",
  },

  te: {
    category: "వ్యవసాయ కొనుగోలు",
    title: "కృషక్ సమయ్",
    tagline: "కొనుగోలును సులభతరం చేసుకోండి.",
    description:
      "ఎక్కడికి వెళ్లాలో, ఎప్పుడు వెళ్లాలో తెలుసుకుని మీ కొనుగోలు ప్రయాణాన్ని నమ్మకంగా ప్లాన్ చేసుకోండి.",
    farmer: "నేను రైతును",
    farmerDescription: "కొనుగోలు కేంద్రాన్ని కనుగొనండి",
    center: "కొనుగోలు కేంద్రం",
    centerDescription: "కేంద్ర కార్యకలాపాలను నిర్వహించండి",
    admin: "నిర్వాహకుడు",
    adminDescription: "వ్యవస్థను నిర్వహించండి",
    footer: "రైతుల కొనుగోలు ప్రయాణాలను సులభతరం చేయడం.",
  },

  hi: {
    category: "कृषि खरीद",
    title: "कृषकसमय",
    tagline: "खरीद को आसान बनाएं।",
    description:
      "कहां जाना है, कब जाना है जानें और अपनी खरीद यात्रा की बेहतर योजना बनाएं।",
    farmer: "मैं किसान हूँ",
    farmerDescription: "खरीद केंद्र खोजें",
    center: "खरीद केंद्र",
    centerDescription: "केंद्र की गतिविधियां प्रबंधित करें",
    admin: "प्रशासक",
    adminDescription: "सिस्टम प्रबंधित करें",
    footer: "किसानों की खरीद यात्रा को आसान बनाना।",
  },
};

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem(
      "krishaksamay-language"
    ) as Language | null;

    if (
      savedLanguage === "en" ||
      savedLanguage === "te" ||
      savedLanguage === "hi"
    ) {
      setLanguage(savedLanguage);
    }
  }, []);

  function changeLanguage(newLanguage: Language) {
    setLanguage(newLanguage);
    localStorage.setItem("krishaksamay-language", newLanguage);
  }

  const t = translations[language];

  return (
    <main className="min-h-screen bg-[#f6f8f3] px-4 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col">

        {/* Team branding */}
        <header className="flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Image
              src="/krishaksamay-logo.jpeg"
              alt="KrishiSync logo"
              width={110}
              height={110}
              className="h-24 w-24 object-contain"
              priority
            />

            <p className="mt-1 text-[11px] font-medium tracking-wide text-stone-400">
              A KrishiSync project
            </p>
          </div>
        </header>

        {/* Hero */}
        <section className="mt-8">
          <div className="mb-3 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            {t.category}
          </div>

          <h1 className="text-[2.65rem] font-bold leading-[1.05] tracking-tight text-stone-900">
            {t.title}
          </h1>

          <p className="mt-3 text-lg font-medium leading-7 text-stone-700">
            {t.tagline}
          </p>

          <p className="mt-3 text-[15px] leading-6 text-stone-500">
            {t.description}
          </p>
        </section>

        {/* Farmer */}
        <section className="mt-8">
          <Link
            href="/farmer/login"
            className="group flex min-h-[88px] w-full items-center rounded-2xl bg-green-700 px-5 py-4 text-left text-white shadow-[0_8px_24px_rgba(22,101,52,0.16)] transition hover:bg-green-800 active:scale-[0.99]"
          >
            <div className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl">
              🌾
            </div>

            <div className="flex-1">
              <p className="text-lg font-semibold">{t.farmer}</p>

              <p className="mt-0.5 text-sm text-green-100">
                {t.farmerDescription}
              </p>
            </div>

            <span className="text-2xl text-green-100 transition group-hover:translate-x-1">
              →
            </span>
          </Link>
        </section>

        {/* Other roles */}
        <section className="mt-4 space-y-3">

          {/* Procurement Center */}
          <Link
            href="/operator"
            className="group flex min-h-[76px] w-full items-center rounded-2xl border border-stone-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-stone-300 hover:bg-stone-50 active:scale-[0.99]"
          >
            <div className="mr-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-xl">
              🏢
            </div>

            <div className="flex-1">
              <p className="font-semibold text-stone-800">
                {t.center}
              </p>

              <p className="mt-0.5 text-sm text-stone-500">
                {t.centerDescription}
              </p>
            </div>

            <span className="text-xl text-stone-400 transition group-hover:translate-x-1">
              →
            </span>
          </Link>

          {/* Administrator */}
          <Link
            href="/admin"
            className="group flex min-h-[76px] w-full items-center rounded-2xl border border-stone-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-stone-300 hover:bg-stone-50 active:scale-[0.99]"
          >
            <div className="mr-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-xl">
              ⚙️
            </div>

            <div className="flex-1">
              <p className="font-semibold text-stone-800">
                {t.admin}
              </p>

              <p className="mt-0.5 text-sm text-stone-500">
                {t.adminDescription}
              </p>
            </div>

            <span className="text-xl text-stone-400 transition group-hover:translate-x-1">
              →
            </span>
          </Link>

        </section>

        {/* Language */}
        <section className="mt-7 flex items-center justify-center gap-2 text-xs">

          <button
            type="button"
            onClick={() => changeLanguage("en")}
            className={`rounded-full px-3 py-1.5 font-medium transition ${
              language === "en"
                ? "bg-stone-900 text-white"
                : "text-stone-500 hover:bg-white"
            }`}
          >
            English
          </button>

          <button
            type="button"
            onClick={() => changeLanguage("te")}
            className={`rounded-full px-3 py-1.5 font-medium transition ${
              language === "te"
                ? "bg-stone-900 text-white"
                : "text-stone-500 hover:bg-white"
            }`}
          >
            తెలుగు
          </button>

          <button
            type="button"
            onClick={() => changeLanguage("hi")}
            className={`rounded-full px-3 py-1.5 font-medium transition ${
              language === "hi"
                ? "bg-stone-900 text-white"
                : "text-stone-500 hover:bg-white"
            }`}
          >
            हिन्दी
          </button>

        </section>

        {/* Footer */}
        <footer className="mt-auto pt-8 text-center">
          <p className="text-[11px] text-stone-400">
            {t.footer}
          </p>
        </footer>

      </div>
    </main>
  );
}





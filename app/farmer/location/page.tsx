"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const locations = {
  AndhraPradesh: {
    label: "Andhra Pradesh",
    districts: {
      EastGodavari: {
        label: "East Godavari",
        mandals: {
          Rajahmundry: {
            label: "Rajahmundry",
          },
          Kadiyam: {
            label: "Kadiyam",
          },
        },
      },

      Konaseema: {
        label: "Dr. B. R. Ambedkar Konaseema",
        mandals: {
          Amalapuram: {
            label: "Amalapuram",
          },
        },
      },
    },
  },
};

type StateKey = keyof typeof locations;
type DistrictKey = keyof typeof locations[StateKey]["districts"];
type MandalKey =
  keyof typeof locations[StateKey]["districts"][DistrictKey]["mandals"];

export default function FarmerLocationPage() {
  const [state, setState] = useState<StateKey | "">("");
  const [district, setDistrict] = useState<DistrictKey | "">("");
  const [mandal, setMandal] = useState<MandalKey | "">("");

  const selectedState = state ? locations[state] : null;

  const selectedDistrict =
    state && district
      ? locations[state].districts[district]
      : null;

  function handleStateChange(value: StateKey | "") {
    setState(value);
    setDistrict("");
    setMandal("");
  }

  function handleDistrictChange(value: DistrictKey | "") {
    setDistrict(value);
    setMandal("");
  }

  function handleMandalChange(value: MandalKey | "") {
    setMandal(value);
  }

  async function handleSave() {
    if (!state || !district || !mandal) {
      return;
    }

    const farmerData = localStorage.getItem("krishaksamay-farmer");

    if (!farmerData) {
      return;
    }

    try {
      const farmer = JSON.parse(farmerData);

      if (!farmer?.id) {
        return;
      }

      const selectedMandal = Object.entries(
        locations[state].districts[district].mandals
      ).find(([key]) => key === mandal)?.[1];

      if (!selectedMandal) {
        return;
      }

      const location = {
        state,
        stateLabel: locations[state].label,
        district,
        districtLabel: locations[state].districts[district].label,
        mandal,
        mandalLabel: selectedMandal.label,
      };

      const supabase = createClient();

      const { error } = await supabase.rpc("save_farmer_location", {
        p_farmer_id: farmer.id,
        p_state: location.stateLabel,
        p_district: location.districtLabel,
        p_mandal: location.mandalLabel,
      });

      if (error) {
        console.error("Save farmer location error:", error);
        return;
      }

      localStorage.setItem(
        "krishaksamay-farmer-location",
        JSON.stringify(location)
      );

      window.location.href = "/farmer/dashboard";
    } catch (error) {
      console.error("Location save error:", error);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8f3] px-4 py-6 text-stone-900">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col">

        {/* Back */}
        <div>
          <Link
            href="/farmer/dashboard"
            className="inline-flex items-center text-sm font-medium text-stone-500 transition hover:text-stone-800"
          >
            ← Back to dashboard
          </Link>
        </div>

        {/* Header */}
        <section className="mt-8">
          <div className="mb-3 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            Your location
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-stone-900">
            Where are you from?
          </h1>

          <p className="mt-3 leading-6 text-stone-500">
            Select your area so KrishakSamay can show nearby
            procurement centers.
          </p>
        </section>

        {/* Location form */}
        <section className="mt-8 space-y-5">

          {/* State */}
          <div>
            <label
              htmlFor="state"
              className="mb-2 block text-sm font-semibold text-stone-700"
            >
              State
            </label>

            <select
              id="state"
              value={state}
              onChange={(event) =>
                handleStateChange(
                  event.target.value as StateKey | ""
                )
              }
              className="w-full appearance-none rounded-2xl border border-stone-200 bg-white px-4 py-4 text-base outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Select state</option>

              {Object.entries(locations).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <label
              htmlFor="district"
              className="mb-2 block text-sm font-semibold text-stone-700"
            >
              District
            </label>

            <select
              id="district"
              value={district}
              disabled={!state}
              onChange={(event) =>
                handleDistrictChange(
                  event.target.value as DistrictKey | ""
                )
              }
              className="w-full appearance-none rounded-2xl border border-stone-200 bg-white px-4 py-4 text-base outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
            >
              <option value="">Select district</option>

              {selectedState &&
                Object.entries(selectedState.districts).map(
                  ([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  )
                )}
            </select>
          </div>

          {/* Mandal */}
          <div>
            <label
              htmlFor="mandal"
              className="mb-2 block text-sm font-semibold text-stone-700"
            >
              Mandal
            </label>

            <select
              id="mandal"
              value={mandal}
              disabled={!district}
              onChange={(event) =>
                handleMandalChange(
                  event.target.value as MandalKey | ""
                )
              }
              className="w-full appearance-none rounded-2xl border border-stone-200 bg-white px-4 py-4 text-base outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
            >
              <option value="">Select mandal</option>

              {selectedDistrict &&
                Object.entries(selectedDistrict.mandals).map(
                  ([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  )
                )}
            </select>
          </div>

        </section>

        {/* Save */}
        <section className="mt-7">
          <button
            type="button"
            onClick={handleSave}
            disabled={!state || !district || !mandal}
            className="w-full rounded-2xl bg-green-700 px-5 py-4 text-base font-semibold text-white shadow-[0_8px_24px_rgba(22,101,52,0.16)] transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save location
          </button>
        </section>

        <p className="mt-5 text-center text-xs leading-5 text-stone-400">
          You can change your location later.
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
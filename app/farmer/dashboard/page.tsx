"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Farmer = {
  id?: string;
  name: string;
  phone: string;
};

type FarmerLocation = {
  stateLabel: string;
  districtLabel: string;
  mandalLabel: string;
};

type CenterOperation = {
  is_open: boolean;
  active_counters: number;
  people_waiting: number;
  people_processed_today: number;
  operational_message: string | null;
};

type CenterCrop = {
  crops: {
    name: string;
  } | null;
};

type Center = {
  id: string;
  name: string;
  address: string;
  district: string;
  mandal: string;
  is_active: boolean;
  center_operations: CenterOperation | null;
  center_crops: CenterCrop[];
};

function calculateWaitTime(
  waiting: number,
  averageServiceTime: number,
  counters: number
) {
  if (counters === 0) {
    return null;
  }

  return Math.ceil((waiting * averageServiceTime) / counters);
}

export default function FarmerDashboard() {
  const supabase = createClient();

  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [location, setLocation] = useState<FarmerLocation | null>(null);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      const savedFarmer = localStorage.getItem("krishaksamay-farmer");

      const savedLocation = localStorage.getItem(
        "krishaksamay-farmer-location"
      );

      if (savedFarmer) {
        try {
          setFarmer(JSON.parse(savedFarmer));
        } catch {
          setFarmer(null);
        }
      }

      if (savedLocation) {
        try {
          setLocation(JSON.parse(savedLocation));
        } catch {
          setLocation(null);
        }
      }

      const { data, error } = await supabase
        .from("procurement_centers")
        .select(`
          id,
          name,
          address,
          district,
          mandal,
          is_active,
          center_operations (
            is_open,
            active_counters,
            people_waiting,
            people_processed_today,
            operational_message
          ),
          center_crops (
            crops (
              name
            )
          )
        `)
        .eq("is_active", true);

      console.log("Supabase centers:", data);
      console.log("Supabase error:", error);

      if (!error && data) {
        const normalizedCenters: Center[] = data.map((center) => {
  const rawOperations = center.center_operations as unknown;

  const centerOperations: CenterOperation | null =
    Array.isArray(rawOperations)
      ? (rawOperations[0] as CenterOperation | undefined) ?? null
      : (rawOperations as CenterOperation | null);

  return {
    ...center,
    center_operations: centerOperations,
    center_crops:
      center.center_crops?.map((centerCrop) => ({
        ...centerCrop,
        crops: centerCrop.crops?.[0] ?? null,
      })) ?? [],
  };
});
   

        setCenters(normalizedCenters);
      }

      setLoading(false);
    }

    loadDashboardData();
  }, []);

  const farmerName = farmer?.name || "Farmer";

  const relevantCenters = location
    ? centers.filter(
        (center) => center.mandal === location.mandalLabel
      )
    : centers;

  return (
    <main className="min-h-screen bg-[#f6f8f3] px-4 py-6 text-stone-900">
      <div className="mx-auto w-full max-w-md">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-stone-500">
              Welcome
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">
              {farmerName}
            </h1>
          </div>

          <div className="flex flex-col items-start">
            <img
              src="/krishaksamay-logo.jpeg"
              alt="KrishakSamay"
              className="h-12 w-auto object-contain"
            />
          </div>
        </header>

        {/* Location */}
        <section className="mt-7 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start">
            <div className="mr-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl">
              📍
            </div>

            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Your location
              </p>

              {location ? (
                <>
                  <p className="mt-1 font-semibold text-stone-800">
                    {location.mandalLabel}
                  </p>

                  <p className="mt-1 text-sm leading-5 text-stone-500">
                    {location.districtLabel}
                  </p>

                  <p className="text-sm text-stone-500">
                    {location.stateLabel}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 font-semibold text-stone-800">
                    Location not selected
                  </p>

                  <p className="mt-1 text-sm text-stone-500">
                    Select your nearby area to find relevant centers.
                  </p>
                </>
              )}
            </div>
          </div>

          <Link
            href="/farmer/location"
            className="mt-4 flex w-full items-center justify-center rounded-xl border border-green-200 px-4 py-3 text-sm font-semibold text-green-700 transition hover:bg-green-50"
          >
            {location ? "Change location" : "Select location"}
          </Link>
        </section>

        {/* Centers heading */}
        <section className="mt-6">
          <h2 className="text-lg font-bold text-stone-900">
            Procurement centers
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            Check center status and current waiting time.
          </p>
        </section>

        {/* Loading */}
        {loading ? (
          <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-stone-500">
              Loading procurement centers...
            </p>
          </section>
        ) : (
          /* Centers */
          <section className="mt-4 space-y-4">
            {relevantCenters.length > 0 ? (
              relevantCenters.map((center) => {
                const operation = center.center_operations;

                const open = operation?.is_open ?? false;

                const counters =
                  operation?.active_counters ?? 0;

                const waiting =
                  operation?.people_waiting ?? 0;

                /*
                 * The current database does not contain an
                 * average_service_time_minutes column.
                 *
                 * Keep the prototype's existing 6-minute
                 * estimate until that field is properly added
                 * to the database.
                 */
                const averageServiceTime = 6;

                const waitTime = calculateWaitTime(
                  waiting,
                  averageServiceTime,
                  counters
                );

                return (
                  <article
                    key={center.id}
                    className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
                  >
                    {/* Center header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold leading-5 text-stone-900">
                          {center.name}
                        </h3>

                        <p className="mt-1 text-sm text-stone-500">
                          {center.address}
                        </p>

                        <p className="text-sm text-stone-500">
                          {center.mandal}, {center.district}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          open
                            ? "bg-green-100 text-green-700"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {open ? "Open" : "Closed"}
                      </span>
                    </div>

                    {/* Accepted crops */}
                    <div className="mt-4">
                      <p className="text-sm font-medium text-stone-700">
                        Accepted crops
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {center.center_crops.length > 0 ? (
                          center.center_crops.map((centerCrop) =>
                            centerCrop.crops ? (
                              <span
                                key={centerCrop.crops.name}
                                className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800"
                              >
                                {centerCrop.crops.name}
                              </span>
                            ) : null
                          )
                        ) : (
                          <span className="text-sm text-stone-500">
                            No crop information available
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Operational message */}
                    {operation?.operational_message && (
                      <div className="mt-4 rounded-xl bg-green-50 px-4 py-3">
                        <p className="text-sm text-green-800">
                          {operation.operational_message}
                        </p>
                      </div>
                    )}

                    {/* Stats */}
                    {open ? (
                      <div className="mt-5 grid grid-cols-3 gap-2">

                        {/* Counters */}
                        <div className="rounded-xl bg-stone-50 p-3 text-center">
                          <p className="text-lg font-bold text-stone-900">
                            {counters}
                          </p>

                          <p className="mt-1 text-[11px] text-stone-500">
                            Counters
                          </p>
                        </div>

                        {/* Waiting */}
                        <div className="rounded-xl bg-stone-50 p-3 text-center">
                          <p className="text-lg font-bold text-stone-900">
                            {waiting}
                          </p>

                          <p className="mt-1 text-[11px] text-stone-500">
                            Waiting
                          </p>
                        </div>

                        {/* Estimated wait */}
                        <div className="rounded-xl bg-green-50 p-3 text-center">
                          <p className="text-lg font-bold text-green-700">
                            {waitTime !== null
                              ? `~${waitTime}m`
                              : "—"}
                          </p>

                          <p className="mt-1 text-[11px] text-green-700">
                            Est. wait
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 rounded-xl bg-stone-50 px-4 py-3">
                        <p className="text-sm text-stone-500">
                          This center is currently closed.
                        </p>
                      </div>
                    )}

                    {/* View center */}
                    <Link
                      href={`/farmer/centers/${center.id}`}
                      className="mt-4 flex w-full items-center justify-center rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
                    >
                      View center
                      <span className="ml-2">→</span>
                    </Link>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-stone-200 bg-white p-5 text-center shadow-sm">
                <div className="text-3xl">
                  📍
                </div>

                <h3 className="mt-3 font-semibold text-stone-800">
                  No centers found
                </h3>

                <p className="mt-1 text-sm leading-5 text-stone-500">
                  We don't have procurement centers listed for
                  this area yet.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Navigation */}
        <nav className="mt-8 flex items-center justify-center gap-6 pb-6 text-sm">
          <Link
            href="/farmer/dashboard"
            className="font-semibold text-green-700"
          >
            Home
          </Link>

          <Link
            href="/farmer/profile"
            className="text-stone-500 hover:text-stone-800"
          >
            Profile
          </Link>
        </nav>
      </div>
    </main>
  );
}
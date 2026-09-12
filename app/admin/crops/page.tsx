"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Crop = {
  id: string;
  name: string;
};

type CenterCrop = {
  center_id: string;
  crop_id: string;
};

type Center = {
  id: string;
  name: string;
  district: string;
  mandal: string;
};

export default function AdminCropsPage() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [centerCrops, setCenterCrops] = useState<CenterCrop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      const [
        { data: cropData },
        { data: centerData },
        { data: mappingData },
      ] = await Promise.all([
        supabase
          .from("crops")
          .select("id, name")
          .order("name"),

        supabase
          .from("procurement_centers")
          .select("id, name, district, mandal")
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("center_crops")
          .select("center_id, crop_id"),
      ]);

      if (cropData) {
        setCrops(cropData as Crop[]);
      }

      if (centerData) {
        setCenters(centerData as Center[]);
      }

      if (mappingData) {
        setCenterCrops(mappingData as CenterCrop[]);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  function getCropsForCenter(centerId: string) {
    const cropIds = centerCrops
      .filter((mapping) => mapping.center_id === centerId)
      .map((mapping) => mapping.crop_id);

    return crops.filter((crop) =>
      cropIds.includes(crop.id)
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8f3] px-4 py-6 text-stone-900">
      <div className="mx-auto w-full max-w-4xl">

        {/* Header */}
        <header>
          <p className="text-sm text-stone-500">
            Admin
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Crop Management
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            View the crops currently accepted at each center.
          </p>
        </header>

        {/* Crop list */}
        <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">
            Available crops
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {crops.map((crop) => (
              <span
                key={crop.id}
                className="rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-800"
              >
                {crop.name}
              </span>
            ))}
          </div>
        </section>

        {/* Center crop mapping */}
        <section className="mt-8">
          <h2 className="text-xl font-bold">
            Center crop acceptance
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            Current crop configuration for active centers.
          </p>

          {loading ? (
            <div className="mt-4 rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-stone-500">
                Loading crop information...
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {centers.map((center) => {
                const centerAcceptedCrops =
                  getCropsForCenter(center.id);

                return (
                  <article
                    key={center.id}
                    className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
                  >
                    <h3 className="font-semibold">
                      {center.name}
                    </h3>

                    <p className="mt-1 text-sm text-stone-500">
                      {center.mandal}, {center.district}
                    </p>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Accepted crops
                      </p>

                      {centerAcceptedCrops.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {centerAcceptedCrops.map((crop) => (
                            <span
                              key={crop.id}
                              className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800"
                            >
                              {crop.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-stone-500">
                          No crops configured.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Navigation */}
        <nav className="mt-8 flex flex-wrap gap-6 pb-8 text-sm">
          <a
            href="/admin/dashboard"
            className="text-stone-500 hover:text-stone-800"
          >
            Dashboard
          </a>

          <a
            href="/admin/centers"
            className="text-stone-500 hover:text-stone-800"
          >
            Centers
          </a>

          <a
            href="/admin/operators"
            className="text-stone-500 hover:text-stone-800"
          >
            Operators
          </a>

          <a
            href="/admin/crops"
            className="font-semibold text-green-700"
          >
            Crops
          </a>
        </nav>

      </div>
    </main>
  );
}
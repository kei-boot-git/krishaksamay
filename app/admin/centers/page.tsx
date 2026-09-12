"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Center = {
  id: string;
  name: string;
  address: string;
  district: string;
  mandal: string;
  is_active: boolean;
};

export default function AdminCentersPage() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [mandal, setMandal] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadCenters() {
    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "admin_get_centers"
    );

    if (!error && data) {
      setCenters(data as Center[]);
    } else if (error) {
      setMessage("Could not load centers.");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCenters();
  }, []);

  async function addCenter(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");

    if (!name || !address || !district || !mandal) {
      setMessage("Please fill in all fields.");
      return;
    }

    setSaving(true);

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_add_center",
      {
        p_name: name,
        p_address: address,
        p_district: district,
        p_mandal: mandal,
      }
    );

    if (error) {
      console.error("Add center error:", error);
      setMessage("Could not add center.");
      setSaving(false);
      return;
    }

    setName("");
    setAddress("");
    setDistrict("");
    setMandal("");

    setMessage("Center added successfully.");

    await loadCenters();

    setSaving(false);
  }

  async function toggleCenter(
    centerId: string,
    currentStatus: boolean
  ) {
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_set_center_active",
      {
        p_center_id: centerId,
        p_is_active: !currentStatus,
      }
    );

    if (error) {
      console.error("Update center error:", error);
      setMessage("Could not update center.");
      return;
    }

    setMessage(
      currentStatus
        ? "Center deactivated."
        : "Center activated."
    );

    await loadCenters();
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
            Procurement Centers
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            Add and manage procurement centers.
          </p>
        </header>

        {/* Add Center */}
        <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">
            Add center
          </h2>

          <form
            onSubmit={addCenter}
            className="mt-5 space-y-4"
          >
            <input
              type="text"
              placeholder="Center name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-green-600"
            />

            <input
              type="text"
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-green-600"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="District"
                value={district}
                onChange={(e) =>
                  setDistrict(e.target.value)
                }
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-green-600"
              />

              <input
                type="text"
                placeholder="Mandal"
                value={mandal}
                onChange={(e) =>
                  setMandal(e.target.value)
                }
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-green-600"
              />
            </div>

            {message && (
              <p
                className={`rounded-xl px-4 py-3 text-sm ${
                  message.includes("Could not")
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add center"}
            </button>
          </form>
        </section>

        {/* Center List */}
        <section className="mt-8">
          <h2 className="text-xl font-bold">
            All centers
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            {centers.length} centers in the system.
          </p>

          {loading ? (
            <div className="mt-4 rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-stone-500">
                Loading centers...
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {centers.map((center) => (
                <article
                  key={center.id}
                  className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">
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
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        center.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {center.is_active
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      toggleCenter(
                        center.id,
                        center.is_active
                      )
                    }
                    className="mt-4 rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    {center.is_active
                      ? "Deactivate"
                      : "Activate"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Navigation */}
        <nav className="mt-8 flex gap-6 pb-8 text-sm">
          <a
            href="/admin/dashboard"
            className="text-stone-500 hover:text-stone-800"
          >
            Dashboard
          </a>

          <a
            href="/admin/centers"
            className="font-semibold text-green-700"
          >
            Centers
          </a>

          <a
            href="/admin/operators"
            className="text-stone-500"
          >
            Operators
          </a>
        </nav>

      </div>
    </main>
  );
}
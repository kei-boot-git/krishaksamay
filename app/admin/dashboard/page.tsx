"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CenterOperation = {
  is_open: boolean;
  active_counters: number;
  people_waiting: number;
  people_processed_today: number;
};

type Center = {
  id: string;
  name: string;
  address: string;
  district: string;
  mandal: string;
  is_active: boolean;
  center_operations: CenterOperation | null;
};

type Operator = {
  id: string;
  employee_id: string;
  name: string;
  is_active: boolean;
  assigned_center_id: string | null;
};

export default function AdminDashboard() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const [
      { data: centerData, error: centerError },
      { data: operatorData, error: operatorError },
    ] = await Promise.all([
      supabase
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
            people_processed_today
          )
        `)
        .eq("is_active", true),

      supabase
        .from("operators")
        .select(`
          id,
          employee_id,
          name,
          is_active,
          assigned_center_id
        `)
        .eq("is_active", true),
    ]);

    if (centerError || operatorError) {
      setError(
        centerError?.message ||
          operatorError?.message ||
          "Unable to load dashboard."
      );
    }

    setCenters((centerData as Center[]) || []);
    setOperators((operatorData as Operator[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const openCenters = centers.filter(
    (center) => center.center_operations?.is_open
  );

  const closedCenters = centers.filter(
    (center) => !center.center_operations?.is_open
  );

  const totalWaiting = centers.reduce(
    (total, center) =>
      total +
      (center.center_operations?.people_waiting || 0),
    0
  );

  const totalProcessed = centers.reduce(
    (total, center) =>
      total +
      (center.center_operations?.people_processed_today || 0),
    0
  );

  const totalCounters = centers.reduce(
    (total, center) =>
      total +
      (center.center_operations?.active_counters || 0),
    0
  );

  const assignedOperators = operators.filter(
    (operator) => operator.assigned_center_id
  );

  return (
    <main className="min-h-screen bg-[#f6f8f3] text-stone-900">

      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-green-700">
              KrishakSamay
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Admin Dashboard
            </h1>

            <p className="mt-1 text-sm text-stone-500">
              System-wide procurement operations.
            </p>
          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={loadDashboard}
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
            >
              Refresh
            </button>

            <Link
              href="/"
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              Exit
            </Link>

          </div>

        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">

        {/* Loading */}
        {loading ? (
          <section className="rounded-2xl border border-stone-200 bg-white p-12 text-center shadow-sm">
            <p className="text-sm text-stone-500">
              Loading dashboard...
            </p>
          </section>
        ) : (
          <>
            {/* Error */}
            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* KPI cards */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">
                  Total centers
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {centers.length}
                </p>

                <p className="mt-2 text-xs text-stone-400">
                  Active procurement centers
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">
                  Open centers
                </p>

                <p className="mt-2 text-3xl font-bold text-green-700">
                  {openCenters.length}
                </p>

                <p className="mt-2 text-xs text-stone-400">
                  Currently accepting farmers
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">
                  People waiting
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {totalWaiting}
                </p>

                <p className="mt-2 text-xs text-stone-400">
                  Across all centers
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">
                  Active counters
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {totalCounters}
                </p>

                <p className="mt-2 text-xs text-stone-400">
                  Currently operating
                </p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">
                  Processed today
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {totalProcessed}
                </p>

                <p className="mt-2 text-xs text-stone-400">
                  Across all centers
                </p>
              </div>

            </section>

            {/* Main workspace */}
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">

              {/* Centers */}
              <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">

                <div className="flex items-center justify-between">

                  <div>
                    <h2 className="text-xl font-bold">
                      Procurement Centers
                    </h2>

                    <p className="mt-1 text-sm text-stone-500">
                      Live operational overview across active centers.
                    </p>
                  </div>

                  <Link
                    href="/admin/centers"
                    className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
                  >
                    Manage centers
                  </Link>

                </div>

                <div className="mt-5 overflow-x-auto">

                  <div className="min-w-[720px]">

                    {/* Table header */}
                    <div className="grid grid-cols-[1.5fr_1fr_100px_100px_110px] gap-4 rounded-xl bg-stone-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
                      <span>Center</span>
                      <span>Location</span>
                      <span>Status</span>
                      <span>Waiting</span>
                      <span>Processed</span>
                    </div>

                    <div className="mt-2 space-y-2">

                      {centers.map((center) => {
                        const operation =
                          center.center_operations;

                        const isOpen =
                          operation?.is_open ?? false;

                        return (
                          <div
                            key={center.id}
                            className="grid grid-cols-[1.5fr_1fr_100px_100px_110px] items-center gap-4 rounded-xl border border-stone-200 px-5 py-4 hover:bg-stone-50"
                          >

                            {/* Center */}
                            <div>
                              <p className="font-semibold">
                                {center.name}
                              </p>

                              <p className="mt-1 text-xs text-stone-400">
                                {center.address}
                              </p>
                            </div>

                            {/* Location */}
                            <div>
                              <p className="text-sm">
                                {center.mandal}
                              </p>

                              <p className="text-xs text-stone-400">
                                {center.district}
                              </p>
                            </div>

                            {/* Status */}
                            <div>
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                  isOpen
                                    ? "bg-green-100 text-green-700"
                                    : "bg-stone-100 text-stone-500"
                                }`}
                              >
                                {isOpen
                                  ? "Open"
                                  : "Closed"}
                              </span>
                            </div>

                            {/* Waiting */}
                            <div>
                              <p className="text-lg font-bold">
                                {operation?.people_waiting || 0}
                              </p>
                            </div>

                            {/* Processed */}
                            <div>
                              <p className="text-lg font-bold">
                                {operation?.people_processed_today || 0}
                              </p>
                            </div>

                          </div>
                        );
                      })}

                    </div>

                  </div>

                </div>

                {centers.length === 0 && (
                  <div className="mt-5 rounded-xl bg-stone-50 p-8 text-center">
                    <p className="text-sm text-stone-500">
                      No active procurement centers found.
                    </p>
                  </div>
                )}

              </section>

              {/* Right column */}
              <div className="space-y-6">

                {/* Center status */}
                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">

                  <h2 className="font-bold">
                    Center status
                  </h2>

                  <div className="mt-5 space-y-3">

                    <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-green-900">
                          Open
                        </p>

                        <p className="text-xs text-green-700">
                          Operating normally
                        </p>
                      </div>

                      <p className="text-2xl font-bold text-green-700">
                        {openCenters.length}
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-700">
                          Closed
                        </p>

                        <p className="text-xs text-stone-500">
                          Not currently operating
                        </p>
                      </div>

                      <p className="text-2xl font-bold text-stone-500">
                        {closedCenters.length}
                      </p>
                    </div>

                  </div>

                </section>

                {/* Operators */}
                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">

                  <div className="flex items-center justify-between">

                    <div>
                      <h2 className="font-bold">
                        Operators
                      </h2>

                      <p className="mt-1 text-xs text-stone-500">
                        Active system operators
                      </p>
                    </div>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      {operators.length} active
                    </span>

                  </div>

                  <div className="mt-5 space-y-3">

                    {operators.slice(0, 4).map((operator) => {

                      const assignedCenter =
                        centers.find(
                          (center) =>
                            center.id ===
                            operator.assigned_center_id
                        );

                      return (
                        <div
                          key={operator.id}
                          className="rounded-xl border border-stone-200 px-4 py-3"
                        >

                          <div className="flex items-center justify-between gap-3">

                            <div>
                              <p className="text-sm font-semibold">
                                {operator.name}
                              </p>

                              <p className="mt-1 text-xs text-stone-400">
                                {operator.employee_id}
                              </p>
                            </div>

                            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />

                          </div>

                          <p className="mt-3 text-xs text-stone-500">
                            {assignedCenter
                              ? assignedCenter.name
                              : "No center assigned"}
                          </p>

                        </div>
                      );
                    })}

                    {operators.length === 0 && (
                      <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">
                        No active operators found.
                      </p>
                    )}

                  </div>

                  <Link
                    href="/admin/operators"
                    className="mt-4 block rounded-lg border border-stone-200 px-4 py-3 text-center text-sm font-semibold text-stone-600 hover:bg-stone-50"
                  >
                    Manage operators
                  </Link>

                </section>

                {/* Quick actions */}
                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">

                  <h2 className="font-bold">
                    Administration
                  </h2>

                  <div className="mt-4 space-y-2">

                    <Link
                      href="/admin/centers"
                      className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3 text-sm font-semibold hover:bg-stone-100"
                    >
                      <span>Procurement Centers</span>
                      <span>→</span>
                    </Link>

                    <Link
                      href="/admin/operators"
                      className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3 text-sm font-semibold hover:bg-stone-100"
                    >
                      <span>Operators</span>
                      <span>→</span>
                    </Link>

                    <Link
                      href="/admin/crops"
                      className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3 text-sm font-semibold hover:bg-stone-100"
                    >
                      <span>Crop Management</span>
                      <span>→</span>
                    </Link>

                  </div>

                </section>

              </div>

            </div>

            {/* Bottom navigation */}
            <nav className="mt-6 flex flex-wrap gap-2 border-t border-stone-200 pt-5 pb-8">

              <Link
                href="/admin/dashboard"
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Dashboard
              </Link>

              <Link
                href="/admin/centers"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-stone-500 hover:bg-white hover:text-stone-700"
              >
                Centers
              </Link>

              <Link
                href="/admin/operators"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-stone-500 hover:bg-white hover:text-stone-700"
              >
                Operators
              </Link>

              <Link
                href="/admin/crops"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-stone-500 hover:bg-white hover:text-stone-700"
              >
                Crops
              </Link>

            </nav>

          </>
        )}

      </div>

    </main>
  );
}
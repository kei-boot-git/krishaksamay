"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Center = {
  id: string;
  name: string;
  district: string;
  mandal: string;
  is_active: boolean;
};

type Operator = {
  id: string;
  employee_id: string;
  name: string;
  phone: string | null;
  assigned_center_id: string | null;
  is_active: boolean;
  procurement_centers: {
    name: string;
    district: string;
    mandal: string;
  } | null;
};

export default function AdminOperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [phone, setPhone] = useState("");
  const [newCenterId, setNewCenterId] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadData() {
    setLoading(true);

    const supabase = createClient();

    const [
      { data: operatorData, error: operatorError },
      { data: centerData, error: centerError },
    ] = await Promise.all([
      supabase
        .from("operators")
        .select(`
          id,
          employee_id,
          name,
          phone,
          assigned_center_id,
          is_active,
          procurement_centers (
            name,
            district,
            mandal
          )
        `)
        .order("name"),

      supabase.rpc("admin_get_centers"),
    ]);

    if (operatorError || centerError) {
      setMessage(
        operatorError?.message ||
          centerError?.message ||
          "Unable to load operator data."
      );
    }

   if (!operatorError && operatorData) {
  setOperators(
    operatorData.map((operator) => ({
      ...operator,
      procurement_centers:
        operator.procurement_centers?.[0] ?? null,
    })) as Operator[]
  );
}

    if (!centerError && centerData) {
      setCenters(centerData as Center[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createOperator(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setMessage("");

    if (!employeeId.trim() || !operatorName.trim()) {
      setMessage("Employee ID and operator name are required.");
      return;
    }

    setCreating(true);

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_create_operator",
      {
        p_employee_id: employeeId.trim(),
        p_name: operatorName.trim(),
        p_phone: phone.trim(),
        p_center_id: newCenterId || null,
      }
    );

    if (error) {
      console.error("Create operator error:", error);
      setMessage(
        error.message ||
          "Could not create operator."
      );
      setCreating(false);
      return;
    }

    setEmployeeId("");
    setOperatorName("");
    setPhone("");
    setNewCenterId("");

    setMessage("Operator created successfully.");

    await loadData();

    setCreating(false);
  }

  async function toggleOperator(
    operatorId: string,
    currentStatus: boolean
  ) {
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_set_operator_active",
      {
        p_operator_id: operatorId,
        p_is_active: !currentStatus,
      }
    );

    if (error) {
      console.error("Operator status error:", error);
      setMessage("Could not update operator access.");
      return;
    }

    setMessage(
      currentStatus
        ? "Operator access revoked."
        : "Operator access granted."
    );

    await loadData();
  }

  async function assignOperator(
    operatorId: string,
    centerId: string
  ) {
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_assign_operator",
      {
        p_operator_id: operatorId,
        p_center_id: centerId,
      }
    );

    if (error) {
      console.error("Operator assignment error:", error);
      setMessage("Could not assign operator.");
      return;
    }

    setMessage("Operator assigned successfully.");

    await loadData();
  }

  async function unassignOperator(
    operatorId: string
  ) {
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "admin_assign_operator",
      {
        p_operator_id: operatorId,
        p_center_id: null,
      }
    );

    if (error) {
      console.error("Operator unassignment error:", error);
      setMessage("Could not remove operator assignment.");
      return;
    }

    setMessage("Operator assignment removed.");

    await loadData();
  }

  const activeOperators = operators.filter(
    (operator) => operator.is_active
  );

  const activeCenters = centers.filter(
    (center) => center.is_active
  );

  return (
    <main className="min-h-screen bg-[#f6f8f3] px-4 py-6 text-stone-900">
      <div className="mx-auto w-full max-w-4xl">

        {/* Header */}
        <header>
          <p className="text-sm text-stone-500">
            Admin
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Operators
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            Create operators, manage access, and assign procurement centers.
          </p>
        </header>

        {/* Message */}
        {message && (
          <div
            className={`mt-6 rounded-xl px-4 py-3 text-sm ${
              message.toLowerCase().includes("could not") ||
              message.toLowerCase().includes("unable") ||
              message.toLowerCase().includes("required") ||
              message.toLowerCase().includes("already exists")
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {message}
          </div>
        )}

        {/* Summary */}
        <section className="mt-8 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-stone-500">
              Total operators
            </p>

            <p className="mt-2 text-3xl font-bold">
              {operators.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-stone-500">
              Active operators
            </p>

            <p className="mt-2 text-3xl font-bold text-green-700">
              {activeOperators.length}
            </p>
          </div>
        </section>

        {/* Create Operator */}
        <section className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">
            Create operator
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            Create a new operator and optionally assign a center.
          </p>

          <form
            onSubmit={createOperator}
            className="mt-5 space-y-4"
          >
            <input
              type="text"
              placeholder="Employee ID"
              value={employeeId}
              onChange={(e) =>
                setEmployeeId(e.target.value)
              }
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-green-600"
            />

            <input
              type="text"
              placeholder="Operator name"
              value={operatorName}
              onChange={(e) =>
                setOperatorName(e.target.value)
              }
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-green-600"
            />

            <input
              type="text"
              placeholder="Phone number (optional)"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-green-600"
            />

            <select
              value={newCenterId}
              onChange={(e) =>
                setNewCenterId(e.target.value)
              }
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-green-600"
            >
              <option value="">
                No center assigned
              </option>

              {activeCenters.map((center) => (
                <option
                  key={center.id}
                  value={center.id}
                >
                  {center.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {creating
                ? "Creating..."
                : "Create operator"}
            </button>
          </form>
        </section>

        {/* Operators */}
        <section className="mt-8">
          <h2 className="text-xl font-bold">
            Operator list
          </h2>

          {loading ? (
            <div className="mt-4 rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-stone-500">
                Loading operators...
              </p>
            </div>
          ) : operators.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-stone-500">
                No operators found.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {operators.map((operator) => (
                <article
                  key={operator.id}
                  className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
                >
                  {/* Operator header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-stone-900">
                        {operator.name}
                      </h3>

                      <p className="mt-1 text-sm text-stone-500">
                        Employee ID: {operator.employee_id}
                      </p>

                      {operator.phone && (
                        <p className="text-sm text-stone-500">
                          {operator.phone}
                        </p>
                      )}
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        operator.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {operator.is_active
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>

                  {/* Assignment */}
                  <div className="mt-5 rounded-xl bg-stone-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                      Assigned center
                    </p>

                    {operator.procurement_centers ? (
                      <>
                        <p className="mt-1 font-semibold text-stone-800">
                          {operator.procurement_centers.name}
                        </p>

                        <p className="mt-1 text-sm text-stone-500">
                          {operator.procurement_centers.mandal},{" "}
                          {operator.procurement_centers.district}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-stone-500">
                        No center assigned
                      </p>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="mt-4 space-y-3">

                    {/* Center assignment */}
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                        Change center
                      </label>

                      <select
                        value={
                          operator.assigned_center_id || ""
                        }
                        onChange={(e) => {
                          const value = e.target.value;

                          if (!value) {
                            unassignOperator(
                              operator.id
                            );
                          } else {
                            assignOperator(
                              operator.id,
                              value
                            );
                          }
                        }}
                        className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-green-600"
                      >
                        <option value="">
                          No center assigned
                        </option>

                        {activeCenters.map((center) => (
                          <option
                            key={center.id}
                            value={center.id}
                          >
                            {center.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Access control */}
                    <button
                      onClick={() =>
                        toggleOperator(
                          operator.id,
                          operator.is_active
                        )
                      }
                      className={`w-full rounded-xl px-4 py-3 text-sm font-semibold ${
                        operator.is_active
                          ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          : "bg-green-700 text-white hover:bg-green-800"
                      }`}
                    >
                      {operator.is_active
                        ? "Revoke access"
                        : "Grant access"}
                    </button>

                  </div>
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
            className="text-stone-500 hover:text-stone-800"
          >
            Centers
          </a>

          <a
            href="/admin/operators"
            className="font-semibold text-green-700"
          >
            Operators
          </a>
        </nav>

      </div>
    </main>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Token = {
  id: string;
  token_number: number;
  status: string;
  created_at: string;
  farmer_name: string | null;
  crop: {
    name: string;
  } | null;
};

type Operator = {
  employee_id: string;
  name: string;
  assigned_center_id: string | null;
};

type Center = {
  id: string;
  name: string;
};

type CenterOperation = {
  is_open: boolean;
  active_counters: number;
  people_waiting: number;
  people_processed_today: number;
  operational_message: string | null;
};

type Crop = {
  id: string;
  name: string;
};

type CenterCrop = {
  crop_id: string;
};

export default function OperatorDashboard() {
  const supabase = createClient();

  const [operator, setOperator] =
    useState<Operator | null>(null);

  const [center, setCenter] =
    useState<Center | null>(null);

  const [operation, setOperation] =
    useState<CenterOperation | null>(null);

  const [tokens, setTokens] =
    useState<Token[]>([]);

  const [allCrops, setAllCrops] =
    useState<Crop[]>([]);

  const [selectedCropIds, setSelectedCropIds] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [operationLoading, setOperationLoading] =
    useState(false);

  const [cropLoading, setCropLoading] =
    useState(false);

  const [manualQueueLoading, setManualQueueLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [cropMessage, setCropMessage] =
    useState("");

  const [operationMessage, setOperationMessage] =
    useState("");

  const [manualQueueMessage, setManualQueueMessage] =
    useState("");

  const [manualFarmerName, setManualFarmerName] =
    useState("");

  const [manualPhone, setManualPhone] =
    useState("");

  const [manualCropId, setManualCropId] =
    useState("");

  async function loadDashboard() {
    setError("");

    const storedOperator = localStorage.getItem(
      "krishaksamay-operator"
    );

    if (!storedOperator) {
      setError("Operator session not found.");
      setLoading(false);
      return;
    }

    let loggedInOperator: Operator;

    try {
      loggedInOperator = JSON.parse(storedOperator);
    } catch {
      setError("Invalid operator session.");
      setLoading(false);
      return;
    }

    const {
      data: operatorData,
      error: operatorError,
    } = await supabase
      .from("operators")
      .select(
        "employee_id, name, assigned_center_id"
      )
      .eq(
        "employee_id",
        loggedInOperator.employee_id
      )
      .eq("is_active", true)
      .single();

    if (operatorError || !operatorData) {
      setError("Operator account not found.");
      setLoading(false);
      return;
    }

    setOperator(operatorData);

    if (!operatorData.assigned_center_id) {
      setError("No procurement center is assigned.");
      setLoading(false);
      return;
    }

    const {
      data: centerData,
      error: centerError,
    } = await supabase
      .from("procurement_centers")
      .select("id, name")
      .eq(
        "id",
        operatorData.assigned_center_id
      )
      .single();

    if (centerError || !centerData) {
      setError("Assigned center not found.");
      setLoading(false);
      return;
    }

    setCenter(centerData);

    const {
      data: operationData,
      error: operationError,
    } = await supabase
      .from("center_operations")
      .select(`
        is_open,
        active_counters,
        people_waiting,
        people_processed_today,
        operational_message
      `)
      .eq("center_id", centerData.id)
      .single();

    if (operationError) {
      setError(operationError.message);
    } else {
      setOperation(
        operationData as CenterOperation
      );
    }

    const {
      data: cropsData,
      error: cropsError,
    } = await supabase
      .from("crops")
      .select("id, name")
      .order("name", {
        ascending: true,
      });

    if (cropsError) {
      setError(cropsError.message);
    } else {
      setAllCrops(
        (cropsData || []) as Crop[]
      );
    }

    const {
      data: centerCropsData,
      error: centerCropsError,
    } = await supabase
      .from("center_crops")
      .select("crop_id")
      .eq("center_id", centerData.id);

    if (centerCropsError) {
      setError(centerCropsError.message);
    } else {
      const mappings =
        (centerCropsData || []) as CenterCrop[];

      const acceptedCropIds = mappings.map(
        (mapping) => mapping.crop_id
      );

      setSelectedCropIds(
        acceptedCropIds
      );

      if (
        manualCropId &&
        !acceptedCropIds.includes(manualCropId)
      ) {
        setManualCropId("");
      }
    }

    const {
      data: sessionData,
      error: sessionError,
    } = await supabase
      .from("queue_sessions")
      .select("id")
      .eq(
        "center_id",
        centerData.id
      )
      .eq(
        "queue_date",
        new Date().toISOString().slice(0, 10)
      )
      .eq("is_active", true)
      .single();

    if (sessionError || !sessionData) {
      setTokens([]);
      setLoading(false);
      return;
    }

    const {
      data: tokenData,
      error: tokenError,
    } = await supabase
      .from("queue_tokens")
      .select(`
        id,
        token_number,
        status,
        created_at,
        farmer_name,
        crop:crops (
          name
        )
      `)
      .eq(
        "queue_session_id",
        sessionData.id
      )
      .order("token_number", {
        ascending: true,
      });

    if (tokenError) {
  setError(tokenError.message);
} else {
  const normalizedTokens: Token[] = (tokenData || []).map(
    (token) => ({
      ...token,
      crop: token.crop?.[0] ?? null,
    })
  ) as Token[];

  setTokens(normalizedTokens);
}

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function toggleCrop(cropId: string) {
    setCropMessage("");

    setSelectedCropIds((previous) => {
      if (previous.includes(cropId)) {
        return previous.filter(
          (id) => id !== cropId
        );
      }

      return [...previous, cropId];
    });
  }

  async function saveAcceptedCrops() {
    if (!center) return;

    setCropLoading(true);
    setCropMessage("");
    setError("");

    const { error: deleteError } =
      await supabase
        .from("center_crops")
        .delete()
        .eq("center_id", center.id);

    if (deleteError) {
      setError(deleteError.message);
      setCropLoading(false);
      return;
    }

    if (selectedCropIds.length > 0) {
      const rows = selectedCropIds.map(
        (cropId) => ({
          center_id: center.id,
          crop_id: cropId,
        })
      );

      const {
        error: insertError,
      } = await supabase
        .from("center_crops")
        .insert(rows);

      if (insertError) {
        setError(insertError.message);
        setCropLoading(false);
        return;
      }
    }

    setCropMessage(
      "Accepted crops updated successfully."
    );

    setCropLoading(false);

    await loadDashboard();
  }

  async function updateOperation(
    updates: Partial<CenterOperation>
  ) {
    if (!center) return;

    setOperationLoading(true);
    setOperationMessage("");
    setError("");

    const {
      data,
      error: updateError,
    } = await supabase
      .from("center_operations")
      .update(updates)
      .eq("center_id", center.id)
      .select(`
        is_open,
        active_counters,
        people_waiting,
        people_processed_today,
        operational_message
      `)
      .single();

    if (updateError) {
      setError(updateError.message);
      setOperationLoading(false);
      return;
    }

    setOperation(
      data as CenterOperation
    );

    setOperationMessage(
      "Center operations updated."
    );

    setOperationLoading(false);
  }

  async function addManualQueueEntry(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!center) return;

    setManualQueueLoading(true);
    setManualQueueMessage("");
    setError("");

    const trimmedName =
      manualFarmerName.trim();

    const trimmedPhone =
      manualPhone.trim();

    if (!trimmedName) {
      setError("Farmer name is required.");
      setManualQueueLoading(false);
      return;
    }

    if (!manualCropId) {
      setError("Please select a crop.");
      setManualQueueLoading(false);
      return;
    }

    if (
      trimmedPhone &&
      !/^\d{10}$/.test(trimmedPhone)
    ) {
      setError(
        "Phone number must contain exactly 10 digits."
      );
      setManualQueueLoading(false);
      return;
    }

    if (!operation?.is_open) {
      setError(
        "Center is closed. New queue entries are not allowed."
      );
      setManualQueueLoading(false);
      return;
    }

    const {
      data,
      error: addError,
    } = await supabase.rpc(
      "operator_add_queue_token",
      {
        p_center_id: center.id,
        p_farmer_name: trimmedName,
        p_phone: trimmedPhone,
        p_crop_id: manualCropId,
      }
    );

    if (addError) {
      setError(addError.message);
      setManualQueueLoading(false);
      return;
    }

    const newToken =
      data?.[0];

    if (!newToken) {
      setError(
        "Unable to add farmer to queue."
      );
      setManualQueueLoading(false);
      return;
    }

    setManualFarmerName("");
    setManualPhone("");
    setManualCropId("");

    setManualQueueMessage(
      `Farmer added successfully. Token #${newToken.token_number}.`
    );

    await loadDashboard();

    setManualQueueLoading(false);
  }

  async function updateToken(
    tokenId: string,
    status: string
  ) {
    if (
      (status === "CALLED" ||
        status === "SERVING") &&
      !operation?.is_open
    ) {
      setError(
        "Center is closed. New service cannot start."
      );
      return;
    }

    setActionLoading(true);
    setError("");

    const updates: {
      status: string;
      called_at?: string | null;
      completed_at?: string | null;
    } = {
      status,
    };

    if (status === "CALLED") {
      updates.called_at =
        new Date().toISOString();
    }

    if (status === "COMPLETED") {
      updates.completed_at =
        new Date().toISOString();
    }

    const { error } =
      await supabase
        .from("queue_tokens")
        .update(updates)
        .eq("id", tokenId);

    if (error) {
      setError(error.message);
      setActionLoading(false);
      return;
    }

    await loadDashboard();

    setActionLoading(false);
  }

  async function recallToken(
    tokenId: string
  ) {
    if (!operation?.is_open) {
      setError(
        "Center is closed. Rejoin the farmer after reopening the center."
      );
      return;
    }

    setActionLoading(true);
    setError("");

    const {
      data,
      error,
    } = await supabase.rpc(
      "rejoin_skipped_token",
      {
        p_token_id: tokenId,
      }
    );

    if (error) {
      setError(error.message);
      setActionLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setError(
        "Unable to rejoin this token."
      );
      setActionLoading(false);
      return;
    }

    await loadDashboard();

    setActionLoading(false);
  }

  async function callNextToken() {
    if (!operation?.is_open) {
      setError(
        "Center is closed. New service cannot start."
      );
      return;
    }

    const nextToken =
      tokens.find(
        (token) =>
          token.status === "WAITING"
      );

    if (!nextToken) {
      setError("No waiting tokens.");
      return;
    }

    await updateToken(
      nextToken.id,
      "CALLED"
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8f3] p-6">
        <div className="mx-auto max-w-7xl">
          <section className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-stone-500">
              Loading operator dashboard...
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (error && !operator) {
    return (
      <main className="min-h-screen bg-[#f6f8f3] p-6">
        <div className="mx-auto max-w-7xl">
          <section className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-red-600">
              {error}
            </p>
          </section>
        </div>
      </main>
    );
  }

  const waitingTokens =
    tokens.filter(
      (token) =>
        token.status === "WAITING"
    );

  const calledTokens =
    tokens.filter(
      (token) =>
        token.status === "CALLED" ||
        token.status === "SERVING"
    );

  const completedTokens =
    tokens.filter(
      (token) =>
        token.status === "COMPLETED"
    );

  const skippedTokens =
    tokens.filter(
      (token) =>
        token.status === "SKIPPED"
    );

  const acceptedCrops =
    allCrops.filter(
      (crop) =>
        selectedCropIds.includes(
          crop.id
        )
    );

  return (
    <main className="min-h-screen bg-[#f6f8f3] text-stone-900">

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-green-700">
              KrishakSamay
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Operator Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-6">

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">
                {operator?.name}
              </p>

              <p className="text-xs text-stone-500">
                Employee ID:{" "}
                {operator?.employee_id}
              </p>
            </div>

            <Link
              href="/operator"
              className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
            >
              Home
            </Link>

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

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Assigned procurement center
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                {center?.name}
              </h2>

              <p className="mt-2 text-sm text-stone-500">
                Manage today's procurement operations and farmer queue.
              </p>
            </div>

            <div className="flex items-center gap-4">

              <div
                className={`rounded-xl px-5 py-4 ${
                  operation?.is_open
                    ? "bg-green-50"
                    : "bg-stone-100"
                }`}
              >
                <p className="text-xs text-stone-500">
                  Center status
                </p>

                <p
                  className={`mt-1 text-xl font-bold ${
                    operation?.is_open
                      ? "text-green-700"
                      : "text-stone-600"
                  }`}
                >
                  {operation?.is_open
                    ? "OPEN"
                    : "CLOSED"}
                </p>
              </div>

              <div className="rounded-xl bg-green-50 px-5 py-4">
                <p className="text-xs text-green-700">
                  Today's queue
                </p>

                <p className="mt-1 text-2xl font-bold text-green-900">
                  {tokens.length} tokens
                </p>
              </div>

            </div>

          </div>

        </section>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">

          <div className="space-y-6">

            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">

              <div>
                <h2 className="font-bold">
                  Center operations
                </h2>

                <p className="mt-1 text-xs leading-5 text-stone-500">
                  Update the information farmers see about this center.
                </p>
              </div>

              <div className="mt-5 rounded-xl border border-stone-200 p-4">

                <div className="flex items-center justify-between">

                  <div>
                    <p className="text-sm font-semibold">
                      Center status
                    </p>

                    <p className="mt-1 text-xs text-stone-500">
                      {operation?.is_open
                        ? "Farmers can currently visit this center."
                        : "Center is currently closed."}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      updateOperation({
                        is_open:
                          !operation?.is_open,
                      })
                    }
                    disabled={operationLoading}
                    className={`relative h-7 w-12 rounded-full transition ${
                      operation?.is_open
                        ? "bg-green-600"
                        : "bg-stone-300"
                    }`}
                    aria-label="Toggle center status"
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                        operation?.is_open
                          ? "left-6"
                          : "left-1"
                      }`}
                    />
                  </button>

                </div>

              </div>

              <div className="mt-3">

                <label className="text-xs font-semibold text-stone-600">
                  Active counters
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    operation?.active_counters ?? 0
                  }
                  onChange={(event) =>
                    setOperation(
                      (previous) =>
                        previous
                          ? {
                              ...previous,
                              active_counters:
                                Number(
                                  event.target.value
                                ),
                            }
                          : previous
                    )
                  }
                  onBlur={() =>
                    updateOperation({
                      active_counters:
                        operation?.active_counters ??
                        0,
                    })
                  }
                  disabled={operationLoading}
                  className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />

              </div>

              <div className="mt-3">

                <label className="text-xs font-semibold text-stone-600">
                  People waiting
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    operation?.people_waiting ?? 0
                  }
                  onChange={(event) =>
                    setOperation(
                      (previous) =>
                        previous
                          ? {
                              ...previous,
                              people_waiting:
                                Number(
                                  event.target.value
                                ),
                            }
                          : previous
                    )
                  }
                  onBlur={() =>
                    updateOperation({
                      people_waiting:
                        operation?.people_waiting ??
                        0,
                    })
                  }
                  disabled={operationLoading}
                  className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />

              </div>

              <div className="mt-3">

                <label className="text-xs font-semibold text-stone-600">
                  People processed today
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    operation?.people_processed_today ??
                    0
                  }
                  onChange={(event) =>
                    setOperation(
                      (previous) =>
                        previous
                          ? {
                              ...previous,
                              people_processed_today:
                                Number(
                                  event.target.value
                                ),
                            }
                          : previous
                    )
                  }
                  onBlur={() =>
                    updateOperation({
                      people_processed_today:
                        operation?.people_processed_today ??
                        0,
                    })
                  }
                  disabled={operationLoading}
                  className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />

              </div>

              <div className="mt-3">

                <label className="text-xs font-semibold text-stone-600">
                  Operational message
                </label>

                <textarea
                  value={
                    operation?.operational_message ??
                    ""
                  }
                  onChange={(event) =>
                    setOperation(
                      (previous) =>
                        previous
                          ? {
                              ...previous,
                              operational_message:
                                event.target.value,
                            }
                          : previous
                    )
                  }
                  onBlur={() =>
                    updateOperation({
                      operational_message:
                        operation?.operational_message ??
                        "",
                    })
                  }
                  disabled={operationLoading}
                  rows={3}
                  placeholder="Example: Paddy procurement running normally"
                  className="mt-2 w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />

              </div>

              {operationMessage && (
                <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-xs text-green-700">
                  {operationMessage}
                </p>
              )}

            </section>

            <section className="rounded-2xl border border-green-200 bg-green-50 p-5">

              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Walk-in farmer
              </p>

              <h2 className="mt-1 text-lg font-bold text-green-950">
                Add farmer to queue
              </h2>

              <p className="mt-1 text-sm text-green-800">
                Add a farmer who arrived at the center without using the app.
              </p>

              {!operation?.is_open && (
                <div className="mt-4 rounded-xl bg-stone-100 px-4 py-3 text-sm font-medium text-stone-600">
                  Center is closed. New queue entries are disabled.
                </div>
              )}

              <form
                onSubmit={addManualQueueEntry}
                className="mt-5 space-y-3"
              >

                <input
                  type="text"
                  value={manualFarmerName}
                  onChange={(event) =>
                    setManualFarmerName(
                      event.target.value
                    )
                  }
                  placeholder="Farmer name"
                  disabled={
                    manualQueueLoading ||
                    !operation?.is_open
                  }
                  className="w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-600"
                />

                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={manualPhone}
                  onChange={(event) =>
                    setManualPhone(
                      event.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  placeholder="Phone number (optional)"
                  disabled={
                    manualQueueLoading ||
                    !operation?.is_open
                  }
                  className="w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-600"
                />

                <select
                  value={manualCropId}
                  onChange={(event) =>
                    setManualCropId(
                      event.target.value
                    )
                  }
                  disabled={
                    manualQueueLoading ||
                    !operation?.is_open
                  }
                  className="w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-600"
                >
                  <option value="">
                    Select crop
                  </option>

                  {acceptedCrops.map(
                    (crop) => (
                      <option
                        key={crop.id}
                        value={crop.id}
                      >
                        {crop.name}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="submit"
                  disabled={
                    manualQueueLoading ||
                    !operation?.is_open ||
                    acceptedCrops.length === 0
                  }
                  className="w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {manualQueueLoading
                    ? "Adding..."
                    : "Add to queue"}
                </button>

              </form>

              {acceptedCrops.length === 0 && (
                <p className="mt-3 text-xs text-green-800">
                  No crops are currently accepted at this center.
                </p>
              )}

              {manualQueueMessage && (
                <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-green-700">
                  {manualQueueMessage}
                </p>
              )}

            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">

              <div className="flex items-center justify-between">

                <h2 className="font-bold">
                  Queue overview
                </h2>

                <button
                  onClick={loadDashboard}
                  className="text-xs font-semibold text-green-700 hover:text-green-800"
                >
                  Refresh
                </button>

              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">

                <div className="rounded-xl bg-stone-50 p-4">
                  <p className="text-2xl font-bold">
                    {waitingTokens.length}
                  </p>

                  <p className="mt-1 text-xs text-stone-500">
                    Waiting
                  </p>
                </div>

                <div className="rounded-xl bg-orange-50 p-4">
                  <p className="text-2xl font-bold text-orange-600">
                    {calledTokens.length}
                  </p>

                  <p className="mt-1 text-xs text-stone-500">
                    Active
                  </p>
                </div>

                <div className="rounded-xl bg-orange-50 p-4">
                  <p className="text-2xl font-bold text-orange-500">
                    {skippedTokens.length}
                  </p>

                  <p className="mt-1 text-xs text-stone-500">
                    Skipped
                  </p>
                </div>

                <div className="rounded-xl bg-green-50 p-4">
                  <p className="text-2xl font-bold text-green-700">
                    {completedTokens.length}
                  </p>

                  <p className="mt-1 text-xs text-stone-500">
                    Completed
                  </p>
                </div>

              </div>

            </section>

            <section className="rounded-2xl border border-green-200 bg-green-50 p-5">

              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Queue control
              </p>

              <h2 className="mt-1 text-lg font-bold text-green-950">
                Call the next farmer
              </h2>

              <p className="mt-1 text-sm text-green-800">
                The next waiting token will be called.
              </p>

              {!operation?.is_open && (
                <p className="mt-3 rounded-xl bg-stone-100 px-4 py-3 text-sm font-medium text-stone-600">
                  Center is closed. New service cannot start.
                </p>
              )}

              <button
                onClick={callNextToken}
                disabled={
                  actionLoading ||
                  waitingTokens.length === 0 ||
                  !operation?.is_open
                }
                className="mt-5 w-full rounded-xl bg-green-700 px-5 py-4 text-base font-bold text-white shadow-sm hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Updating..."
                  : "📢 Call Next Token"}
              </button>

            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">

              <div>
                <h2 className="font-bold">
                  Accepted crops
                </h2>

                <p className="mt-1 text-xs leading-5 text-stone-500">
                  Select the crops currently accepted at this center.
                </p>
              </div>

              <div className="mt-5 space-y-2">

                {allCrops.length === 0 && (
                  <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">
                    No crops available.
                  </p>
                )}

                {allCrops.map((crop) => {
                  const selected =
                    selectedCropIds.includes(
                      crop.id
                    );

                  return (
                    <label
                      key={crop.id}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${
                        selected
                          ? "border-green-300 bg-green-50"
                          : "border-stone-200 bg-white hover:bg-stone-50"
                      }`}
                    >

                      <span className="text-sm font-medium">
                        {crop.name}
                      </span>

                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleCrop(crop.id)
                        }
                        className="h-5 w-5 accent-green-700"
                      />

                    </label>
                  );
                })}

              </div>

              {cropMessage && (
                <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                  {cropMessage}
                </p>
              )}

              <button
                onClick={saveAcceptedCrops}
                disabled={
                  cropLoading ||
                  allCrops.length === 0
                }
                className="mt-4 w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cropLoading
                  ? "Saving..."
                  : "Save accepted crops"}
              </button>

            </section>

          </div>

          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">

            <div className="flex flex-col justify-between gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-center">

              <div>
                <h2 className="text-xl font-bold">
                  Today's queue
                </h2>

                <p className="mt-1 text-sm text-stone-500">
                  Manage farmers currently in the procurement queue.
                </p>
              </div>

              <button
                onClick={loadDashboard}
                className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Refresh queue
              </button>

            </div>

            <div className="mt-5 overflow-x-auto">

              {tokens.length === 0 ? (
                <div className="rounded-xl bg-stone-50 px-6 py-12 text-center">
                  <p className="text-sm text-stone-500">
                    No tokens today.
                  </p>
                </div>
              ) : (

                <div className="min-w-[650px]">

                  <div className="grid grid-cols-[90px_1fr_150px_260px] items-center gap-4 rounded-xl bg-stone-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">

                    <span>Token</span>
                    <span>Farmer / Crop</span>
                    <span>Status</span>
                    <span>Action</span>

                  </div>

                  <div className="mt-2 space-y-2">

                    {tokens.map((token) => {

                      const statusStyle =
                        token.status === "WAITING"
                          ? "bg-stone-100 text-stone-700"
                          : token.status === "CALLED"
                          ? "bg-yellow-100 text-yellow-800"
                          : token.status === "SERVING"
                          ? "bg-blue-100 text-blue-800"
                          : token.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : token.status === "SKIPPED"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-red-100 text-red-700";

                      return (
                        <div
                          key={token.id}
                          className="grid grid-cols-[90px_1fr_150px_260px] items-center gap-4 rounded-xl border border-stone-200 px-5 py-4 transition hover:bg-stone-50"
                        >

                          <div>
                            <p className="text-lg font-bold">
                              #{token.token_number}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-medium">
                              {token.farmer_name ||
                                "App farmer"}
                            </p>

                            <p className="mt-1 text-xs text-stone-500">
                              {token.crop?.name ||
                                "Crop unavailable"}
                            </p>

                            <p className="mt-1 text-xs text-stone-400">
                              Token issued today
                            </p>
                          </div>

                          <div>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}
                            >
                              {token.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">

                            {token.status ===
                              "WAITING" && (
                              <button
                                onClick={() =>
                                  updateToken(
                                    token.id,
                                    "CALLED"
                                  )
                                }
                                disabled={
                                  actionLoading ||
                                  !operation?.is_open
                                }
                                className="rounded-lg bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                              >
                                Call
                              </button>
                            )}

                            {token.status ===
                              "CALLED" && (
                              <>
                                <button
                                  onClick={() =>
                                    updateToken(
                                      token.id,
                                      "SERVING"
                                    )
                                  }
                                  disabled={
                                    actionLoading ||
                                    !operation?.is_open
                                  }
                                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  Start Serving
                                </button>

                                <button
                                  onClick={() =>
                                    updateToken(
                                      token.id,
                                      "SKIPPED"
                                    )
                                  }
                                  disabled={
                                    actionLoading
                                  }
                                  className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                                >
                                  Not Present
                                </button>
                              </>
                            )}

                            {token.status ===
                              "SERVING" && (
                              <button
                                onClick={() =>
                                  updateToken(
                                    token.id,
                                    "COMPLETED"
                                  )
                                }
                                disabled={
                                  actionLoading
                                }
                                className="rounded-lg bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                              >
                                Complete
                              </button>
                            )}

                            {token.status ===
                              "SKIPPED" && (
                              <button
                                onClick={() =>
                                  recallToken(
                                    token.id
                                  )
                                }
                                disabled={
                                  actionLoading ||
                                  !operation?.is_open
                                }
                                className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                              >
                                Recall / Rejoin
                              </button>
                            )}

                          </div>

                        </div>
                      );
                    })}

                  </div>

                </div>

              )}

            </div>

          </section>

        </div>

      </div>

    </main>
  );
}
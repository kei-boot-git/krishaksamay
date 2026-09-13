"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calculateEstimatedWaitTime } from "@/lib/prediction";

type CenterOperation = {
  is_open: boolean;
  active_counters: number;
  people_waiting: number;
  people_processed_today: number;
  average_service_time_minutes: number;
  operational_message: string | null;
};

type CenterCrop = {
  crops: {
    id?: string;
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

type TokenResult = {
  token_id: string;
  token_number: number;
  people_ahead: number;
  status?: string;
};

type QueueToken = {
  id: string;
  token_number: number;
  status: string;
};

function getTravelTime(
  mandal: string,
  centerMandal: string
) {
  if (!mandal || !centerMandal) return 30;

  if (
    mandal.toLowerCase().trim() ===
    centerMandal.toLowerCase().trim()
  ) {
    return 15;
  }

  return 30;
}

function getTrafficFactor() {
  const hour = new Date().getHours();

  if (hour >= 8 && hour <= 10) return 1.35;
  if (hour >= 17 && hour <= 19) return 1.4;
  if (hour >= 11 && hour <= 16) return 1.15;

  return 1.05;
}

function formatTime(minutesFromNow: number) {
  return new Date(
    Date.now() + minutesFromNow * 60 * 1000
  ).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CenterDetailsPage() {
  const params = useParams();
  const centerId = params.id as string;

  const supabase = createClient();

  const [center, setCenter] = useState<Center | null>(null);
  const [selectedCrop, setSelectedCrop] = useState("");
  const [token, setToken] = useState<TokenResult | null>(null);

  const [farmerMandal, setFarmerMandal] = useState("");
  const [loading, setLoading] = useState(true);
  const [gettingToken, setGettingToken] = useState(false);
  const [error, setError] = useState("");

  /*
   * Load the farmer's saved token after refresh.
   */
  useEffect(() => {
    const farmerData = localStorage.getItem(
      "krishaksamay-farmer"
    );

    if (!farmerData) return;

    try {
      const farmer = JSON.parse(farmerData);

      if (!farmer?.id) return;

      const tokenStorageKey =
        `farmer_token_${farmer.id}_${centerId}`;

      const savedToken =
        localStorage.getItem(tokenStorageKey);

      if (savedToken) {
        try {
          setToken(JSON.parse(savedToken));
        } catch {
          localStorage.removeItem(tokenStorageKey);
        }
      }
    } catch {
      return;
    }
  }, [centerId]);

  /*
   * Load center information.
   */
  useEffect(() => {
    async function loadCenter() {
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
            average_service_time_minutes,
            operational_message
          ),
          center_crops (
            crops (
              id,
              name
            )
          )
        `)
        .eq("id", centerId)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        setError("Center not found.");
        setLoading(false);
        return;
      }

      const normalizedCenter: Center = {
        ...data,
        center_operations:
          data.center_operations ?? null,
        center_crops:
          data.center_crops?.map((item) => ({
            ...item,
            crops: item.crops ?? null,
          })) ?? [],
      };

      setCenter(normalizedCenter);

      const firstCrop =
        normalizedCenter.center_crops?.[0]?.crops;

      if (firstCrop?.name) {
        setSelectedCrop(firstCrop.name);
      }

      const savedMandal =
        localStorage.getItem("farmer_mandal");

      if (savedMandal) {
        setFarmerMandal(savedMandal);
      }

      setLoading(false);
    }

    if (centerId) {
      loadCenter();
    }
  }, [centerId]);

  /*
   * Keep the farmer's token status and queue position live.
   */
  useEffect(() => {
    if (!center || !token) return;

    const currentCenterId = center.id;
    const currentTokenId = token.token_id;

    async function refreshQueuePosition() {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase
        .from("queue_sessions")
        .select("id")
        .eq("center_id", currentCenterId)
        .eq(
          "queue_date",
          new Date()
            .toISOString()
            .slice(0, 10)
        )
        .eq("is_active", true)
        .single();

      if (sessionError || !sessionData) return;

      const { data, error } = await supabase
        .from("queue_tokens")
        .select(
          "id, token_number, status"
        )
        .eq(
          "queue_session_id",
          sessionData.id
        )
        .order("token_number", {
          ascending: true,
        });

      if (error || !data) return;

      const queue = data as QueueToken[];

      const currentToken = queue.find(
        (item) => item.id === currentTokenId
      );

      if (!currentToken) return;

      /*
       * Tokens still ahead of the farmer.
       */
      const peopleAhead = queue.filter(
        (item) =>
          item.token_number <
            currentToken.token_number &&
          (
            item.status === "WAITING" ||
            item.status === "CALLED" ||
            item.status === "SERVING"
          )
      ).length;

      setToken((previous) => {
        if (!previous) return previous;

        const updated = {
          ...previous,
          people_ahead: peopleAhead,
          token_number: currentToken.token_number,
          status: currentToken.status,
        };

        const farmerData =
          localStorage.getItem(
            "krishaksamay-farmer"
          );

        if (farmerData) {
          try {
            const farmer = JSON.parse(
              farmerData
            );

            if (farmer?.id) {
              localStorage.setItem(
                `farmer_token_${farmer.id}_${centerId}`,
                JSON.stringify(updated)
              );
            }
          } catch {
            // Ignore invalid farmer data.
          }
        }

        return updated;
      });
    }

    refreshQueuePosition();

    /*
     * MVP live refresh every 10 seconds.
     */
    const interval = setInterval(
      refreshQueuePosition,
      10000
    );

    return () => clearInterval(interval);
  }, [center, token?.token_id, centerId]);

  async function handleGetToken() {
    setError("");

    if (!selectedCrop) {
      setError("Please select a crop.");
      return;
    }

    if (!center?.center_operations?.is_open) {
      setError("This center is currently closed.");
      return;
    }

    const crop = center.center_crops.find(
      (item) =>
        item.crops?.name === selectedCrop
    );

    if (!crop?.crops?.id) {
      setError("Crop information is unavailable.");
      return;
    }

    const farmerData = localStorage.getItem(
      "krishaksamay-farmer"
    );

    if (!farmerData) {
      setError("Farmer information is unavailable. Please log in again.");
      return;
    }

    let farmer;

    try {
      farmer = JSON.parse(farmerData);
    } catch {
      setError("Farmer information is invalid. Please log in again.");
      return;
    }

    if (!farmer?.id) {
      setError("Farmer information is unavailable. Please log in again.");
      return;
    }

    setGettingToken(true);

    const { data, error } =
      await supabase.rpc(
        "get_farmer_token",
        {
          p_farmer_id: farmer.id,
          p_center_id: center.id,
          p_crop_id: crop.crops.id,
        }
      );

    if (
      error ||
      !data ||
      data.length === 0
    ) {
      setError(
        error?.message ||
          "Unable to generate your token."
      );
      setGettingToken(false);
      return;
    }

    const newToken =
      data[0] as TokenResult;

    newToken.status = "WAITING";

    setToken(newToken);

    localStorage.setItem(
      `farmer_token_${farmer.id}_${centerId}`,
      JSON.stringify(newToken)
    );

    setGettingToken(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f8f3] px-4 py-6 text-stone-900">
        <div className="mx-auto w-full max-w-md">
          <section className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-stone-500">
              Loading center details...
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (error && !center) {
    return (
      <main className="min-h-screen bg-[#f6f8f3] px-4 py-6 text-stone-900">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/farmer/dashboard"
            className="text-sm font-semibold text-green-700"
          >
            ← Back to centers
          </Link>

          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
            <div className="text-3xl">
              📍
            </div>

            <h1 className="mt-3 text-lg font-bold">
              Center not found
            </h1>

            <p className="mt-1 text-sm text-stone-500">
              We couldn't find this procurement center.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (!center) return null;

  const operation =
    center.center_operations;

  const open =
    operation?.is_open ?? false;

  const counters =
    operation?.active_counters ?? 0;

  const waiting =
    operation?.people_waiting ?? 0;

  const averageServiceTime =
    operation?.average_service_time_minutes ??
    6;

  /*
   * Live queue position.
   */
  const peopleAhead = token
    ? token.people_ahead
    : waiting;

  /*
   * MVP prediction:
   *
   * people ahead × average service time
   * divided by active counters.
   */
  const waitTime =
    calculateEstimatedWaitTime({
      peopleAhead,
      activeCounters: counters,
      averageServiceTime,
    });

  const estimatedTurnTime =
    waitTime !== null
      ? formatTime(waitTime)
      : null;

  /*
   * Token status.
   */
  const tokenStatus =
    token?.status ?? "WAITING";

  const statusInfo =
    {
      WAITING: {
        label: "Waiting",
        message:
          "You are in the queue. We'll keep updating your position.",
        className:
          "bg-yellow-100 text-yellow-800",
      },

      CALLED: {
        label: "Called",
        message:
          "Your token has been called. Please proceed to the counter.",
        className:
          "bg-blue-100 text-blue-800",
      },

      SERVING: {
        label: "Serving",
        message:
          "You are currently being served.",
        className:
          "bg-purple-100 text-purple-800",
      },

      SKIPPED: {
        label: "Not present",
        message:
          "Your token was skipped because you were not present when called.",
        className:
          "bg-orange-100 text-orange-800",
      },

      COMPLETED: {
        label: "Completed",
        message:
          "Your procurement process has been completed.",
        className:
          "bg-green-100 text-green-800",
      },

      CANCELLED: {
        label: "Cancelled",
        message:
          "This token has been cancelled.",
        className:
          "bg-red-100 text-red-800",
      },
    }[tokenStatus] ?? {
      label: "Waiting",
      message:
        "You are in the queue.",
      className:
        "bg-yellow-100 text-yellow-800",
    };

  /*
   * Travel + traffic.
   */
  const baseTravelTime =
    getTravelTime(
      farmerMandal,
      center.mandal
    );

  const trafficFactor =
    getTrafficFactor();

  const trafficAdjustedTravelTime =
    Math.ceil(
      baseTravelTime *
        trafficFactor
    );

  const departureBuffer = 5;

  const recommendedDeparture =
    waitTime !== null &&
    tokenStatus === "WAITING"
      ? formatTime(
          Math.max(
            waitTime -
              trafficAdjustedTravelTime -
              departureBuffer,
            0
          )
        )
      : null;

  return (
    <main className="min-h-screen bg-[#f6f8f3] px-4 py-6 text-stone-900">
      <div className="mx-auto w-full max-w-md">

        <Link
          href="/farmer/dashboard"
          className="text-sm font-semibold text-green-700"
        >
          ← Back to centers
        </Link>

        {/* Header */}
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">

            <div>
              <h1 className="text-2xl font-bold">
                {center.name}
              </h1>

              <p className="mt-2 text-sm text-stone-500">
                {center.address}
              </p>

              <p className="text-sm text-stone-500">
                {center.mandal},{" "}
                {center.district}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                open
                  ? "bg-green-100 text-green-700"
                  : "bg-stone-100 text-stone-500"
              }`}
            >
              {open ? "Open" : "Closed"}
            </span>

          </div>
        </section>

        {/* Get token */}
        {open && !token && (
          <section className="mt-4 rounded-2xl border border-green-200 bg-white p-5 shadow-sm">

            <h2 className="text-lg font-bold">
              Get your token
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Join the queue remotely before travelling.
            </p>

            <label className="mt-4 block text-sm font-medium">
              Your mandal
            </label>

            <input
              value={farmerMandal}
              onChange={(e) => {
                setFarmerMandal(
                  e.target.value
                );

                localStorage.setItem(
                  "farmer_mandal",
                  e.target.value
                );
              }}
              placeholder="Example: Rajahmundry"
              className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-green-600"
            />

            <label className="mt-4 block text-sm font-medium">
              Select crop
            </label>

            <select
              value={selectedCrop}
              onChange={(e) =>
                setSelectedCrop(
                  e.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm"
            >
              {center.center_crops.map(
                (item) =>
                  item.crops ? (
                    <option
                      key={item.crops.id}
                      value={
                        item.crops.name
                      }
                    >
                      {item.crops.name}
                    </option>
                  ) : null
              )}
            </select>

            {error && (
              <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={handleGetToken}
              disabled={gettingToken}
              className="mt-4 w-full rounded-xl bg-green-700 px-4 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-60"
            >
              {gettingToken
                ? "Getting token..."
                : "Get Token"}
            </button>

          </section>
        )}

        {/* Token result */}
        {token && (
          <section className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-5">

            <div className="text-center">

              <p className="text-sm font-semibold text-green-700">
                Your token
              </p>

              <p className="mt-1 text-6xl font-bold text-green-800">
                #{token.token_number}
              </p>

              <p className="mt-2 text-sm text-green-700">
                Keep this token number.
              </p>

            </div>

            {/* Token status */}
            <div className="mt-4">
              <div
                className={`rounded-xl px-4 py-3 text-center ${statusInfo.className}`}
              >
                <p className="text-sm font-bold">
                  {statusInfo.label}
                </p>

                <p className="mt-1 text-xs">
                  {statusInfo.message}
                </p>
              </div>
            </div>

            {/* Live indicator */}
            {(
              tokenStatus === "WAITING" ||
              tokenStatus === "CALLED" ||
              tokenStatus === "SERVING"
            ) && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-600" />
                Queue updates automatically
              </div>
            )}

            {/* Queue */}
            {(
              tokenStatus === "WAITING" ||
              tokenStatus === "CALLED"
            ) && (
              <div className="mt-4 grid grid-cols-2 gap-3">

                <div className="rounded-xl bg-white p-4 text-center">

                  <p className="text-2xl font-bold">
                    {token.people_ahead}
                  </p>

                  <p className="mt-1 text-xs text-stone-500">
                    People ahead
                  </p>

                </div>

                <div className="rounded-xl bg-white p-4 text-center">

                  <p className="text-2xl font-bold text-green-700">
                    {waitTime !== null
                      ? `~${waitTime}m`
                      : "—"}
                  </p>

                  <p className="mt-1 text-xs text-stone-500">
                    Estimated wait
                  </p>

                </div>

              </div>
            )}

            {/* Serving message */}
            {tokenStatus === "SERVING" && (
              <div className="mt-4 rounded-xl bg-white p-5 text-center">
                <p className="text-3xl">
                  👨‍🌾
                </p>

                <p className="mt-2 font-bold text-stone-900">
                  Your turn is being served
                </p>

                <p className="mt-1 text-sm text-stone-500">
                  Please remain at the procurement center.
                </p>
              </div>
            )}

            {/* Skipped message */}
            {tokenStatus === "SKIPPED" && (
              <div className="mt-4 rounded-xl bg-white p-5 text-center">
                <p className="text-3xl">
                  ⏭️
                </p>

                <p className="mt-2 font-bold text-orange-800">
                  You were marked not present
                </p>

                <p className="mt-1 text-sm text-stone-500">
                  Your token was skipped because you were not present when called.
                </p>

                <p className="mt-3 text-xs text-stone-500">
                  Please contact the operator to rejoin the queue.
                </p>
              </div>
            )}

            {/* Completed message */}
            {tokenStatus === "COMPLETED" && (
              <div className="mt-4 rounded-xl bg-white p-5 text-center">
                <p className="text-3xl">
                  ✅
                </p>

                <p className="mt-2 font-bold text-green-800">
                  Procurement completed
                </p>

                <p className="mt-1 text-sm text-stone-500">
                  Your token has been completed.
                </p>
              </div>
            )}

            {/* Cancelled message */}
            {tokenStatus === "CANCELLED" && (
              <div className="mt-4 rounded-xl bg-white p-5 text-center">
                <p className="text-3xl">
                  ❌
                </p>

                <p className="mt-2 font-bold text-red-700">
                  Token cancelled
                </p>

                <p className="mt-1 text-sm text-stone-500">
                  This token is no longer active.
                </p>
              </div>
            )}

            {/* Turn */}
            {estimatedTurnTime &&
              tokenStatus === "WAITING" && (
                <div className="mt-4 rounded-xl bg-white p-4">

                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                    Estimated turn
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {estimatedTurnTime}
                  </p>

                  <p className="mt-2 text-xs text-stone-500">
                    Based on the live queue,
                    active counters, and average
                    service time.
                  </p>

                </div>
              )}

            {/* Departure */}
            {recommendedDeparture && (
              <div className="mt-4 rounded-xl border border-green-300 bg-green-100 p-4">

                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  Recommended departure
                </p>

                <p className="mt-1 text-3xl font-bold text-green-900">
                  Leave by{" "}
                  {recommendedDeparture}
                </p>

                <div className="mt-3 space-y-1 text-sm text-green-800">

                  <p>
                    🚗 Travel: ~
                    {trafficAdjustedTravelTime} min
                  </p>

                  <p>
                    🚦 Traffic-adjusted estimate
                  </p>

                  <p>
                    🎫 Expected turn:{" "}
                    {estimatedTurnTime}
                  </p>

                </div>

                <p className="mt-3 text-xs leading-5 text-green-700">
                  This estimate updates as the
                  queue moves.
                </p>

              </div>
            )}

          </section>
        )}

        {/* Closed */}
        {!open && (
          <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">

            <h2 className="font-semibold">
              Center is closed
            </h2>

            <p className="mt-1 text-sm text-stone-500">
              Tokens cannot currently be issued.
            </p>

          </section>
        )}

        {/* Accepted crops */}
        <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">

          <h2 className="font-semibold">
            Accepted crops
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">

            {center.center_crops.map(
              (item) =>
                item.crops ? (
                  <span
                    key={item.crops.id}
                    className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800"
                  >
                    {item.crops.name}
                  </span>
                ) : null
            )}

          </div>

        </section>

        {/* Operational message */}
        {operation?.operational_message && (
          <section className="mt-4 rounded-2xl bg-green-50 p-5">

            <p className="text-sm font-medium text-green-800">
              {operation.operational_message}
            </p>

          </section>
        )}

        {/* Status */}
        <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">

          <h2 className="font-semibold">
            Current status
          </h2>

          {open ? (
            <div className="mt-4 grid grid-cols-3 gap-2">

              <div className="rounded-xl bg-stone-50 p-3 text-center">
                <p className="text-xl font-bold">
                  {counters}
                </p>

                <p className="mt-1 text-[11px] text-stone-500">
                  Counters
                </p>
              </div>

              <div className="rounded-xl bg-stone-50 p-3 text-center">
                <p className="text-xl font-bold">
                  {waiting}
                </p>

                <p className="mt-1 text-[11px] text-stone-500">
                  Waiting
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-3 text-center">
                <p className="text-xl font-bold text-green-700">
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
            <p className="mt-3 text-sm text-stone-500">
              This center is currently closed.
            </p>
          )}

          <p className="mt-4 text-sm text-stone-500">
            {operation?.people_processed_today ??
              0}{" "}
            people processed today.
          </p>

        </section>

        <Link
          href="/farmer/profile"
          className="mt-4 flex w-full justify-center rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-semibold text-green-700"
        >
          View my profile
        </Link>

        <nav className="mt-8 flex justify-center gap-6 pb-6 text-sm">

          <Link
            href="/farmer/dashboard"
            className="text-stone-500"
          >
            Home
          </Link>

          <Link
            href="/farmer/profile"
            className="font-semibold text-green-700"
          >
            Profile
          </Link>

        </nav>

      </div>
    </main>
  );
}
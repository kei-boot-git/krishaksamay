export function calculateEstimatedWaitTime({
  peopleAhead,
  activeCounters,
  averageServiceTime,
}: {
  peopleAhead: number;
  activeCounters: number;
  averageServiceTime: number;
}) {
  if (peopleAhead <= 0) {
    return 0;
  }

  if (activeCounters <= 0) {
    return null;
  }

  if (averageServiceTime <= 0) {
    return null;
  }

  return Math.ceil(
    (peopleAhead * averageServiceTime) /
      activeCounters
  );
}
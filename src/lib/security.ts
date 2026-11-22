export function canonicalPayload(payload: unknown) {
  return JSON.stringify(payload);
}

export function verifyTimestamp(timestamp: string, nowMs = Date.now(), toleranceMs = 5 * 60 * 1000) {
  const parsed = Number(timestamp);
  return Number.isFinite(parsed) && Math.abs(nowMs - parsed) <= toleranceMs;
}

export function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
) {
  return startA <= endB && endA >= startB;
}

export function validateDateRange(startDate: string, endDate: string, today = new Date()) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(startDate) || !datePattern.test(endDate)) {
    throw new Error("Dates must use YYYY-MM-DD");
  }
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error("Invalid date");
  if (end <= start) throw new Error("End date must be after start date");
  const todayDate = today.toISOString().slice(0, 10);
  if (startDate < todayDate) throw new Error("Start date cannot be in the past");
  return true;
}

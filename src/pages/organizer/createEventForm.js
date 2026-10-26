/*
 * FE 32 — Create Event helpers.
 *
 * EventCreateRequest is named in the issue plan but no JSON schema is published
 * in this repo or in the plan. Write keys below are only those the plan or this
 * frontend already uses. Confirm the final DTO with the BE 04 owner before
 * treating this as a verified backend contract.
 *
 * Plan (explicit): venueId; validate name, description, category, future date
 * and time, venue, maximum attendance. Organizer and status are NOT sent —
 * the backend derives them from the JWT / workflow.
 *
 * This repo's event objects (FE 30/31 read aliases):
 *   name | title, description, category,
 *   startsAt | startDateTime | eventDate | date,
 *   capacity | maxAttendance | maximumAttendance
 *
 * Chosen write keys (one per concept, no nested venue/organizer entities):
 *   name          — plan says "Validate name"
 *   description   — plan + repo
 *   category      — plan + repo
 *   startsAt      — first read alias in FE 30/31; ISO-8601 local date-time
 *   venueId       — plan (explicit)
 *   capacity      — first read alias in FE 31
 *
 * Unverified: whether BE 04 actually expects `name` vs `title`, `startsAt` vs
 * `startDateTime`, or `capacity` vs `maxAttendance` / `maximumAttendance`.
 */

export const EVENT_CATEGORIES = ["Tech", "Sports", "Social", "Academic"];

export const EMPTY_CREATE_EVENT_FORM = {
  name: "",
  description: "",
  category: "",
  date: "",
  time: "",
  venueId: "",
  capacity: "",
};

export function extractVenueList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

export function normalizeVenue(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = raw.id ?? raw.venueId;
  if (id == null || id === "") return null;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Unnamed venue";
  return { id, name };
}

export function toLocalIsoDateTime(date, time) {
  if (!date || !time) return "";
  return `${date}T${time.length === 5 ? `${time}:00` : time}`;
}

export function validateCreateEventForm(form, now = new Date()) {
  const errors = {};
  const name = form.name?.trim() ?? "";
  const description = form.description?.trim() ?? "";
  const category = form.category?.trim() ?? "";
  const date = form.date?.trim() ?? "";
  const time = form.time?.trim() ?? "";
  const venueId = form.venueId === 0 || form.venueId ? String(form.venueId) : "";
  const capacityRaw = form.capacity;

  if (!name) {
    errors.name = "Enter an event name.";
  }

  if (!description) {
    errors.description = "Enter a description.";
  }

  if (!category) {
    errors.category = "Choose a category.";
  } else if (!EVENT_CATEGORIES.includes(category)) {
    errors.category = "Choose a valid category.";
  }

  if (!date) {
    errors.date = "Choose a date.";
  }
  if (!time) {
    errors.time = "Choose a time.";
  }
  if (date && time) {
    const startsAt = toLocalIsoDateTime(date, time);
    const startDate = new Date(startsAt);
    if (Number.isNaN(startDate.getTime())) {
      errors.date = "Enter a valid date and time.";
    } else if (startDate <= now) {
      errors.date = "Date and time must be in the future.";
      errors.time = "Date and time must be in the future.";
    }
  }

  if (!venueId) {
    errors.venueId = "Choose a venue.";
  }

  const capacity = Number(capacityRaw);
  if (capacityRaw === "" || capacityRaw == null) {
    errors.capacity = "Enter the maximum attendance.";
  } else if (!Number.isInteger(capacity) || capacity < 1) {
    errors.capacity = "Maximum attendance must be a whole number of at least 1.";
  }

  return errors;
}

export function buildEventCreateRequest(form) {
  const capacity = Number(form.capacity);
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category,
    startsAt: toLocalIsoDateTime(form.date, form.time),
    venueId: form.venueId,
    capacity,
  };
}

export function createSubmitLock() {
  let busy = false;
  return {
    tryAcquire() {
      if (busy) return false;
      busy = true;
      return true;
    },
    release() {
      busy = false;
    },
    isBusy() {
      return busy;
    },
  };
}

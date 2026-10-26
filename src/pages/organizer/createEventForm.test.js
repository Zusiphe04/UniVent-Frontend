import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEventCreateRequest,
  createSubmitLock,
  extractVenueList,
  normalizeVenue,
  toLocalIsoDateTime,
  validateCreateEventForm,
} from "./createEventForm.js";

const validForm = {
  name: "Open Day",
  description: "Campus tour for first-year students.",
  category: "Academic",
  date: "2099-03-15",
  time: "14:30",
  venueId: 7,
  capacity: "80",
};

describe("validateCreateEventForm", () => {
  it("requires name, description, category, date, time, venue and capacity", () => {
    const errors = validateCreateEventForm({
      name: " ",
      description: "",
      category: "",
      date: "",
      time: "",
      venueId: "",
      capacity: "",
    });
    assert.ok(errors.name);
    assert.ok(errors.description);
    assert.ok(errors.category);
    assert.ok(errors.date);
    assert.ok(errors.time);
    assert.ok(errors.venueId);
    assert.ok(errors.capacity);
  });

  it("rejects a date and time that are not in the future", () => {
    const errors = validateCreateEventForm(
      { ...validForm, date: "2020-01-01", time: "09:00" },
      new Date("2026-10-23T12:00:00")
    );
    assert.equal(errors.date, "Date and time must be in the future.");
    assert.equal(errors.time, "Date and time must be in the future.");
  });

  it("rejects a non-integer or non-positive maximum attendance", () => {
    assert.ok(validateCreateEventForm({ ...validForm, capacity: "0" }).capacity);
    assert.ok(validateCreateEventForm({ ...validForm, capacity: "1.5" }).capacity);
    assert.ok(validateCreateEventForm({ ...validForm, capacity: "-4" }).capacity);
  });

  it("accepts a complete future event", () => {
    const errors = validateCreateEventForm(validForm, new Date("2026-10-23T12:00:00"));
    assert.deepEqual(errors, {});
  });

  it("rejects a category that is not in the allowed list", () => {
    const errors = validateCreateEventForm({ ...validForm, category: "Other" });
    assert.equal(errors.category, "Choose a valid category.");
  });
});

describe("buildEventCreateRequest", () => {
  it("sends only the documented EventCreateRequest fields", () => {
    const payload = buildEventCreateRequest(validForm);
    assert.deepEqual(Object.keys(payload).sort(), [
      "capacity",
      "category",
      "description",
      "name",
      "startsAt",
      "venueId",
    ]);
    assert.equal(payload.name, "Open Day");
    assert.equal(payload.description, "Campus tour for first-year students.");
    assert.equal(payload.category, "Academic");
    assert.equal(payload.startsAt, "2099-03-15T14:30:00");
    assert.equal(payload.venueId, 7);
    assert.equal(payload.capacity, 80);
    assert.equal("organizer" in payload, false);
    assert.equal("venue" in payload, false);
    assert.equal("title" in payload, false);
    assert.equal("status" in payload, false);
  });

  it("keeps a string venueId as returned by the venue list", () => {
    const payload = buildEventCreateRequest({ ...validForm, venueId: "hall-a" });
    assert.equal(payload.venueId, "hall-a");
  });
});

describe("venues", () => {
  it("reads a plain array or a Spring page wrapper", () => {
    assert.equal(extractVenueList([{ id: 1 }]).length, 1);
    assert.equal(extractVenueList({ content: [{ id: 1 }, { id: 2 }] }).length, 2);
    assert.deepEqual(extractVenueList({}), []);
  });

  it("normalizes id or venueId and requires a usable id", () => {
    assert.deepEqual(normalizeVenue({ id: 3, name: "Engineering Hall" }), {
      id: 3,
      name: "Engineering Hall",
    });
    assert.deepEqual(normalizeVenue({ venueId: "a1", name: "Library" }), {
      id: "a1",
      name: "Library",
    });
    assert.equal(normalizeVenue({ name: "No id" }), null);
  });
});

describe("createSubmitLock", () => {
  it("allows only one acquire until release", () => {
    const lock = createSubmitLock();
    assert.equal(lock.tryAcquire(), true);
    assert.equal(lock.tryAcquire(), false);
    assert.equal(lock.tryAcquire(), false);
    lock.release();
    assert.equal(lock.tryAcquire(), true);
  });

  it("lets three rapid submit attempts produce only one POST", async () => {
    const lock = createSubmitLock();
    let posts = 0;
    const submit = async () => {
      if (!lock.tryAcquire()) return;
      posts += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      lock.release();
    };
    await Promise.all([submit(), submit(), submit()]);
    assert.equal(posts, 1);
  });
});

describe("toLocalIsoDateTime", () => {
  it("adds seconds when the time input is HH:mm", () => {
    assert.equal(toLocalIsoDateTime("2099-03-15", "14:30"), "2099-03-15T14:30:00");
  });
});

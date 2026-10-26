import client from "./client";

export const createBooking = async (eventId) => {
  const response = await client.post("/api/bookings", { eventId });
  return response.data;
};

/**
 * Check whether the authenticated student already has a booking for an event.
 *
 * Agreed contract (BE 06): GET /api/bookings/exists?eventId={id}
 *
 * The exact response shape is NOT finalised by the backend yet, so the raw
 * payload is returned unchanged and the caller interprets it defensively.
 * Confirm the shape with the backend owner before relying on it.
 */
export const bookingExists = async (eventId) => {
  const response = await client.get("/api/bookings/exists", {
    params: { eventId },
  });
  return response.data;
};

/** Same request as bookingExists, for callers that use the main-branch name. */
export const hasBooking = bookingExists;

export const getMyBookings = async () => {
  const response = await client.get("/api/bookings/my");
  return response.data;
};

export const cancelBooking = async (id) => {
  const response = await client.patch(`/api/bookings/${id}/cancel`);
  return response.data;
};

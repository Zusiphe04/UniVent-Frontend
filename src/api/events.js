import client from "./client";

/**
 * Fetch the event collection.
 *
 * Browse Events (FE 30) uses the BE 04 query:
 *   GET /api/events?search=&category=&from=&to=&status=APPROVED&page=&size=
 *
 * Callers may pass that query, another filters object, or no argument.
 * Empty, null, and undefined values are omitted so only filters that are
 * actually set are sent.
 */
export const getEvents = async (filters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const response = await client.get("/api/events", { params });
  return response.data;
};

export const getEvent = async (id) => {
  const response = await client.get(`/api/events/${id}`);
  return response.data;
};

export const createEvent = async (dto) => {
  const response = await client.post("/api/events", dto);
  return response.data;
};

export const updateEvent = async (id, dto) => {
  const response = await client.put(`/api/events/${id}`, dto);
  return response.data;
};

export const cancelEvent = async (id) => {
  const response = await client.patch(`/api/events/${id}/cancel`);
  return response.data;
};

export const approveEvent = async (id) => {
  const response = await client.patch(`/api/events/${id}/approve`);
  return response.data;
};

export const disableEvent = async (id) => {
  const response = await client.patch(`/api/events/${id}/disable`);
  return response.data;
};

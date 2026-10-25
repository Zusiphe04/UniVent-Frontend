import client from "./client";

export const getEvents = async (filters = {}) => {
  const response = await client.get("/api/events", { params: filters });
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
const response = await client.patch(`/api/admin/events/${id}/approve`);
  return response.data;
};

export const disableEvent = async (id) => {
const response = await client.patch(`/api/admin/events/${id}/disable`);  return response.data;
};
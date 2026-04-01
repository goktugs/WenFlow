export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1",
  collabUrl: import.meta.env.VITE_COLLAB_URL ?? "ws://localhost:4001"
};

import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export class ApiError extends Error {
  constructor(message, status, data, url) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.url = url;
  }
}

function stripUndefinedParams(query) {
  if (!query) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null)
  );
}

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

async function request(path, options = {}) {
  const {
    method = "GET",
    query,
    body,
    headers = {},
    withCredentials = true,
    ...rest
  } = options;

  try {
    const response = await axiosClient.request({
      url: path,
      method,
      params: stripUndefinedParams(query),
      data: body,
      headers,
      withCredentials,
      ...rest,
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const data = error.response?.data || null;
      const url = error.config?.url || path;
      const message =
        data && typeof data === "object" && data.message
          ? data.message
          : error.message || `Request failed with status ${status}`;

      throw new ApiError(message, status, data, url);
    }

    throw new ApiError("Unexpected request error", 500, null, path);
  }
}

export const apiClient = {
  axios: axiosClient,
  request,
  get: (path, options = {}) => request(path, { ...options, method: "GET" }),
  post: (path, body, options = {}) => request(path, { ...options, method: "POST", body }),
  put: (path, body, options = {}) => request(path, { ...options, method: "PUT", body }),
  patch: (path, body, options = {}) => request(path, { ...options, method: "PATCH", body }),
  delete: (path, options = {}) => request(path, { ...options, method: "DELETE" }),
};

export { API_BASE_URL };

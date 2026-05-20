import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

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

// Simple in-memory client-side cache for GET requests
const getCache = new Map();
const DEFAULT_TTL = 30000; // 30 seconds default TTL

// Paths that should not be cached (like live notifications)
const DYNAMIC_PATHS = ["/notifications"];

// Clear all cached GET requests
export function clearCache() {
  getCache.clear();
}

function getCacheKey(path, query) {
  const normalizedQuery = stripUndefinedParams(query) || {};
  // Sort keys to ensure consistent cache keys regardless of query param ordering
  const sortedQuery = Object.keys(normalizedQuery)
    .sort()
    .reduce((acc, key) => {
      acc[key] = normalizedQuery[key];
      return acc;
    }, {});
  return JSON.stringify({ path, query: sortedQuery });
}

async function request(path, options = {}) {
  const {
    method = "GET",
    query,
    body,
    headers = {},
    withCredentials = true,
    cache: useCache = true, // By default caching is enabled for GET requests
    forceRefresh = false,   // Set true to skip reading from cache (will still populate it)
    ttl = DEFAULT_TTL,      // Cache duration in ms
    ...rest
  } = options;

  const methodUpper = method.toUpperCase();
  const isGet = methodUpper === "GET";

  // If a mutation is initiated, invalidate all cache entries
  if (!isGet) {
    clearCache();
  }

  // Check cache for eligible GET requests
  const canCache = isGet && useCache && !DYNAMIC_PATHS.some(dp => path.includes(dp));
  const cacheKey = canCache ? getCacheKey(path, query) : null;

  if (canCache && !forceRefresh) {
    const cachedEntry = getCache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < ttl) {
      return cachedEntry.data;
    }
  }

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

    const responseData = response.data;

    // Cache successful GET requests
    if (canCache) {
      getCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now(),
      });
    }

    return responseData;
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
  clearCache,
};

export { API_BASE_URL };

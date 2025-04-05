import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      ...(options?.body ? { "Content-Type": "application/json" } : {})
    },
    body: options?.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options?.body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Helper method for HTTP methods, to make the code cleaner
export async function apiMethod(
  method: string,
  url: string,
  body?: any,
  options?: RequestInit
): Promise<Response> {
  return apiRequest(url, {
    ...options,
    method,
    body
  });
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

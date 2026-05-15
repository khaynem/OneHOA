import { NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

const protectedRoutes = [
  "/dashboard",
  "/homeowner-management",
  "/payment-monitoring",
  "/hoa-activities",
  "/admin/account-management",
];

const routeRoleRules = {
  "/admin/account-management": ["admin"],
};

function matchesRoute(pathname, routes) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function getRouteRoles(pathname) {
  const exactMatch = Object.keys(routeRoleRules).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  return exactMatch ? routeRoleRules[exactMatch] : null;
}

async function getCurrentUser(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const apiUrl = API_BASE_URL.startsWith("http")
      ? `${API_BASE_URL}/auth/me`
      : `${request.nextUrl.origin}${API_BASE_URL}/auth/me`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data?.user || null;
  } catch {
    return null;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = matchesRoute(pathname, protectedRoutes);
  const isLoginRoute = pathname === "/login";

  if (!isProtectedRoute && !isLoginRoute) {
    return NextResponse.next();
  }

  const user = await getCurrentUser(request);

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isProtectedRoute && user) {
    const allowedRoles = getRouteRoles(pathname);
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (isLoginRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/homeowner-management/:path*",
    "/payment-monitoring/:path*",
    "/hoa-activities/:path*",
    "/admin/account-management/:path*",
  ],
};

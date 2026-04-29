import { Href } from "expo-router";

export type RouteConfig = {
  path: string;
  requiresAuth: boolean;
  requiresGuest: boolean;
  redirectOnFail: Href;
};

export const ROUTES_CONFIG: RouteConfig[] = [
  // Rutas exclusivas de invitados (Guest)
  {
    path: "/login",
    requiresAuth: false,
    requiresGuest: true,
    redirectOnFail: "/calendars",
  },
  {
    path: "/register",
    requiresAuth: false,
    requiresGuest: true,
    redirectOnFail: "/calendars",
  },
  {
    path: "/forgot-password",
    requiresAuth: false,
    requiresGuest: true,
    redirectOnFail: "/calendars",
  },
  {
    path: "/new-password",
    requiresAuth: false,
    requiresGuest: true,
    redirectOnFail: "/calendars",
  },

  // Rutas que requieren autenticación (Auth)
  {
    path: "/profile",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/settings",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/notifications",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/create",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/create_events",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/edit",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/edit_events",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/chat",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/importCalendar",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/subscription",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/search",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/radar",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/calendar-view",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/calendars",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/switch-calendar",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/switch-events",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/payment",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/analytics",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/feedback",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
  {
    path: "/help-support",
    requiresAuth: true,
    requiresGuest: false,
    redirectOnFail: "/login",
  },
];

export function getRouteProtection(pathname: string): RouteConfig | undefined {
  const normalizedPath = pathname.replace(/^\/\(tabs\)/, "") || "/";

  return ROUTES_CONFIG.find((config) => {
    return normalizedPath === config.path || normalizedPath.startsWith(`${config.path}/`);
  });
}

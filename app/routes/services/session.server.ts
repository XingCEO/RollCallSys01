import { createCookieSessionStorage } from "@remix-run/node";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "remix_auth_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: [process.env.AUTH_SECRET as string],
    secure: process.env.NODE_ENV === "production",
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;

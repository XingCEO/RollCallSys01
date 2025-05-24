import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { getUserFromSession } from "./routes/services/session.server";

import "./tailwind.css";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  
  // 不需驗證的公開路由
  if (
    url.pathname === "/login" ||
    url.pathname.startsWith("/auth/google") ||
    url.pathname === "/auth/google/callback"
  ) {
    return json({ user: null });
  }
  
  // 其他路由檢查登入狀態
  const user = await getUserFromSession(request);
  if (!user) {
    throw new Response("Redirect", {
      status: 302,
      headers: {
        Location: "/login",
      },
    });
  }
  
  return json({ user });
}

export default function App() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <html lang="zh-TW">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet context={{ user }} />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
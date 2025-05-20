import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { authenticator } from "./routes/services/auth.server";
import type { LinksFunction } from "@remix-run/node";

import "./tailwind.css";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  // 先放過不需驗證的公開路由
  if (
    url.pathname === "/login" ||
    url.pathname.startsWith("/auth/google")
  ) {
    return json({ user: null });
  }
  // 其餘一律驗證
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
  return json({ user });
}



export default function App() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <html lang="zh-TW">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        {/* 你可以把 user 放到 context 或直接傳給 Outlet */}
        <Outlet context={{ user }} />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

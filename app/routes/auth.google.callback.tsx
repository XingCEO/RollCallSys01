import { LoaderFunctionArgs } from "@remix-run/node";
import { verifyGoogleToken } from "../lib/google-auth.server";
import { getSession, commitSession } from "./services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  
  if (error) {
    console.error("Google OAuth 錯誤:", error);
    return new Response("Redirect", {
      status: 302,
      headers: {
        Location: "/login?error=oauth_error",
      },
    });
  }
  
  if (!code) {
    return new Response("Redirect", {
      status: 302,
      headers: {
        Location: "/login?error=missing_code",
      },
    });
  }
  
  try {
    const user = await verifyGoogleToken(code);
    const session = await getSession(request.headers.get("Cookie"));
    session.set("user", user);
    
    return new Response("Redirect", {
      status: 302,
      headers: {
        Location: "/dashboard",
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (error) {
    console.error("認證錯誤:", error);
    return new Response("Redirect", {
      status: 302,
      headers: {
        Location: "/login?error=auth_failed",
      },
    });
  }
}
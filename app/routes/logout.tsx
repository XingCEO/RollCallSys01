import { LoaderFunctionArgs } from "@remix-run/node";
import { getSession, destroySession } from "./services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  
  return new Response("Redirect", {
    status: 302,
    headers: {
      Location: "/login",
      "Set-Cookie": await destroySession(session),
    },
  });
}
import { LoaderFunctionArgs } from "@remix-run/node";
import { generateAuthUrl } from "../lib/google-auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const authUrl = generateAuthUrl("login");
  
  return new Response("Redirect", {
    status: 302,
    headers: {
      Location: authUrl,
    },
  });
}
// app/routes/logout.tsx
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "./services/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return authenticator.logout(request, { redirectTo: "/login" });
}

export async function action({ request }: ActionFunctionArgs) {
  return authenticator.logout(request, { redirectTo: "/login" });
}

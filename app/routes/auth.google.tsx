// app/routes/auth.google.tsx
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "./services/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return authenticator.authenticate("google", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
}

export async function action({ request }: ActionFunctionArgs) {
  return authenticator.authenticate("google", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
}

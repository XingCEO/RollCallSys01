// app/routes/dashboard.tsx
import { LoaderFunctionArgs, json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { authenticator } from "./services/auth.server";
import { User } from "./services/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
  
  return json({ user: user as User });
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>();
  
  return (
    <div>
      <h1>歡迎，{user.name}！</h1>
      <img src={user.avatarUrl} alt={user.name} width="50" height="50" />
      <p>Email: {user.email}</p>
   <a
        href="/logout"
        className="px-4 py-2 rounded-md bg-red-500 hover:bg-red-400"
      >
        Logout
      </a>
    </div>
  );
}

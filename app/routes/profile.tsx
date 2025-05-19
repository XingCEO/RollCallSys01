// app/routes/profile.tsx
import { LoaderFunctionArgs, json } from "@remix-run/node";
import { authenticator } from "./services/auth.server";


export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
  return json({ user });
}

export default function Profile() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">個人資料</h1>
      <p>這是受保護的個人資料頁面</p>
    </div>
  );
}
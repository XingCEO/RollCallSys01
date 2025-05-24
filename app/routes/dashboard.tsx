import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireUserSession } from "./services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUserSession(request);
  return json({ user });
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>();
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">歡迎，{user.name}！</h1>
        
        <div className="flex items-center gap-4 mb-6">
          {user.avatarUrl && (
            <img 
              src={user.avatarUrl} 
              alt={user.name} 
              className="w-16 h-16 rounded-full"
            />
          )}
          <div>
            <p className="text-gray-600">Email: {user.email}</p>
            <p className="text-gray-600">ID: {user.id}</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <Link
            to="/profile"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            個人資料
          </Link>
          <Link
            to="/logout"
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            登出
          </Link>
        </div>
      </div>
    </div>
  );
}
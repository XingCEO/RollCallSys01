import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { requireUserSession } from "./services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUserSession(request);
  return json({ user });
}

export default function Index() {
  const { user } = useLoaderData<typeof loader>();
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          歡迎來到首頁
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          您好，{user.name}！
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/dashboard"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            前往儀表板
          </Link>
          <Link
            to="/profile"
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            個人資料
          </Link>
        </div>
      </div>
    </div>
  );
}
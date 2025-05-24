import { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  
  // 對於瀏覽器的特殊請求，返回 404
  if (url.pathname.includes('.well-known') || 
      url.pathname.includes('devtools') ||
      url.pathname.includes('favicon.ico')) {
    throw new Response("Not Found", { status: 404 });
  }
  
  // 對於其他未匹配的路由，重新導向到首頁
  throw new Response("Redirect", {
    status: 302,
    headers: {
      Location: "/login",
    },
  });
}

export default function CatchAllRoute() {
  // 這個組件不會被渲染，因為 loader 總是會拋出 Response
  return null;
}
// app/routes/login.tsx
import { Form } from "@remix-run/react";

export default function Login() {
  return (
    <main className="relative w-full min-h-svh flex flex-col items-center justify-center gap-4">
      <h1 className="font-bold text-2xl">登入頁面</h1>
      <span>
        下方按鍵透過Gmail帳號登入
      </span>
      <a
        href="/auth/google"
        className="rounded-md bg-neutral-500 hover:bg-neutral-400 px-4 py-2"
      >
        Login with Google
      </a>
    </main>
  );
}
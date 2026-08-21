import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Masuk</h1>
      <p className="mt-1 text-sm text-slate-500">
        Masuk untuk mengelola supplier, produk, dan pesanan usaha Anda.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        Belum punya akun?{" "}
        <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
          Daftarkan usaha Anda
        </Link>
      </p>
    </div>
  );
}

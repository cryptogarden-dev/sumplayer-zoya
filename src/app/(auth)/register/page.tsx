import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Daftarkan Usaha Anda</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pendaftaran ini membuat akun Pemilik/Admin pertama untuk usaha Anda. Staf dapat ditambahkan
        kemudian dari dalam aplikasi.
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        Sudah punya akun?{" "}
        <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}

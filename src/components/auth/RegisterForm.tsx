"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

interface RegisterFieldErrors {
  businessName?: string[];
  ownerName?: string[];
  email?: string[];
  password?: string[];
}

/**
 * Pendaftaran usaha baru (ARCHITECTURE.md §5): hanya untuk pemilik pertama.
 * Staf berikutnya ditambahkan oleh Pemilik/Admin dari dalam aplikasi pada
 * tahap berikutnya, bukan lewat halaman pendaftaran publik ini.
 */
export function RegisterForm() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFormError("Konfirmasi kata sandi tidak sama dengan kata sandi.");
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName, ownerName, email, password }),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      issues?: RegisterFieldErrors;
    } | null;

    if (!response.ok) {
      setFormError(payload?.error ?? "Pendaftaran gagal. Silakan coba lagi.");
      setFieldErrors(payload?.issues ?? {});
      setIsSubmitting(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (!signInResult || signInResult.error) {
      router.push("/login");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <Label htmlFor="businessName">Nama Usaha</Label>
        <Input
          id="businessName"
          name="businessName"
          required
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
        />
        {fieldErrors.businessName ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.businessName[0]}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="ownerName">Nama Pemilik</Label>
        <Input
          id="ownerName"
          name="ownerName"
          required
          value={ownerName}
          onChange={(event) => setOwnerName(event.target.value)}
        />
        {fieldErrors.ownerName ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.ownerName[0]}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {fieldErrors.email ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="password">Kata Sandi</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {fieldErrors.password ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.password[0]}</p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">Minimal 8 karakter, mengandung angka.</p>
        )}
      </div>

      <div>
        <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>

      {formError ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          {formError}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Mendaftarkan..." : "Daftarkan Usaha"}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!login || !password) {
      setError("Login dan password wajib diisi");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });

      const result = await response.json();

      if (result.success) {
        // Store data in sessionStorage and redirect
        sessionStorage.setItem("siswaData", JSON.stringify(result.data));
        router.push("/form");
      } else {
        setError(result.message || "Login gagal");
      }
    } catch (err) {
      setError("Gagal terhubung ke server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.logoWrapper}>
          <Image src="/Logo Cendekia.png" alt="Cendekia" width={200} height={80} style={{ objectFit: "contain" }} priority />
        </div>
        <div className={styles.header}>
          <h1>Form Pelatihan Karyawan</h1>
          <p>Silakan login dengan email dan password Anda</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="login">Email Login</label>
            <input
              type="email"
              id="login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="contoh@email.com"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? "Memproses..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}

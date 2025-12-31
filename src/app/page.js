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
  const [isMitraMode, setIsMitraMode] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!login) {
      setError("Login wajib diisi");
      return;
    }

    if (!isMitraMode && !password) {
      setError("Password wajib diisi");
      return;
    }

    setIsLoading(true);

    try {
      // Different API for Mitra vs Regular login
      const apiUrl = isMitraMode ? "/api/auth/mitra" : "/api/auth/login";
      const body = isMitraMode ? { login } : { login, password };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        // Store data in sessionStorage and redirect
        sessionStorage.setItem("siswaData", JSON.stringify(result.data));
        router.push("/form");
      } else {
        setError(result.error || result.message || "Login gagal");
      }
    } catch (err) {
      setError("Gagal terhubung ke server");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMitraMode = () => {
    setIsMitraMode(!isMitraMode);
    setError("");
    setLogin("");
    setPassword("");
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.logoWrapper}>
          <Image src="/Logo Cendekia.png" alt="Cendekia" width={200} height={80} style={{ objectFit: "contain" }} priority />
        </div>
        <div className={styles.header}>
          <h1>Form Pelatihan eLite</h1>
          <p>{isMitraMode ? "Login sebagai Mitra Kerja" : "Silakan login dengan email dan password Pega HCQ Anda"}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="login">{isMitraMode ? "Login Mitra" : "Email Login"}</label>
            <input
              type={isMitraMode ? "text" : "email"}
              id="login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder={isMitraMode ? "Masukkan login mitra" : "contoh@email.com"}
              disabled={isLoading}
              autoComplete={isMitraMode ? "username" : "email"}
            />
          </div>

          {!isMitraMode && (
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
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? "Memproses..." : "Login"}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", margin: "20px 0", gap: "10px" }}>
          <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }}></div>
          <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>atau</span>
          <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }}></div>
        </div>

        {/* Mitra Toggle Button */}
        <button
          type="button"
          onClick={toggleMitraMode}
          style={{
            width: "100%",
            padding: "14px",
            background: isMitraMode ? "#667eea" : "transparent",
            color: isMitraMode ? "white" : "#667eea",
            border: "2px solid #667eea",
            borderRadius: "10px",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          {isMitraMode ? "← Kembali ke Login Karyawan" : "Login sebagai Mitra Kerja"}
        </button>
      </div>
    </main>
  );
}


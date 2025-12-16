"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function FormPage() {
    const router = useRouter();
    const [siswaData, setSiswaData] = useState(null);
    const [selectedPelatihan, setSelectedPelatihan] = useState("");

    useEffect(() => {
        // Check if user is logged in
        const data = sessionStorage.getItem("siswaData");
        if (!data) {
            router.push("/");
            return;
        }
        setSiswaData(JSON.parse(data));
    }, [router]);

    const handleLogout = () => {
        sessionStorage.removeItem("siswaData");
        router.push("/");
    };

    if (!siswaData) {
        return (
            <main className={styles.main}>
                <div className={styles.loading}>Memuat data...</div>
            </main>
        );
    }

    return (
        <main className={styles.main}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>Formulir Pendaftaran Pelatihan</h1>
                    <p>Data Anda berhasil diambil dari sistem</p>
                </div>

                <section className={styles.section}>
                    <h2>Data Karyawan</h2>
                    <div className={styles.grid}>
                        <div className={styles.field}>
                            <label>NIS</label>
                            <input type="text" value={siswaData.NIS} disabled />
                        </div>
                        <div className={styles.field}>
                            <label>Nama</label>
                            <input type="text" value={siswaData.Nama} disabled />
                        </div>
                        <div className={styles.field}>
                            <label>Wilayah Studi</label>
                            <input type="text" value={siswaData.NamaWilayahStudi} disabled />
                        </div>
                        <div className={styles.field}>
                            <label>Lokasi Studi</label>
                            <input type="text" value={siswaData.NamaLokasiStudi} disabled />
                        </div>
                        <div className={styles.field}>
                            <label>Program</label>
                            <input type="text" value={siswaData.NamaProgramPelatihan} disabled />
                        </div>
                        <div className={styles.field}>
                            <label>Peminatan</label>
                            <input type="text" value={siswaData.NamaPeminatanProgramPelatihan} disabled />
                        </div>
                        <div className={styles.field}>
                            <label>Tanggal Masuk</label>
                            <input type="text" value={siswaData.TanggalMasukSiswa} disabled />
                        </div>
                        <div className={styles.field}>
                            <label>Jabatan</label>
                            <input type="text" value={siswaData.NamaJabatan} disabled />
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>Pilih Pelatihan</h2>
                    <div className={styles.field}>
                        <label>Nama Pelajaran (Hanya pelatihan aktif)</label>
                        <select
                            value={selectedPelatihan}
                            onChange={(e) => setSelectedPelatihan(e.target.value)}
                        >
                            <option value="">-- Pilih Pelatihan --</option>
                            <option value="coming_soon" disabled>
                                (API Pelatihan Coming Soon)
                            </option>
                        </select>
                    </div>

                    <button className={styles.submitBtn} disabled>
                        Daftar &amp; Lanjut Kuis
                    </button>
                    <p className={styles.note}>
                        * Fitur pendaftaran akan diaktifkan setelah integrasi API pelatihan
                    </p>
                </section>

                <button className={styles.logoutBtn} onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </main>
    );
}

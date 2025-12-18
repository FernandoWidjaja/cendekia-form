"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function FormPage() {
    const router = useRouter();
    const [siswaData, setSiswaData] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [selectedPelatihan, setSelectedPelatihan] = useState("");
    const [isLoadingLessons, setIsLoadingLessons] = useState(true);
    const [lessonsError, setLessonsError] = useState("");

    useEffect(() => {
        // Check if user is logged in
        const data = sessionStorage.getItem("siswaData");
        if (!data) {
            router.push("/");
            return;
        }
        setSiswaData(JSON.parse(data));

        // Fetch lessons
        fetchLessons();
    }, [router]);

    const fetchLessons = async () => {
        try {
            setIsLoadingLessons(true);
            const response = await fetch("/api/lessons");
            const result = await response.json();

            if (result.success) {
                setLessons(result.data);
            } else {
                setLessonsError(result.message);
            }
        } catch (error) {
            setLessonsError("Gagal memuat daftar pelatihan");
        } finally {
            setIsLoadingLessons(false);
        }
    };

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
                        <label>Nama Pelajaran</label>
                        {lessonsError ? (
                            <p className={styles.error}>{lessonsError}</p>
                        ) : (
                            <select
                                value={selectedPelatihan}
                                onChange={(e) => setSelectedPelatihan(e.target.value)}
                                disabled={isLoadingLessons}
                            >
                                <option value="">
                                    {isLoadingLessons ? "Memuat..." : "-- Pilih Pelatihan --"}
                                </option>
                                {lessons.map((lesson, index) => (
                                    <option key={index} value={lesson.nama}>
                                        {lesson.nama}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <button
                        className={styles.submitBtn}
                        disabled={!selectedPelatihan}
                        onClick={() => {
                            if (selectedPelatihan) {
                                router.push(`/quiz/${encodeURIComponent(selectedPelatihan)}`);
                            }
                        }}
                    >
                        Daftar &amp; Lanjut Kuis
                    </button>
                    {!selectedPelatihan && (
                        <p className={styles.note}>
                            * Pilih pelatihan untuk melanjutkan
                        </p>
                    )}
                </section>

                <button className={styles.logoutBtn} onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </main>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function FormPage() {
    const router = useRouter();
    const [siswaData, setSiswaData] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [isLoadingLessons, setIsLoadingLessons] = useState(true);
    const [lessonsError, setLessonsError] = useState("");
    const [programSiswa, setProgramSiswa] = useState(null);
    const [programError, setProgramError] = useState("");
    const [attempts, setAttempts] = useState({});

    useEffect(() => {
        const data = sessionStorage.getItem("siswaData");
        if (!data) {
            router.push("/");
            return;
        }
        const parsed = JSON.parse(data);
        setSiswaData(parsed);
        fetchLessons();
        fetchProgramSiswa(parsed.Login);
        fetchAttempts(parsed.Login);
    }, [router]);

    const fetchLessons = async () => {
        try {
            setIsLoadingLessons(true);
            const response = await fetch("/api/quiz/active");
            const result = await response.json();
            if (result.success) {
                setLessons(result.data);
                if (result.data.length === 0) {
                    setLessonsError("Tidak ada pelatihan aktif saat ini");
                }
            } else {
                setLessonsError(result.message || "Gagal memuat pelatihan");
            }
        } catch (error) {
            setLessonsError("Gagal memuat daftar pelatihan");
        } finally {
            setIsLoadingLessons(false);
        }
    };

    const fetchProgramSiswa = async (login) => {
        if (!login) return;
        try {
            const response = await fetch(`/api/program-siswa?login=${encodeURIComponent(login)}`);
            const result = await response.json();
            if (result.success && result.data) {
                setProgramSiswa(result.data.namaProgram);
            } else {
                setProgramError("Silahkan Hubungi Tim Cendekia untuk update Program Siswa");
            }
        } catch (error) {
            setProgramError("Gagal memuat program siswa");
        }
    };

    const fetchAttempts = async (login) => {
        if (!login) return;
        try {
            const response = await fetch(`/api/quiz/attempts?login=${encodeURIComponent(login)}`);
            const result = await response.json();
            if (result.success) {
                setAttempts(result.data);
            }
        } catch (error) {
            console.error("Fetch attempts error:", error);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem("siswaData");
        router.push("/");
    };

    const handleStartQuiz = (lessonName) => {
        if (programError) {
            alert("Silahkan Hubungi Tim Cendekia untuk update Program Siswa sebelum mengerjakan quiz");
            return;
        }
        if (attempts[lessonName]) {
            alert("Anda sudah mengerjakan quiz ini");
            return;
        }
        router.push(`/quiz/${encodeURIComponent(lessonName)}`);
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
                    <h2>Data Siswa</h2>
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
                            <label>Detail Program Siswa</label>
                            {programError ? (
                                <p className={styles.warning}>{programError}</p>
                            ) : (
                                <input type="text" value={programSiswa || "Memuat..."} disabled />
                            )}
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2>Pelatihan Aktif</h2>
                    {isLoadingLessons ? (
                        <p className={styles.note}>Memuat pelatihan...</p>
                    ) : lessonsError ? (
                        <p className={styles.error}>{lessonsError}</p>
                    ) : (
                        <div className={styles.quizCards}>
                            {lessons.map((lesson, index) => {
                                const attempt = attempts[lesson.nama];
                                const isCompleted = !!attempt;

                                return (
                                    <div key={index} className={`${styles.quizCard} ${isCompleted ? styles.completed : ""}`}>
                                        <div className={styles.quizInfo}>
                                            <h3>{lesson.nama}</h3>
                                            <p className={styles.quizMeta}>
                                                {lesson.questionCount} soal • {lesson.timerMinutes} menit
                                            </p>
                                        </div>
                                        {isCompleted ? (
                                            <div className={styles.quizResult}>
                                                <span className={styles.completedBadge}>✓ Selesai</span>
                                                <p className={styles.scoreText}>
                                                    Nilai: <strong>{attempt.score}</strong> ({attempt.grade})
                                                </p>
                                            </div>
                                        ) : (
                                            <button
                                                className={styles.startBtn}
                                                onClick={() => handleStartQuiz(lesson.nama)}
                                                disabled={!!programError}
                                            >
                                                Mulai Quiz
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <button className={styles.logoutBtn} onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </main>
    );
}

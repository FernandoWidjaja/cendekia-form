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
            // Get user's company from session
            const userCompany = siswaData?.Company || "";
            const response = await fetch(`/api/quiz/active?company=${encodeURIComponent(userCompany)}`);
            const result = await response.json();
            if (result.success) {
                // Filter quizzes by company (if targetCompanies exists)
                const filtered = result.data.filter(quiz => {
                    // If no targetCompanies or empty, show to all (backward compat)
                    if (!quiz.targetCompanies || quiz.targetCompanies.length === 0) return true;
                    // Check if user's company is in targetCompanies
                    return quiz.targetCompanies.includes(userCompany);
                });
                setLessons(filtered);
                if (filtered.length === 0) {
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
        // Skip program siswa check for ASM users - they use Jabatan instead
        if (siswaData?.Company === "ASM") {
            setProgramSiswa(siswaData?.NamaJabatan || "-");
            return;
        }
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
                    <h2>{siswaData.Company === "ASM" ? "Data Karyawan ASM" : "Data Siswa"}</h2>
                    <div className={styles.grid}>
                        <div className={styles.field}>
                            <label>{siswaData.Company === "ASM" ? "NIK" : "NIS"}</label>
                            <input type="text" value={siswaData.NIS} disabled />
                        </div>
                        <div className={styles.field}>
                            <label>Nama</label>
                            <input type="text" value={siswaData.Nama} disabled />
                        </div>
                        <div className={styles.field}>
                            <label>{siswaData.Company === "ASM" ? "Wilayah" : "Wilayah Studi"}</label>
                            <input type="text" value={siswaData.NamaWilayahStudi} disabled />
                        </div>
                        <div className={styles.field}>
                            <label>{siswaData.Company === "ASM" ? "Cabang" : "Lokasi Studi"}</label>
                            <input type="text" value={siswaData.NamaLokasiStudi} disabled />
                        </div>
                        <div className={styles.field}>
                            <label>{siswaData.Company === "ASM" ? "Divisi" : "Program"}</label>
                            <input type="text" value={siswaData.NamaProgramPelatihan} disabled />
                        </div>
                        <div className={styles.field}>
                            <label>{siswaData.Company === "ASM" ? "Departemen" : "Peminatan"}</label>
                            <input type="text" value={siswaData.NamaPeminatanProgramPelatihan} disabled />
                        </div>
                        <div className={styles.field}>
                            <label>Tanggal Masuk</label>
                            <input type="text" value={siswaData.TanggalMasukSiswa} disabled />
                        </div>
                        <div className={styles.field}>
                            <label>{siswaData.Company === "ASM" ? "Jabatan" : "Detail Program Siswa"}</label>
                            {siswaData.Company === "ASM" ? (
                                <input type="text" value={siswaData.NamaJabatan || "-"} disabled />
                            ) : programError ? (
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

"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";

export default function AdminPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [authHeader, setAuthHeader] = useState("");

    // Quiz state
    const [quizzes, setQuizzes] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Form state
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [timerMinutes, setTimerMinutes] = useState(30);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [questions, setQuestions] = useState([]);
    const [editMode, setEditMode] = useState(false);

    const handleLogin = () => {
        if (email.toUpperCase() === "WIDJ47@GMAIL.COM" && password === "@ASMHCD2025") {
            const auth = btoa(`${email}:${password}`);
            setAuthHeader(`Basic ${auth}`);
            setIsLoggedIn(true);
            setError("");
        } else {
            setError("Email atau password salah");
        }
    };

    const fetchQuizzes = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/quiz", {
                headers: { Authorization: authHeader },
            });
            const data = await res.json();
            if (data.success) setQuizzes(data.data);
        } catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    };

    const fetchLessons = async () => {
        try {
            const res = await fetch("/api/lessons");
            const data = await res.json();
            if (data.success) setLessons(data.data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (isLoggedIn) {
            fetchQuizzes();
            fetchLessons();
        }
    }, [isLoggedIn]);

    const addQuestion = () => {
        setQuestions([
            ...questions,
            { question: "", options: ["", "", "", ""], correctAnswer: 0 },
        ]);
    };

    const updateQuestion = (index, field, value) => {
        const updated = [...questions];
        if (field === "question") {
            updated[index].question = value;
        } else if (field === "correctAnswer") {
            updated[index].correctAnswer = parseInt(value);
        } else if (field.startsWith("option")) {
            const optIndex = parseInt(field.replace("option", ""));
            updated[index].options[optIndex] = value;
        }
        setQuestions(updated);
    };

    const removeQuestion = (index) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const saveQuiz = async () => {
        if (!selectedLesson || questions.length === 0) {
            alert("Pilih lesson dan tambah minimal 1 soal");
            return;
        }
        if (!startDate || !endDate) {
            alert("Tanggal mulai dan selesai wajib diisi");
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/quiz", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader,
                },
                body: JSON.stringify({
                    lessonName: selectedLesson.nama,
                    lessonData: selectedLesson,
                    timerMinutes,
                    startDate,
                    endDate,
                    isActive: true,
                    questions,
                }),
            });
            const data = await res.json();
            if (data.success) {
                alert("Quiz berhasil disimpan!");
                resetForm();
                fetchQuizzes();
            } else {
                alert("Gagal menyimpan: " + data.error);
            }
        } catch (e) {
            alert("Error: " + e.message);
        }
        setIsLoading(false);
    };

    const deleteQuizHandler = async (lessonName) => {
        if (!confirm(`Hapus quiz ${lessonName}?`)) return;

        try {
            const res = await fetch("/api/admin/quiz", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader,
                },
                body: JSON.stringify({ lessonName }),
            });
            const data = await res.json();
            if (data.success) {
                alert("Quiz dihapus!");
                fetchQuizzes();
            }
        } catch (e) {
            alert("Error: " + e.message);
        }
    };

    const editQuizHandler = (quiz) => {
        setSelectedLesson({ nama: quiz.lessonName, ...quiz.lessonData });
        setTimerMinutes(quiz.timerMinutes);
        setStartDate(quiz.startDate || "");
        setEndDate(quiz.endDate || "");
        setQuestions(quiz.questions);
        setEditMode(true);
    };

    const resetForm = () => {
        setSelectedLesson(null);
        setTimerMinutes(30);
        setStartDate("");
        setEndDate("");
        setQuestions([]);
        setEditMode(false);
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        const day = d.getDate().toString().padStart(2, "0");
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, "0");
        const mins = d.getMinutes().toString().padStart(2, "0");
        return `${day}/${month}/${year} ${hours}:${mins}`;
    };

    const getQuizStatus = (quiz) => {
        const now = new Date();
        const start = new Date(quiz.startDate);
        const end = new Date(quiz.endDate);
        end.setHours(23, 59, 59);

        if (now < start) return { status: "Belum Aktif", color: "#6b7280" };
        if (now > end) return { status: "Selesai", color: "#dc2626" };
        return { status: "Aktif", color: "#10b981" };
    };

    if (!isLoggedIn) {
        return (
            <main className={styles.main}>
                <div className={styles.loginBox}>
                    <h1>Admin Login</h1>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {error && <p className={styles.error}>{error}</p>}
                    <button onClick={handleLogin}>Login</button>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.main}>
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1>Admin Panel - Quiz Management</h1>
                    <button onClick={() => setIsLoggedIn(false)} className={styles.logoutBtn}>
                        Logout
                    </button>
                </header>

                <div className={styles.content}>
                    {/* Quiz List */}
                    <section className={styles.section}>
                        <h2>Quiz yang Ada ({quizzes.length})</h2>
                        {isLoading ? (
                            <p>Loading...</p>
                        ) : quizzes.length === 0 ? (
                            <p>Belum ada quiz</p>
                        ) : (
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Lesson</th>
                                        <th>Soal</th>
                                        <th>Timer</th>
                                        <th>Periode</th>
                                        <th>Status</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quizzes.map((q, i) => {
                                        const statusInfo = getQuizStatus(q);
                                        return (
                                            <tr key={i}>
                                                <td>{q.lessonName}</td>
                                                <td>{q.questions?.length || 0}</td>
                                                <td>{q.timerMinutes} menit</td>
                                                <td>{formatDateTime(q.startDate)} - {formatDateTime(q.endDate)}</td>
                                                <td style={{ color: statusInfo.color, fontWeight: 600 }}>
                                                    {statusInfo.status}
                                                </td>
                                                <td>
                                                    <button onClick={() => editQuizHandler(q)}>Edit</button>
                                                    <button onClick={() => deleteQuizHandler(q.lessonName)}>Hapus</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </section>

                    {/* Quiz Form */}
                    <section className={styles.section}>
                        <h2>{editMode ? "Edit Quiz" : "Buat Quiz Baru"}</h2>

                        <div className={styles.formGroup}>
                            <label>Pilih Lesson:</label>
                            <select
                                value={selectedLesson?.nama || ""}
                                onChange={(e) => {
                                    const lesson = lessons.find((l) => l.nama === e.target.value);
                                    setSelectedLesson(lesson);
                                }}
                            >
                                <option value="">-- Pilih Lesson --</option>
                                {lessons.map((l, i) => (
                                    <option key={i} value={l.nama}>
                                        {l.nama}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Timer (menit):</label>
                                <input
                                    type="number"
                                    value={timerMinutes}
                                    onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 30)}
                                    min={1}
                                />
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Mulai (Tanggal & Jam):</label>
                                <input
                                    type="datetime-local"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Selesai (Tanggal & Jam):</label>
                                <input
                                    type="datetime-local"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.questions}>
                            <h3>Soal ({questions.length})</h3>
                            {questions.map((q, i) => (
                                <div key={i} className={styles.questionCard}>
                                    <div className={styles.questionHeader}>
                                        <span>Soal {i + 1}</span>
                                        <button onClick={() => removeQuestion(i)}>×</button>
                                    </div>
                                    <input
                                        placeholder="Pertanyaan"
                                        value={q.question}
                                        onChange={(e) => updateQuestion(i, "question", e.target.value)}
                                    />
                                    <div className={styles.options}>
                                        {q.options.map((opt, j) => (
                                            <div key={j} className={styles.optionRow}>
                                                <input
                                                    type="radio"
                                                    name={`correct-${i}`}
                                                    checked={q.correctAnswer === j}
                                                    onChange={() => updateQuestion(i, "correctAnswer", j)}
                                                />
                                                <input
                                                    placeholder={`Opsi ${String.fromCharCode(65 + j)}`}
                                                    value={opt}
                                                    onChange={(e) => updateQuestion(i, `option${j}`, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <button onClick={addQuestion} className={styles.addBtn}>
                                + Tambah Soal
                            </button>
                        </div>

                        <div className={styles.formActions}>
                            <button onClick={saveQuiz} className={styles.saveBtn} disabled={isLoading}>
                                {isLoading ? "Menyimpan..." : "Simpan Quiz"}
                            </button>
                            {editMode && (
                                <button onClick={resetForm} className={styles.cancelBtn}>
                                    Batal
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}

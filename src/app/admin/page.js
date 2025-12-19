"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import * as XLSX from "xlsx";
import styles from "./page.module.css";

export default function AdminPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [authHeader, setAuthHeader] = useState("");
    const [activeTab, setActiveTab] = useState("quiz");

    // Quiz state
    const [quizzes, setQuizzes] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [timerMinutes, setTimerMinutes] = useState(30);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [questions, setQuestions] = useState([]);
    const [editMode, setEditMode] = useState(false);

    // Master Program state
    const [programs, setPrograms] = useState([]);
    const [newProgram, setNewProgram] = useState("");

    // Program Siswa state
    const [programSiswa, setProgramSiswa] = useState([]);
    const [siswaLogin, setSiswaLogin] = useState("");
    const [siswaProgram, setSiswaProgram] = useState("");
    const [siswaBatch, setSiswaBatch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [siswaName, setSiswaName] = useState("");
    const fileInputRef = useRef(null);
    const [uploadStatus, setUploadStatus] = useState(null);

    // ScoreDetail state
    const [scoreDetails, setScoreDetails] = useState([]);

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

    // Fetch functions
    const fetchQuizzes = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/quiz", { headers: { Authorization: authHeader } });
            const data = await res.json();
            if (data.success) setQuizzes(data.data);
        } catch (e) { console.error(e); }
        setIsLoading(false);
    };

    const fetchLessons = async () => {
        try {
            const res = await fetch("/api/lessons");
            const data = await res.json();
            if (data.success) setLessons(data.data);
        } catch (e) { console.error(e); }
    };

    const fetchPrograms = async () => {
        try {
            const res = await fetch("/api/admin/program", { headers: { Authorization: authHeader } });
            const data = await res.json();
            if (data.success) setPrograms(data.data);
        } catch (e) { console.error(e); }
    };

    const fetchProgramSiswa = async () => {
        try {
            const res = await fetch("/api/admin/program-siswa", { headers: { Authorization: authHeader } });
            const data = await res.json();
            if (data.success) setProgramSiswa(data.data);
        } catch (e) { console.error(e); }
    };

    const fetchScoreDetails = async () => {
        try {
            const res = await fetch("/api/admin/scoredetail", { headers: { Authorization: authHeader } });
            const data = await res.json();
            if (data.success) setScoreDetails(data.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (isLoggedIn) {
            fetchQuizzes();
            fetchLessons();
            fetchPrograms();
            fetchProgramSiswa();
            fetchScoreDetails();
        }
    }, [isLoggedIn]);

    // Quiz functions
    const addQuestion = () => {
        setQuestions([...questions, { question: "", options: ["", "", "", ""], correctAnswer: 0 }]);
    };

    const updateQuestion = (index, field, value) => {
        const updated = [...questions];
        if (field === "question") updated[index].question = value;
        else if (field === "correctAnswer") updated[index].correctAnswer = parseInt(value);
        else if (field.startsWith("option")) {
            const optIndex = parseInt(field.replace("option", ""));
            updated[index].options[optIndex] = value;
        }
        setQuestions(updated);
    };

    const removeQuestion = (index) => setQuestions(questions.filter((_, i) => i !== index));

    const saveQuiz = async () => {
        if (!selectedLesson || questions.length === 0) return alert("Pilih lesson dan tambah soal");
        if (!startDate || !endDate) return alert("Tanggal wajib diisi");
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/quiz", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: authHeader },
                body: JSON.stringify({ lessonName: selectedLesson.nama, lessonData: selectedLesson, timerMinutes, startDate, endDate, isActive: true, questions }),
            });
            const data = await res.json();
            if (data.success) { alert("Quiz disimpan!"); resetQuizForm(); fetchQuizzes(); }
            else alert("Gagal: " + data.error);
        } catch (e) { alert("Error: " + e.message); }
        setIsLoading(false);
    };

    const deleteQuizHandler = async (lessonName) => {
        if (!confirm(`Hapus quiz ${lessonName}?`)) return;
        const res = await fetch("/api/admin/quiz", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify({ lessonName }),
        });
        if ((await res.json()).success) { alert("Dihapus!"); fetchQuizzes(); }
    };

    const editQuizHandler = (quiz) => {
        setSelectedLesson({ nama: quiz.lessonName, ...quiz.lessonData });
        setTimerMinutes(quiz.timerMinutes);
        setStartDate(quiz.startDate || "");
        setEndDate(quiz.endDate || "");
        setQuestions(quiz.questions);
        setEditMode(true);
    };

    const resetQuizForm = () => {
        setSelectedLesson(null);
        setTimerMinutes(30);
        setStartDate("");
        setEndDate("");
        setQuestions([]);
        setEditMode(false);
    };

    // Master Program functions
    const addProgramHandler = async () => {
        if (!newProgram) return;
        const res = await fetch("/api/admin/program", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify({ namaProgram: newProgram }),
        });
        if ((await res.json()).success) { setNewProgram(""); fetchPrograms(); }
    };

    const deleteProgramHandler = async (id) => {
        if (!confirm("Hapus program?")) return;
        await fetch("/api/admin/program", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify({ id }),
        });
        fetchPrograms();
    };

    // Program Siswa functions
    const searchSiswa = async (query) => {
        if (query.length < 2) { setSearchResults([]); return; }
        const res = await fetch(`/api/siswa/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) setSearchResults(data.data);
    };

    const selectSiswa = (siswa) => {
        setSiswaLogin(siswa.login);
        setSiswaName(`${siswa.nama} (${siswa.nis})`);
        setSearchResults([]);
    };

    const addProgramSiswaHandler = async () => {
        if (!siswaLogin || !siswaProgram) return alert("Login dan Program wajib diisi");
        const res = await fetch("/api/admin/program-siswa", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify({ login: siswaLogin, namaProgram: siswaProgram, batch: siswaBatch }),
        });
        if ((await res.json()).success) { setSiswaLogin(""); setSiswaName(""); setSiswaProgram(""); setSiswaBatch(""); fetchProgramSiswa(); }
    };

    const deleteProgramSiswaHandler = async (login) => {
        if (!confirm(`Hapus program siswa ${login}?`)) return;
        await fetch("/api/admin/program-siswa", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify({ login }),
        });
        fetchProgramSiswa();
    };

    const deleteScoreDetailHandler = async (login, lesson) => {
        if (!confirm(`Hapus score ${lesson}?`)) return;
        await fetch("/api/admin/scoredetail", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify({ login, lesson }),
        });
        fetchScoreDetails();
    };

    const handleExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadStatus({ loading: true });

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const wb = XLSX.read(evt.target.result, { type: "binary" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);

            const bulk = data.map(row => ({
                login: row.Login || row.login || "",
                namaProgram: row.NamaProgram || row.namaProgram || row.Program || "",
            }));

            const res = await fetch("/api/admin/program-siswa", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: authHeader },
                body: JSON.stringify({ bulk }),
            });
            const result = await res.json();
            setUploadStatus(result);
            fetchProgramSiswa();
        };
        reader.readAsBinaryString(file);
        e.target.value = "";
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    };

    const getQuizStatus = (quiz) => {
        const now = new Date();
        const start = new Date(quiz.startDate);
        const end = new Date(quiz.endDate);
        if (now < start) return { status: "Belum Aktif", color: "#6b7280" };
        if (now > end) return { status: "Selesai", color: "#dc2626" };
        return { status: "Aktif", color: "#10b981" };
    };

    if (!isLoggedIn) {
        return (
            <main className={styles.main}>
                <div className={styles.loginBox}>
                    <div className={styles.logoWrapper}>
                        <Image src="/Logo Cendekia.png" alt="Cendekia" width={180} height={70} style={{ objectFit: "contain" }} priority />
                    </div>
                    <h1>Admin Login</h1>
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
                    <button onClick={() => setIsLoggedIn(false)} className={styles.logoutBtn}>Logout</button>
                </header>

                <div className={styles.tabs}>
                    <button className={activeTab === "quiz" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("quiz")}>Quiz</button>
                    <button className={activeTab === "program" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("program")}>Master Program</button>
                    <button className={activeTab === "siswa" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("siswa")}>Program Siswa</button>
                    <button className={activeTab === "scores" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("scores")}>Score Detail</button>
                </div>

                {activeTab === "quiz" && (
                    <div className={styles.content}>
                        <section className={styles.section}>
                            <h2>Quiz yang Ada ({quizzes.length})</h2>
                            {isLoading ? <p>Loading...</p> : quizzes.length === 0 ? <p>Belum ada quiz</p> : (
                                <table className={styles.table}>
                                    <thead><tr><th>Lesson</th><th>Soal</th><th>Timer</th><th>Periode</th><th>Status</th><th>Aksi</th></tr></thead>
                                    <tbody>
                                        {quizzes.map((q, i) => {
                                            const s = getQuizStatus(q);
                                            return (<tr key={i}><td>{q.lessonName}</td><td>{q.questions?.length || 0}</td><td>{q.timerMinutes} menit</td><td>{formatDateTime(q.startDate)} - {formatDateTime(q.endDate)}</td><td style={{ color: s.color, fontWeight: 600 }}>{s.status}</td><td><button onClick={() => editQuizHandler(q)}>Edit</button><button onClick={() => deleteQuizHandler(q.lessonName)}>Hapus</button></td></tr>);
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </section>
                        <section className={styles.section}>
                            <h2>{editMode ? "Edit Quiz" : "Buat Quiz Baru"}</h2>
                            <div className={styles.formGroup}><label>Pilih Lesson:</label><select value={selectedLesson?.nama || ""} onChange={(e) => setSelectedLesson(lessons.find(l => l.nama === e.target.value))}><option value="">-- Pilih --</option>{lessons.map((l, i) => <option key={i} value={l.nama}>{l.nama}</option>)}</select></div>
                            <div className={styles.formRow}><div className={styles.formGroup}><label>Timer (menit):</label><input type="number" value={timerMinutes} onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 30)} min={1} /></div></div>
                            <div className={styles.formRow}><div className={styles.formGroup}><label>Mulai:</label><input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div><div className={styles.formGroup}><label>Selesai:</label><input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div></div>
                            <div className={styles.questions}><h3>Soal ({questions.length})</h3>{questions.map((q, i) => (<div key={i} className={styles.questionCard}><div className={styles.questionHeader}><span>Soal {i + 1}</span><button onClick={() => removeQuestion(i)}>×</button></div><input placeholder="Pertanyaan" value={q.question} onChange={(e) => updateQuestion(i, "question", e.target.value)} /><div className={styles.options}>{q.options.map((opt, j) => (<div key={j} className={styles.optionRow}><input type="radio" name={`correct-${i}`} checked={q.correctAnswer === j} onChange={() => updateQuestion(i, "correctAnswer", j)} /><input placeholder={`Opsi ${String.fromCharCode(65 + j)}`} value={opt} onChange={(e) => updateQuestion(i, `option${j}`, e.target.value)} /></div>))}</div></div>))}<button onClick={addQuestion} className={styles.addBtn}>+ Tambah Soal</button></div>
                            <div className={styles.formActions}><button onClick={saveQuiz} className={styles.saveBtn} disabled={isLoading}>{isLoading ? "Menyimpan..." : "Simpan Quiz"}</button>{editMode && <button onClick={resetQuizForm} className={styles.cancelBtn}>Batal</button>}</div>
                        </section>
                    </div>
                )}

                {activeTab === "program" && (
                    <div className={styles.content}>
                        <section className={styles.section}>
                            <h2>Master Nama Program ({programs.length})</h2>
                            <div className={styles.formRow}><input placeholder="Nama Program Baru" value={newProgram} onChange={(e) => setNewProgram(e.target.value)} /><button onClick={addProgramHandler} className={styles.addBtn}>Tambah</button></div>
                            <table className={styles.table}><thead><tr><th>ID</th><th>Nama Program</th><th>Aksi</th></tr></thead><tbody>{programs.map((p, i) => (<tr key={i}><td>{p.id}</td><td>{p.namaProgram}</td><td><button onClick={() => deleteProgramHandler(p.id)}>Hapus</button></td></tr>))}</tbody></table>
                        </section>
                    </div>
                )}

                {activeTab === "siswa" && (
                    <div className={styles.content}>
                        <section className={styles.section}>
                            <h2>Master Program per Siswa ({programSiswa.length})</h2>
                            <div className={styles.formGroup}>
                                <label>Cari Siswa (Login):</label>
                                <input placeholder="Ketik login..." value={siswaName || siswaLogin} onChange={(e) => { setSiswaName(e.target.value); setSiswaLogin(""); searchSiswa(e.target.value); }} />
                                {searchResults.length > 0 && (<div className={styles.searchResults}>{searchResults.map((s, i) => (<div key={i} className={styles.searchItem} onClick={() => selectSiswa(s)}>{s.nama} ({s.login}) - {s.nis}</div>))}</div>)}
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label>Program:</label><select value={siswaProgram} onChange={(e) => setSiswaProgram(e.target.value)}><option value="">-- Pilih --</option>{programs.map((p, i) => <option key={i} value={p.namaProgram}>{p.namaProgram}</option>)}</select></div>
                                <div className={styles.formGroup}><label>Batch:</label><input placeholder="Contoh: SDP 144" value={siswaBatch} onChange={(e) => setSiswaBatch(e.target.value)} /></div>
                                <button onClick={addProgramSiswaHandler} className={styles.addBtn}>Tambah</button>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Upload Excel (Login, NamaProgram, Batch):</label>
                                <input type="file" accept=".xlsx,.xls" ref={fileInputRef} onChange={handleExcelUpload} />
                                {uploadStatus && !uploadStatus.loading && (<div className={uploadStatus.success ? styles.success : styles.error}>{uploadStatus.success ? `Berhasil import ${uploadStatus.imported} data` : `Error: ${uploadStatus.errors?.map(e => `Row ${e.row}: ${e.error}`).join(", ")}`}</div>)}
                            </div>
                            <table className={styles.table}><thead><tr><th>Login</th><th>Nama Program</th><th>Batch</th><th>Aksi</th></tr></thead><tbody>{programSiswa.map((p, i) => (<tr key={i}><td>{p.login}</td><td>{p.namaProgram}</td><td>{p.batch || "-"}</td><td><button onClick={() => deleteProgramSiswaHandler(p.login)}>Hapus</button></td></tr>))}</tbody></table>
                        </section>
                    </div>
                )}

                {activeTab === "scores" && (
                    <div className={styles.content}>
                        <section className={styles.section}>
                            <h2>Score Detail ({scoreDetails.length})</h2>
                            <button onClick={() => {
                                const ws = XLSX.utils.json_to_sheet(scoreDetails);
                                const wb = XLSX.utils.book_new();
                                XLSX.utils.book_append_sheet(wb, ws, "ScoreDetails");
                                XLSX.writeFile(wb, "score_details.xlsx");
                            }} className={styles.addBtn} style={{ marginBottom: "1rem" }}>Export Excel</button>
                            {scoreDetails.length === 0 ? <p>Belum ada data</p> : (
                                <table className={styles.table}>
                                    <thead><tr><th>Date</th><th>Time</th><th>Login</th><th>Lesson</th><th>Score</th><th>Program</th><th>Batch</th><th>Description</th><th>Aksi</th></tr></thead>
                                    <tbody>{scoreDetails.map((s, i) => (
                                        <tr key={i}><td>{s.Date}</td><td>{s.SubmitTime}</td><td>{s.Login}</td><td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>{s.Lesson}</td><td>{s.Score}</td><td>{s.NamaProgram}</td><td>{s.Batch}</td><td>{s.Description}</td><td><button onClick={() => deleteScoreDetailHandler(s.Login, s.Lesson)}>Hapus</button></td></tr>
                                    ))}</tbody>
                                </table>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}

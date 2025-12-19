"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import * as XLSX from "xlsx";
import styles from "./page.module.css";

// Session management constants
const INACTIVITY_TIMEOUT = 60000; // 1 minute in milliseconds
const SESSION_KEY = "adminSession";

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
    const [lessonSearch, setLessonSearch] = useState("");
    const [showLessonDropdown, setShowLessonDropdown] = useState(false);
    const [timerMinutes, setTimerMinutes] = useState(30);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [questions, setQuestions] = useState([]);
    const [editMode, setEditMode] = useState(false);
    const [quizPage, setQuizPage] = useState(1);
    const [selectedQuizzes, setSelectedQuizzes] = useState([]);

    // Master Program state
    const [programs, setPrograms] = useState([]);
    const [newProgram, setNewProgram] = useState("");
    const [programPage, setProgramPage] = useState(1);
    const [selectedPrograms, setSelectedPrograms] = useState([]);

    // Program Siswa state
    const [programSiswa, setProgramSiswa] = useState([]);
    const [siswaLogin, setSiswaLogin] = useState("");
    const [siswaProgram, setSiswaProgram] = useState("");
    const [siswaBatch, setSiswaBatch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [siswaName, setSiswaName] = useState("");
    const fileInputRef = useRef(null);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [siswaPage, setSiswaPage] = useState(1);
    const [selectedSiswa, setSelectedSiswa] = useState([]);

    // ScoreDetail state
    const [scoreDetails, setScoreDetails] = useState([]);
    const [scorePage, setScorePage] = useState(1);
    const [selectedScores, setSelectedScores] = useState([]);

    // Items per page
    const ITEMS_PER_PAGE = 10;

    const handleLogin = () => {
        if (email.toUpperCase() === "WIDJ47@GMAIL.COM" && password === "@ASMHCD2025") {
            const auth = btoa(`${email}:${password}`);
            setAuthHeader(`Basic ${auth}`);
            setIsLoggedIn(true);
            setError("");
            // Save session to sessionStorage
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                email: email,
                authHeader: `Basic ${auth}`,
                lastActivity: Date.now()
            }));
        } else {
            setError("Email atau password salah");
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setAuthHeader("");
        setEmail("");
        setPassword("");
        sessionStorage.removeItem(SESSION_KEY);
    };

    // Restore session on component mount
    useEffect(() => {
        const session = sessionStorage.getItem(SESSION_KEY);
        if (session) {
            try {
                const { email: savedEmail, authHeader: savedAuth, lastActivity } = JSON.parse(session);
                const now = Date.now();
                if (now - lastActivity < INACTIVITY_TIMEOUT) {
                    setIsLoggedIn(true);
                    setAuthHeader(savedAuth);
                    setEmail(savedEmail);
                    // Update last activity
                    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                        email: savedEmail,
                        authHeader: savedAuth,
                        lastActivity: now
                    }));
                } else {
                    // Session expired due to inactivity
                    sessionStorage.removeItem(SESSION_KEY);
                }
            } catch (e) {
                sessionStorage.removeItem(SESSION_KEY);
            }
        }
    }, []);

    // Inactivity tracking and auto-logout
    useEffect(() => {
        if (!isLoggedIn) return;

        const updateActivity = () => {
            const session = sessionStorage.getItem(SESSION_KEY);
            if (session) {
                try {
                    const data = JSON.parse(session);
                    data.lastActivity = Date.now();
                    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
                } catch (e) {
                    // Ignore parse errors
                }
            }
        };

        const checkInactivity = setInterval(() => {
            const session = sessionStorage.getItem(SESSION_KEY);
            if (session) {
                try {
                    const { lastActivity } = JSON.parse(session);
                    if (Date.now() - lastActivity >= INACTIVITY_TIMEOUT) {
                        handleLogout();
                    }
                } catch (e) {
                    handleLogout();
                }
            }
        }, 10000); // Check every 10 seconds

        // Event listeners for activity
        window.addEventListener("mousemove", updateActivity);
        window.addEventListener("keydown", updateActivity);
        window.addEventListener("click", updateActivity);

        return () => {
            clearInterval(checkInactivity);
            window.removeEventListener("mousemove", updateActivity);
            window.removeEventListener("keydown", updateActivity);
            window.removeEventListener("click", updateActivity);
        };
    }, [isLoggedIn]);

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

    // Pagination helper
    const paginate = (items, page) => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return items.slice(start, start + ITEMS_PER_PAGE);
    };
    const getTotalPages = (items) => Math.ceil(items.length / ITEMS_PER_PAGE);

    // Filtered lessons for autocomplete
    const filteredLessons = lessons.filter(l =>
        l.nama.toLowerCase().includes(lessonSearch.toLowerCase())
    );

    // Lesson autocomplete handlers
    const handleLessonSelect = (lesson) => {
        setSelectedLesson(lesson);
        setLessonSearch(lesson.nama);
        setShowLessonDropdown(false);
    };

    // Export functions
    const exportQuizzes = () => {
        const data = quizzes.map(q => ({ Lesson: q.lessonName, Soal: q.questions?.length || 0, Timer: q.timerMinutes, Status: getQuizStatus(q).status }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Quizzes");
        XLSX.writeFile(wb, "quizzes.xlsx");
    };

    const exportPrograms = () => {
        const ws = XLSX.utils.json_to_sheet(programs);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Programs");
        XLSX.writeFile(wb, "master_program.xlsx");
    };

    const exportProgramSiswa = () => {
        const ws = XLSX.utils.json_to_sheet(programSiswa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ProgramSiswa");
        XLSX.writeFile(wb, "program_siswa.xlsx");
    };

    // Bulk delete handlers
    const bulkDeleteQuizzes = async () => {
        if (selectedQuizzes.length === 0) return alert("Pilih quiz dulu");
        if (!confirm(`Hapus ${selectedQuizzes.length} quiz?`)) return;
        for (const name of selectedQuizzes) {
            await fetch("/api/admin/quiz", {
                method: "DELETE",
                headers: { "Content-Type": "application/json", Authorization: authHeader },
                body: JSON.stringify({ lessonName: name }),
            });
        }
        setSelectedQuizzes([]);
        fetchQuizzes();
    };

    const bulkDeletePrograms = async () => {
        if (selectedPrograms.length === 0) return alert("Pilih program dulu");
        if (!confirm(`Hapus ${selectedPrograms.length} program?`)) return;
        for (const id of selectedPrograms) {
            await fetch("/api/admin/program", {
                method: "DELETE",
                headers: { "Content-Type": "application/json", Authorization: authHeader },
                body: JSON.stringify({ id }),
            });
        }
        setSelectedPrograms([]);
        fetchPrograms();
    };

    const bulkDeleteSiswa = async () => {
        if (selectedSiswa.length === 0) return alert("Pilih siswa dulu");
        if (!confirm(`Hapus ${selectedSiswa.length} siswa?`)) return;
        for (const login of selectedSiswa) {
            await fetch("/api/admin/program-siswa", {
                method: "DELETE",
                headers: { "Content-Type": "application/json", Authorization: authHeader },
                body: JSON.stringify({ login }),
            });
        }
        setSelectedSiswa([]);
        fetchProgramSiswa();
    };

    const bulkDeleteScores = async () => {
        if (selectedScores.length === 0) return alert("Pilih score dulu");
        if (!confirm(`Hapus ${selectedScores.length} score?`)) return;
        for (const item of selectedScores) {
            const [login, lesson] = item.split("|||");
            await fetch("/api/admin/scoredetail", {
                method: "DELETE",
                headers: { "Content-Type": "application/json", Authorization: authHeader },
                body: JSON.stringify({ login, lesson }),
            });
        }
        setSelectedScores([]);
        fetchScoreDetails();
    };

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

    const [programUploadStatus, setProgramUploadStatus] = useState(null);
    const programFileRef = useRef(null);

    const handleProgramExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setProgramUploadStatus({ loading: true });

        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const wb = XLSX.read(evt.target.result, { type: "binary" });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const data = XLSX.utils.sheet_to_json(ws);

                    let imported = 0;
                    for (const row of data) {
                        const namaProgram = row.NamaProgram || row.namaProgram || row.Program || "";
                        if (namaProgram) {
                            await fetch("/api/admin/program", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", Authorization: authHeader },
                                body: JSON.stringify({ namaProgram }),
                            });
                            imported++;
                        }
                    }
                    setProgramUploadStatus({ success: true, imported });
                    fetchPrograms();
                } catch (err) {
                    setProgramUploadStatus({ success: false, error: err.message });
                }
            };
            reader.readAsBinaryString(file);
        } catch (err) {
            setProgramUploadStatus({ success: false, error: err.message });
        }
        e.target.value = "";
    };

    const downloadProgramTemplate = () => {
        const template = [{ NamaProgram: "Contoh Program 1" }, { NamaProgram: "Contoh Program 2" }];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "template_master_program.xlsx");
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

        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const wb = XLSX.read(evt.target.result, { type: "binary" });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const data = XLSX.utils.sheet_to_json(ws);

                    const bulk = data.map(row => {
                        console.log("Excel row:", row); // Debug log
                        return {
                            login: row.Login || row.login || "",
                            namaProgram: row.NamaProgram || row.namaProgram || row.Program || "",
                            batch: row.Batch || row.batch || "",
                        };
                    });

                    const res = await fetch("/api/admin/program-siswa", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: authHeader },
                        body: JSON.stringify({ bulk }),
                    });
                    const result = await res.json();
                    setUploadStatus(result);
                    fetchProgramSiswa();
                } catch (err) {
                    setUploadStatus({ success: false, error: err.message });
                }
            };
            reader.readAsBinaryString(file);
        } catch (err) {
            setUploadStatus({ success: false, error: err.message });
        }
        e.target.value = "";
    };

    const downloadTemplate = () => {
        const template = [
            { Login: "email@example.com", NamaProgram: "HCD & LEG", Batch: "SDP 155 ODP 149" },
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "template_program_siswa.xlsx");
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
                    <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
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
                            <div className={styles.sectionHeader}>
                                <h2>Quiz yang Ada ({quizzes.length})</h2>
                                <div className={styles.actionBtns}>
                                    <button onClick={exportQuizzes} className={styles.addBtn}>Export Excel</button>
                                    {selectedQuizzes.length > 0 && <button onClick={bulkDeleteQuizzes} style={{ background: "#dc2626", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Hapus {selectedQuizzes.length} Terpilih</button>}
                                </div>
                            </div>
                            {isLoading ? <p>Loading...</p> : quizzes.length === 0 ? <p>Belum ada quiz</p> : (
                                <>
                                    <table className={styles.table}>
                                        <thead><tr><th><input type="checkbox" checked={selectedQuizzes.length === quizzes.length && quizzes.length > 0} onChange={(e) => setSelectedQuizzes(e.target.checked ? quizzes.map(q => q.lessonName) : [])} /></th><th>Lesson</th><th>Soal</th><th>Timer</th><th>Periode</th><th>Status</th><th>Aksi</th></tr></thead>
                                        <tbody>
                                            {paginate(quizzes, quizPage).map((q, i) => {
                                                const s = getQuizStatus(q);
                                                return (<tr key={i}><td><input type="checkbox" checked={selectedQuizzes.includes(q.lessonName)} onChange={(e) => setSelectedQuizzes(e.target.checked ? [...selectedQuizzes, q.lessonName] : selectedQuizzes.filter(x => x !== q.lessonName))} /></td><td>{q.lessonName}</td><td>{q.questions?.length || 0}</td><td>{q.timerMinutes} menit</td><td>{formatDateTime(q.startDate)} - {formatDateTime(q.endDate)}</td><td style={{ color: s.color, fontWeight: 600 }}>{s.status}</td><td><button onClick={() => editQuizHandler(q)}>Edit</button><button onClick={() => deleteQuizHandler(q.lessonName)}>Hapus</button></td></tr>);
                                            })}
                                        </tbody>
                                    </table>
                                    <div className={styles.pagination}>
                                        <button disabled={quizPage === 1} onClick={() => setQuizPage(p => p - 1)}>« Prev</button>
                                        <span>Halaman {quizPage} dari {getTotalPages(quizzes)}</span>
                                        <button disabled={quizPage >= getTotalPages(quizzes)} onClick={() => setQuizPage(p => p + 1)}>Next »</button>
                                    </div>
                                </>
                            )}
                        </section>
                        <section className={styles.section}>
                            <h2>{editMode ? "Edit Quiz" : "Buat Quiz Baru"}</h2>
                            <div className={styles.formGroup} style={{ position: "relative" }}>
                                <label>Cari & Pilih Lesson:</label>
                                <input
                                    placeholder="Ketik nama lesson..."
                                    value={lessonSearch}
                                    onChange={(e) => { setLessonSearch(e.target.value); setShowLessonDropdown(true); }}
                                    onFocus={() => setShowLessonDropdown(true)}
                                />
                                {showLessonDropdown && filteredLessons.length > 0 && (
                                    <div className={styles.searchResults}>
                                        {filteredLessons.slice(0, 10).map((l, i) => (
                                            <div key={i} className={styles.searchItem} onClick={() => handleLessonSelect(l)}>{l.nama}</div>
                                        ))}
                                    </div>
                                )}
                                {selectedLesson && <div style={{ marginTop: "8px", color: "#10b981" }}>✓ Selected: {selectedLesson.nama}</div>}
                            </div>
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
                            <div className={styles.sectionHeader}>
                                <h2>Master Nama Program ({programs.length})</h2>
                                <div className={styles.actionBtns}>
                                    <button onClick={exportPrograms} className={styles.addBtn}>Export Excel</button>
                                    {selectedPrograms.length > 0 && <button onClick={bulkDeletePrograms} style={{ background: "#dc2626", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Hapus {selectedPrograms.length} Terpilih</button>}
                                </div>
                            </div>
                            <div className={styles.formRow}><input placeholder="Nama Program Baru" value={newProgram} onChange={(e) => setNewProgram(e.target.value)} /><button onClick={addProgramHandler} className={styles.addBtn}>Tambah</button></div>
                            <div className={styles.formGroup}>
                                <label>Upload Excel (NamaProgram):</label>
                                <div className={styles.formRow}>
                                    <input type="file" accept=".xlsx,.xls" ref={programFileRef} onChange={handleProgramExcelUpload} style={{ flex: 1 }} />
                                    <button onClick={downloadProgramTemplate} className={styles.addBtn}>Download Template</button>
                                </div>
                                {programUploadStatus && programUploadStatus.loading && <div style={{ color: "#667eea" }}>Uploading...</div>}
                                {programUploadStatus && !programUploadStatus.loading && (<div className={programUploadStatus.success ? styles.success : styles.error}>{programUploadStatus.success ? `Berhasil import ${programUploadStatus.imported} program` : `Error: ${programUploadStatus.error}`}</div>)}
                            </div>
                            <table className={styles.table}>
                                <thead><tr><th><input type="checkbox" checked={selectedPrograms.length === programs.length && programs.length > 0} onChange={(e) => setSelectedPrograms(e.target.checked ? programs.map(p => p.id) : [])} /></th><th>ID</th><th>Nama Program</th><th>Aksi</th></tr></thead>
                                <tbody>{paginate(programs, programPage).map((p, i) => (<tr key={i}><td><input type="checkbox" checked={selectedPrograms.includes(p.id)} onChange={(e) => setSelectedPrograms(e.target.checked ? [...selectedPrograms, p.id] : selectedPrograms.filter(x => x !== p.id))} /></td><td>{p.id}</td><td>{p.namaProgram}</td><td><button onClick={() => deleteProgramHandler(p.id)}>Hapus</button></td></tr>))}</tbody>
                            </table>
                            {programs.length > ITEMS_PER_PAGE && (
                                <div className={styles.pagination}>
                                    <button disabled={programPage === 1} onClick={() => setProgramPage(p => p - 1)}>« Prev</button>
                                    <span>Halaman {programPage} dari {getTotalPages(programs)}</span>
                                    <button disabled={programPage >= getTotalPages(programs)} onClick={() => setProgramPage(p => p + 1)}>Next »</button>
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === "siswa" && (
                    <div className={styles.content}>
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>Master Program per Siswa ({programSiswa.length})</h2>
                                <div className={styles.actionBtns}>
                                    <button onClick={exportProgramSiswa} className={styles.addBtn}>Export Excel</button>
                                    {selectedSiswa.length > 0 && <button onClick={bulkDeleteSiswa} style={{ background: "#dc2626", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Hapus {selectedSiswa.length} Terpilih</button>}
                                </div>
                            </div>
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
                                <div className={styles.formRow}>
                                    <input type="file" accept=".xlsx,.xls" ref={fileInputRef} onChange={handleExcelUpload} style={{ flex: 1 }} />
                                    <button onClick={downloadTemplate} className={styles.addBtn}>Download Template</button>
                                </div>
                                {uploadStatus && uploadStatus.loading && <div style={{ color: "#667eea" }}>Uploading...</div>}
                                {uploadStatus && !uploadStatus.loading && (<div className={uploadStatus.success ? styles.success : styles.error}>{uploadStatus.success ? `Berhasil import ${uploadStatus.imported} data` : `Error: ${uploadStatus.error || uploadStatus.errors?.map(e => `Row ${e.row}: ${e.error}`).join(", ")}`}</div>)}
                            </div>
                            <table className={styles.table}>
                                <thead><tr><th><input type="checkbox" checked={selectedSiswa.length === programSiswa.length && programSiswa.length > 0} onChange={(e) => setSelectedSiswa(e.target.checked ? programSiswa.map(p => p.login) : [])} /></th><th>Login</th><th>Nama Program</th><th>Batch</th><th>Aksi</th></tr></thead>
                                <tbody>{paginate(programSiswa, siswaPage).map((p, i) => (<tr key={i}><td><input type="checkbox" checked={selectedSiswa.includes(p.login)} onChange={(e) => setSelectedSiswa(e.target.checked ? [...selectedSiswa, p.login] : selectedSiswa.filter(x => x !== p.login))} /></td><td>{p.login}</td><td>{p.namaProgram}</td><td>{p.batch || "-"}</td><td><button onClick={() => deleteProgramSiswaHandler(p.login)}>Hapus</button></td></tr>))}</tbody>
                            </table>
                            {programSiswa.length > ITEMS_PER_PAGE && (
                                <div className={styles.pagination}>
                                    <button disabled={siswaPage === 1} onClick={() => setSiswaPage(p => p - 1)}>« Prev</button>
                                    <span>Halaman {siswaPage} dari {getTotalPages(programSiswa)}</span>
                                    <button disabled={siswaPage >= getTotalPages(programSiswa)} onClick={() => setSiswaPage(p => p + 1)}>Next »</button>
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === "scores" && (
                    <div className={styles.content}>
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>Score Detail ({scoreDetails.length})</h2>
                                <div className={styles.actionBtns}>
                                    <button onClick={() => {
                                        const ws = XLSX.utils.json_to_sheet(scoreDetails);
                                        const wb = XLSX.utils.book_new();
                                        XLSX.utils.book_append_sheet(wb, ws, "ScoreDetails");
                                        XLSX.writeFile(wb, "score_details.xlsx");
                                    }} className={styles.addBtn}>Export Excel</button>
                                    {selectedScores.length > 0 && <button onClick={bulkDeleteScores} style={{ background: "#dc2626", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Hapus {selectedScores.length} Terpilih</button>}
                                </div>
                            </div>
                            {scoreDetails.length === 0 ? <p>Belum ada data</p> : (
                                <>
                                    <table className={styles.table}>
                                        <thead><tr><th><input type="checkbox" checked={selectedScores.length === scoreDetails.length && scoreDetails.length > 0} onChange={(e) => setSelectedScores(e.target.checked ? scoreDetails.map(s => `${s.Login}|||${s.Lesson}`) : [])} /></th><th>Date</th><th>Time</th><th>Login</th><th>Lesson</th><th>Score</th><th>Program</th><th>Batch</th><th>Description</th><th>Aksi</th></tr></thead>
                                        <tbody>{paginate(scoreDetails, scorePage).map((s, i) => (
                                            <tr key={i}><td><input type="checkbox" checked={selectedScores.includes(`${s.Login}|||${s.Lesson}`)} onChange={(e) => setSelectedScores(e.target.checked ? [...selectedScores, `${s.Login}|||${s.Lesson}`] : selectedScores.filter(x => x !== `${s.Login}|||${s.Lesson}`))} /></td><td>{s.Date}</td><td>{s.SubmitTime}</td><td>{s.Login}</td><td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>{s.Lesson}</td><td>{s.Score}</td><td>{s.NamaProgram}</td><td>{s.Batch}</td><td>{s.Description}</td><td><button onClick={() => deleteScoreDetailHandler(s.Login, s.Lesson)}>Hapus</button></td></tr>
                                        ))}</tbody>
                                    </table>
                                    {scoreDetails.length > ITEMS_PER_PAGE && (
                                        <div className={styles.pagination}>
                                            <button disabled={scorePage === 1} onClick={() => setScorePage(p => p - 1)}>« Prev</button>
                                            <span>Halaman {scorePage} dari {getTotalPages(scoreDetails)}</span>
                                            <button disabled={scorePage >= getTotalPages(scoreDetails)} onClick={() => setScorePage(p => p + 1)}>Next »</button>
                                        </div>
                                    )}
                                </>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}

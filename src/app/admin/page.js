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
    // New: Custom quiz name and target companies
    const [useCustomName, setUseCustomName] = useState(false);
    const [customQuizName, setCustomQuizName] = useState("");
    const [targetCompanies, setTargetCompanies] = useState(["ASM", "SISWA", "SRNM", "SASI", "MITRA"]); // Default all

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
    // Score Detail filter & sort
    const [scoreFilterLogin, setScoreFilterLogin] = useState("");
    const [scoreFilterLesson, setScoreFilterLesson] = useState("");
    const [scoreFilterGrade, setScoreFilterGrade] = useState("");
    const [scoreFilterCompany, setScoreFilterCompany] = useState(""); // "", "ASM", "NON-ASM"
    const [scoreSortField, setScoreSortField] = useState("Date");
    const [scoreSortAsc, setScoreSortAsc] = useState(false);

    // Quiz Excel upload
    const quizExcelInputRef = useRef(null);
    const [quizUploadStatus, setQuizUploadStatus] = useState(null);

    // Mitra state
    const [mitraList, setMitraList] = useState([]);
    const [mitraPage, setMitraPage] = useState(1);
    const [selectedMitra, setSelectedMitra] = useState([]);
    const mitraFileRef = useRef(null);

    // Pega Sync state
    const [pegaLessons, setPegaLessons] = useState([]);
    const [pegaSelectedLesson, setPegaSelectedLesson] = useState("");
    const [pegaScores, setPegaScores] = useState([]);
    const [pegaSelectedScores, setPegaSelectedScores] = useState([]);
    const [pegaSyncResult, setPegaSyncResult] = useState(null);
    const [pegaLoading, setPegaLoading] = useState(false);

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

    const fetchMitra = async () => {
        try {
            const res = await fetch("/api/admin/mitra", { headers: { Authorization: authHeader } });
            const data = await res.json();
            if (data.success) setMitraList(data.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (isLoggedIn) {
            fetchQuizzes();
            fetchLessons();
            fetchPrograms();
            fetchProgramSiswa();
            fetchScoreDetails();
            fetchMitra();
            fetchPegaLessons();
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

    // Helper function to filter and sort score details
    const getFilteredSortedScores = () => {
        let filtered = [...scoreDetails];

        // Apply filters
        if (scoreFilterLogin) {
            filtered = filtered.filter(s =>
                s.Login?.toLowerCase().includes(scoreFilterLogin.toLowerCase())
            );
        }
        if (scoreFilterLesson) {
            filtered = filtered.filter(s =>
                s.Lesson?.toLowerCase().includes(scoreFilterLesson.toLowerCase())
            );
        }
        if (scoreFilterGrade) {
            filtered = filtered.filter(s => s.Grade === scoreFilterGrade);
        }
        // Filter by company (ASM / NON-ASM)
        if (scoreFilterCompany === "ASM") {
            filtered = filtered.filter(s => s.Company === "ASM");
        } else if (scoreFilterCompany === "NON-ASM") {
            filtered = filtered.filter(s => s.Company !== "ASM");
        }

        // Apply sort
        filtered.sort((a, b) => {
            let valA, valB;
            if (scoreSortField === "Score") {
                valA = parseFloat(a.Score) || 0;
                valB = parseFloat(b.Score) || 0;
            } else if (scoreSortField === "Date") {
                valA = new Date(a.Date + " " + (a.SubmitTime || "00:00")).getTime() || 0;
                valB = new Date(b.Date + " " + (b.SubmitTime || "00:00")).getTime() || 0;
            } else {
                valA = a[scoreSortField] || "";
                valB = b[scoreSortField] || "";
            }

            if (scoreSortAsc) {
                return valA > valB ? 1 : valA < valB ? -1 : 0;
            } else {
                return valA < valB ? 1 : valA > valB ? -1 : 0;
            }
        });

        return filtered;
    };

    const clearScoreFilters = () => {
        setScoreFilterLogin("");
        setScoreFilterLesson("");
        setScoreFilterGrade("");
        setScoreFilterCompany("");
        setScorePage(1);
    };

    const toggleScoreSort = (field) => {
        if (scoreSortField === field) {
            setScoreSortAsc(!scoreSortAsc);
        } else {
            setScoreSortField(field);
            setScoreSortAsc(false);
        }
    };

    // Quiz Excel Upload Handler
    const handleQuizExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setQuizUploadStatus({ loading: true });

        try {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const wb = XLSX.read(evt.target.result, { type: "binary" });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const data = XLSX.utils.sheet_to_json(ws);

                    // Convert Excel rows to questions format
                    const newQuestions = data.map(row => {
                        // Get correct answer index (A=0, B=1, C=2, D=3)
                        const correctLetter = (row.Correct_Answer || row.CorrectAnswer || "A").toUpperCase();
                        const correctIndex = { "A": 0, "B": 1, "C": 2, "D": 3 }[correctLetter] || 0;

                        return {
                            question: row.Question || row.question || "",
                            options: [
                                row.Option_A || row.OptionA || "",
                                row.Option_B || row.OptionB || "",
                                row.Option_C || row.OptionC || "",
                                row.Option_D || row.OptionD || "",
                            ],
                            correctAnswer: correctIndex,
                        };
                    }).filter(q => q.question); // Remove empty questions

                    setQuestions(newQuestions);
                    setQuizUploadStatus({ success: true, imported: newQuestions.length });
                } catch (err) {
                    setQuizUploadStatus({ success: false, error: err.message });
                }
            };
            reader.readAsBinaryString(file);
        } catch (err) {
            setQuizUploadStatus({ success: false, error: err.message });
        }
        e.target.value = "";
    };

    const downloadQuizTemplate = () => {
        const template = [
            { No: 1, Question: "Apa itu Safety?", Option_A: "Jawaban A", Option_B: "Jawaban B", Option_C: "Jawaban C", Option_D: "Jawaban D", Correct_Answer: "A" },
            { No: 2, Question: "Kapan inspeksi dilakukan?", Option_A: "Jawaban A", Option_B: "Jawaban B", Option_C: "Jawaban C", Option_D: "Jawaban D", Correct_Answer: "C" },
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "template_quiz_soal.xlsx");
    };

    // Mitra functions
    const handleMitraExcelUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const wb = XLSX.read(evt.target.result, { type: "binary" });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const data = XLSX.utils.sheet_to_json(ws);

                    // Map Excel rows to mitra format
                    const mitraData = data.map(row => ({
                        login: row.Login || row.login || "",
                        nama: row.Nama || row.nama || "",
                        cabang: row.Cabang || row.cabang || "",
                        divisi: row.Divisi || row.divisi || "",
                        departemen: row.Departemen || row.departemen || "",
                        namaAtasan: row.NamaAtasan || row.Nama_Atasan || row.namaAtasan || "",
                    })).filter(m => m.login);

                    const res = await fetch("/api/admin/mitra", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: authHeader },
                        body: JSON.stringify({ bulk: mitraData }),
                    });
                    const result = await res.json();
                    if (result.success) {
                        alert(`Berhasil import ${result.saved} mitra`);
                        fetchMitra();
                    } else {
                        alert("Gagal import: " + result.error);
                    }
                } catch (err) {
                    alert("Error: " + err.message);
                }
            };
            reader.readAsBinaryString(file);
        } catch (err) {
            alert("Error: " + err.message);
        }
        e.target.value = "";
    };

    const downloadMitraTemplate = () => {
        const template = [
            { Login: "user1@email.com", Nama: "John Doe", Cabang: "Jakarta", Divisi: "IT", Departemen: "Development", NamaAtasan: "Jane Smith" },
            { Login: "user2@email.com", Nama: "Alice Bob", Cabang: "Surabaya", Divisi: "HR", Departemen: "Recruitment", NamaAtasan: "Charlie Brown" },
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "MitraTemplate");
        XLSX.writeFile(wb, "template_mitra.xlsx");
    };

    const deleteMitraHandler = async (login) => {
        if (!confirm(`Hapus mitra ${login}?`)) return;
        const res = await fetch("/api/admin/mitra", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify({ login }),
        });
        if ((await res.json()).success) { alert("Dihapus!"); fetchMitra(); }
    };

    const bulkDeleteMitra = async () => {
        if (!confirm(`Hapus ${selectedMitra.length} mitra terpilih?`)) return;
        for (const login of selectedMitra) {
            await fetch("/api/admin/mitra", {
                method: "DELETE",
                headers: { "Content-Type": "application/json", Authorization: authHeader },
                body: JSON.stringify({ login }),
            });
        }
        setSelectedMitra([]);
        fetchMitra();
    };

    const exportMitra = () => {
        const ws = XLSX.utils.json_to_sheet(mitraList);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mitra");
        XLSX.writeFile(wb, "mitra_list.xlsx");
    };

    // Pega Sync functions
    const fetchPegaLessons = async () => {
        try {
            const res = await fetch("/api/admin/pega-sync", { headers: { Authorization: authHeader } });
            const data = await res.json();
            if (data.success) {
                setPegaLessons(data.lessons || []);
            }
        } catch (e) { console.error(e); }
    };

    const fetchPegaScores = async (lesson) => {
        if (!lesson) {
            setPegaScores([]);
            return;
        }
        try {
            const res = await fetch(`/api/admin/pega-sync?lesson=${encodeURIComponent(lesson)}`, {
                headers: { Authorization: authHeader }
            });
            const data = await res.json();
            if (data.success) {
                setPegaScores(data.data || []);
                setPegaSelectedScores([]);
                setPegaSyncResult(null);
            }
        } catch (e) { console.error(e); }
    };

    const syncToPega = async () => {
        if (pegaSelectedScores.length === 0) {
            alert("Pilih minimal 1 data untuk dikirim");
            return;
        }

        setPegaLoading(true);
        setPegaSyncResult(null);

        try {
            const scoresToSend = pegaScores.filter((_, idx) => pegaSelectedScores.includes(idx));

            const res = await fetch("/api/admin/pega-sync", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: authHeader },
                body: JSON.stringify({ scores: scoresToSend }),
            });

            const data = await res.json();
            setPegaSyncResult(data);

            // Refresh scores to show updated sync status
            if (pegaSelectedLesson) {
                fetchPegaScores(pegaSelectedLesson);
            }
        } catch (e) {
            console.error(e);
            setPegaSyncResult({ error: e.message });
        } finally {
            setPegaLoading(false);
        }
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
        // Determine quiz name: custom or from lesson
        const quizName = useCustomName ? customQuizName.trim() : selectedLesson?.nama;
        if (!quizName || questions.length === 0) return alert(useCustomName ? "Isi nama quiz dan tambah soal" : "Pilih lesson dan tambah soal");
        if (!startDate || !endDate) return alert("Tanggal wajib diisi");
        if (targetCompanies.length === 0) return alert("Pilih minimal satu target company");
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/quiz", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: authHeader },
                body: JSON.stringify({
                    lessonName: quizName,
                    lessonData: useCustomName ? { nama: quizName, section: "CUSTOM" } : selectedLesson,
                    timerMinutes,
                    startDate,
                    endDate,
                    isActive: true,
                    questions,
                    targetCompanies
                }),
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
        // Check if custom name (section === CUSTOM)
        const isCustom = quiz.lessonData?.section === "CUSTOM";
        setUseCustomName(isCustom);
        if (isCustom) {
            setCustomQuizName(quiz.lessonName);
            setSelectedLesson(null);
            setLessonSearch("");
        } else {
            setSelectedLesson({ nama: quiz.lessonName, ...quiz.lessonData });
            setLessonSearch(quiz.lessonName);
            setCustomQuizName("");
        }
        setTimerMinutes(quiz.timerMinutes);
        setStartDate(quiz.startDate || "");
        setEndDate(quiz.endDate || "");
        setQuestions(quiz.questions);
        setTargetCompanies(quiz.targetCompanies || ["ASM", "SISWA", "SRNM", "SASI", "MITRA"]);
        setEditMode(true);
    };

    const resetQuizForm = () => {
        setSelectedLesson(null);
        setTimerMinutes(30);
        setStartDate("");
        setEndDate("");
        setQuestions([]);
        setEditMode(false);
        setUseCustomName(false);
        setCustomQuizName("");
        setTargetCompanies(["ASM", "SISWA", "SRNM", "SASI", "MITRA"]);
        setLessonSearch("");
        setQuizUploadStatus(null);
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
                    <button className={activeTab === "mitra" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("mitra")}>Master Mitra</button>
                    <button className={activeTab === "pega" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("pega")}>Sync Pega</button>
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

                            {/* Mode Toggle: Lesson or Custom Name */}
                            <div className={styles.formGroup} style={{ marginBottom: "16px" }}>
                                <label style={{ marginBottom: "8px", display: "block" }}>Mode:</label>
                                <div style={{ display: "flex", gap: "16px" }}>
                                    <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                                        <input type="radio" checked={!useCustomName} onChange={() => setUseCustomName(false)} />
                                        Pilih dari Lesson
                                    </label>
                                    <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                                        <input type="radio" checked={useCustomName} onChange={() => setUseCustomName(true)} />
                                        Nama Custom
                                    </label>
                                </div>
                            </div>

                            {/* Conditional: Lesson Dropdown OR Custom Name Input */}
                            {!useCustomName ? (
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
                            ) : (
                                <div className={styles.formGroup}>
                                    <label>Nama Quiz:</label>
                                    <input
                                        placeholder="Ketik nama quiz..."
                                        value={customQuizName}
                                        onChange={(e) => setCustomQuizName(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Target Companies Checkboxes */}
                            <div className={styles.formGroup} style={{ marginBottom: "16px" }}>
                                <label style={{ marginBottom: "8px", display: "block" }}>Target Company:</label>
                                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                                    {["ASM", "SISWA", "SRNM", "SASI", "MITRA"].map(company => (
                                        <label key={company} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                                            <input
                                                type="checkbox"
                                                checked={targetCompanies.includes(company)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setTargetCompanies([...targetCompanies, company]);
                                                    } else {
                                                        setTargetCompanies(targetCompanies.filter(c => c !== company));
                                                    }
                                                }}
                                            />
                                            {company}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.formRow}><div className={styles.formGroup}><label>Timer (menit):</label><input type="number" value={timerMinutes} onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 30)} min={1} /></div></div>
                            <div className={styles.formRow}><div className={styles.formGroup}><label>Mulai:</label><input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div><div className={styles.formGroup}><label>Selesai:</label><input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div></div>
                            <div className={styles.questions}><h3>Soal ({questions.length})</h3>{questions.map((q, i) => (<div key={i} className={styles.questionCard}><div className={styles.questionHeader}><span>Soal {i + 1}</span><button onClick={() => removeQuestion(i)}>×</button></div><input placeholder="Pertanyaan" value={q.question} onChange={(e) => updateQuestion(i, "question", e.target.value)} /><div className={styles.options}>{q.options.map((opt, j) => (<div key={j} className={styles.optionRow}><input type="radio" name={`correct-${i}`} checked={q.correctAnswer === j} onChange={() => updateQuestion(i, "correctAnswer", j)} /><input placeholder={`Opsi ${String.fromCharCode(65 + j)}`} value={opt} onChange={(e) => updateQuestion(i, `option${j}`, e.target.value)} /></div>))}</div></div>))}<button onClick={addQuestion} className={styles.addBtn}>+ Tambah Soal</button></div>

                            {/* Excel Upload for Quiz Questions */}
                            <div className={styles.formGroup} style={{ marginTop: "20px", padding: "16px", background: "#f0f9ff", borderRadius: "8px", border: "2px dashed #667eea" }}>
                                <label style={{ fontWeight: 600, color: "#374151" }}>Upload Soal dari Excel:</label>
                                <div className={styles.formRow} style={{ marginTop: "8px" }}>
                                    <input type="file" accept=".xlsx,.xls" ref={quizExcelInputRef} onChange={handleQuizExcelUpload} style={{ flex: 1 }} />
                                    <button onClick={downloadQuizTemplate} className={styles.addBtn}>Download Template</button>
                                </div>
                                {quizUploadStatus && quizUploadStatus.loading && <div style={{ color: "#667eea", marginTop: "8px" }}>Memproses...</div>}
                                {quizUploadStatus && !quizUploadStatus.loading && (
                                    <div style={{ marginTop: "8px", color: quizUploadStatus.success ? "#10b981" : "#dc2626" }}>
                                        {quizUploadStatus.success ? `✓ Berhasil import ${quizUploadStatus.imported} soal` : `✗ Error: ${quizUploadStatus.error}`}
                                    </div>
                                )}
                            </div>

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
                                <h2>Score Detail ({getFilteredSortedScores().length} dari {scoreDetails.length})</h2>
                                <div className={styles.actionBtns}>
                                    <button onClick={() => {
                                        const ws = XLSX.utils.json_to_sheet(getFilteredSortedScores());
                                        const wb = XLSX.utils.book_new();
                                        XLSX.utils.book_append_sheet(wb, ws, "ScoreDetails");
                                        XLSX.writeFile(wb, "score_details.xlsx");
                                    }} className={styles.addBtn}>Export Excel</button>
                                    {selectedScores.length > 0 && <button onClick={bulkDeleteScores} style={{ background: "#dc2626", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Hapus {selectedScores.length} Terpilih</button>}
                                </div>
                            </div>

                            {/* Filter Bar */}
                            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
                                <div style={{ flex: "1", minWidth: "150px" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "4px", color: "#6b7280" }}>Filter Login:</label>
                                    <input
                                        type="text"
                                        placeholder="Cari login..."
                                        value={scoreFilterLogin}
                                        onChange={(e) => { setScoreFilterLogin(e.target.value); setScorePage(1); }}
                                        style={{ width: "100%", padding: "8px 12px", border: "2px solid #e5e7eb", borderRadius: "6px" }}
                                    />
                                </div>
                                <div style={{ flex: "1", minWidth: "150px" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "4px", color: "#6b7280" }}>Filter Lesson:</label>
                                    <input
                                        type="text"
                                        placeholder="Cari lesson..."
                                        value={scoreFilterLesson}
                                        onChange={(e) => { setScoreFilterLesson(e.target.value); setScorePage(1); }}
                                        style={{ width: "100%", padding: "8px 12px", border: "2px solid #e5e7eb", borderRadius: "6px" }}
                                    />
                                </div>
                                <div style={{ minWidth: "120px" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "4px", color: "#6b7280" }}>Filter Grade:</label>
                                    <select
                                        value={scoreFilterGrade}
                                        onChange={(e) => { setScoreFilterGrade(e.target.value); setScorePage(1); }}
                                        style={{ width: "100%", padding: "8px 12px", border: "2px solid #e5e7eb", borderRadius: "6px" }}
                                    >
                                        <option value="">Semua</option>
                                        <option value="A+">A+</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                        <option value="E">E</option>
                                    </select>
                                </div>
                                <div style={{ minWidth: "120px" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "4px", color: "#6b7280" }}>Company:</label>
                                    <select
                                        value={scoreFilterCompany}
                                        onChange={(e) => { setScoreFilterCompany(e.target.value); setScorePage(1); }}
                                        style={{ width: "100%", padding: "8px 12px", border: "2px solid #e5e7eb", borderRadius: "6px" }}
                                    >
                                        <option value="">Semua</option>
                                        <option value="ASM">ASM</option>
                                        <option value="NON-ASM">Non-ASM</option>
                                    </select>
                                </div>
                                {(scoreFilterLogin || scoreFilterLesson || scoreFilterGrade || scoreFilterCompany) && (
                                    <button
                                        onClick={clearScoreFilters}
                                        style={{ padding: "8px 16px", background: "#6b7280", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {/* Sort Buttons */}
                            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                                <span style={{ color: "#6b7280", fontSize: "0.85rem", alignSelf: "center" }}>Sort:</span>
                                <button
                                    onClick={() => toggleScoreSort("Date")}
                                    style={{
                                        padding: "6px 12px",
                                        background: scoreSortField === "Date" ? "#667eea" : "#e5e7eb",
                                        color: scoreSortField === "Date" ? "white" : "#374151",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "0.85rem"
                                    }}
                                >
                                    Date {scoreSortField === "Date" ? (scoreSortAsc ? "↑" : "↓") : ""}
                                </button>
                                <button
                                    onClick={() => toggleScoreSort("Score")}
                                    style={{
                                        padding: "6px 12px",
                                        background: scoreSortField === "Score" ? "#667eea" : "#e5e7eb",
                                        color: scoreSortField === "Score" ? "white" : "#374151",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "0.85rem"
                                    }}
                                >
                                    Score {scoreSortField === "Score" ? (scoreSortAsc ? "↑" : "↓") : ""}
                                </button>
                                <button
                                    onClick={() => toggleScoreSort("Login")}
                                    style={{
                                        padding: "6px 12px",
                                        background: scoreSortField === "Login" ? "#667eea" : "#e5e7eb",
                                        color: scoreSortField === "Login" ? "white" : "#374151",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "0.85rem"
                                    }}
                                >
                                    Login {scoreSortField === "Login" ? (scoreSortAsc ? "↑" : "↓") : ""}
                                </button>
                            </div>

                            {getFilteredSortedScores().length === 0 ? <p>Belum ada data</p> : (
                                <>
                                    <table className={styles.table}>
                                        <thead><tr><th><input type="checkbox" checked={selectedScores.length === getFilteredSortedScores().length && getFilteredSortedScores().length > 0} onChange={(e) => setSelectedScores(e.target.checked ? getFilteredSortedScores().map(s => `${s.Login}|||${s.Lesson}`) : [])} /></th><th>Date</th><th>Time</th><th>Login</th><th>Lesson</th><th>Score</th><th>Grade</th><th>Program</th><th>Batch</th><th>Aksi</th></tr></thead>
                                        <tbody>{paginate(getFilteredSortedScores(), scorePage).map((s, i) => (
                                            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                                                <td><input type="checkbox" checked={selectedScores.includes(`${s.Login}|||${s.Lesson}`)} onChange={(e) => setSelectedScores(e.target.checked ? [...selectedScores, `${s.Login}|||${s.Lesson}`] : selectedScores.filter(x => x !== `${s.Login}|||${s.Lesson}`))} /></td>
                                                <td>{s.Date}</td>
                                                <td>{s.SubmitTime}</td>
                                                <td style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis" }}>{s.Login}</td>
                                                <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }} title={s.Lesson}>{s.Lesson}</td>
                                                <td><strong>{s.Score}</strong></td>
                                                <td><span style={{
                                                    padding: "2px 8px",
                                                    borderRadius: "4px",
                                                    fontSize: "0.8rem",
                                                    fontWeight: "600",
                                                    background: s.Grade === "A+" || s.Grade === "A" ? "#d1fae5" : s.Grade === "B" ? "#dbeafe" : s.Grade === "C" ? "#fef3c7" : "#fee2e2",
                                                    color: s.Grade === "A+" || s.Grade === "A" ? "#047857" : s.Grade === "B" ? "#1d4ed8" : s.Grade === "C" ? "#b45309" : "#dc2626"
                                                }}>{s.Grade || s.Description}</span></td>
                                                <td>{s.NamaProgram}</td>
                                                <td>{s.Batch}</td>
                                                <td><button onClick={() => deleteScoreDetailHandler(s.Login, s.Lesson)}>Hapus</button></td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                    {getFilteredSortedScores().length > ITEMS_PER_PAGE && (
                                        <div className={styles.pagination}>
                                            <button disabled={scorePage === 1} onClick={() => setScorePage(p => p - 1)}>« Prev</button>
                                            <span>Halaman {scorePage} dari {getTotalPages(getFilteredSortedScores())}</span>
                                            <button disabled={scorePage >= getTotalPages(getFilteredSortedScores())} onClick={() => setScorePage(p => p + 1)}>Next »</button>
                                        </div>
                                    )}
                                </>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === "mitra" && (
                    <div className={styles.content}>
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>Master Mitra Kerja ({mitraList.length})</h2>
                                <div className={styles.actionBtns}>
                                    <button onClick={exportMitra} className={styles.addBtn}>Export Excel</button>
                                    {selectedMitra.length > 0 && <button onClick={bulkDeleteMitra} style={{ background: "#dc2626", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Hapus {selectedMitra.length} Terpilih</button>}
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Upload Excel (Login, Nama, Cabang, Divisi, Departemen, NamaAtasan):</label>
                                <div className={styles.formRow}>
                                    <input type="file" accept=".xlsx,.xls" ref={mitraFileRef} onChange={handleMitraExcelUpload} style={{ flex: 1 }} />
                                    <button onClick={downloadMitraTemplate} className={styles.addBtn}>Download Template</button>
                                </div>
                            </div>
                            {mitraList.length === 0 ? <p>Belum ada data mitra</p> : (
                                <>
                                    <table className={styles.table}>
                                        <thead><tr><th><input type="checkbox" checked={selectedMitra.length === mitraList.length && mitraList.length > 0} onChange={(e) => setSelectedMitra(e.target.checked ? mitraList.map(m => m.Login) : [])} /></th><th>Login</th><th>Nama</th><th>Cabang</th><th>Divisi</th><th>Departemen</th><th>Nama Atasan</th><th>Aksi</th></tr></thead>
                                        <tbody>{paginate(mitraList, mitraPage).map((m, i) => (
                                            <tr key={i}><td><input type="checkbox" checked={selectedMitra.includes(m.Login)} onChange={(e) => setSelectedMitra(e.target.checked ? [...selectedMitra, m.Login] : selectedMitra.filter(x => x !== m.Login))} /></td><td>{m.Login}</td><td>{m.Nama}</td><td>{m.Cabang}</td><td>{m.Divisi}</td><td>{m.Departemen}</td><td>{m.NamaAtasan}</td><td><button onClick={() => deleteMitraHandler(m.Login)}>Hapus</button></td></tr>
                                        ))}</tbody>
                                    </table>
                                    <div className={styles.pagination}>
                                        <button disabled={mitraPage === 1} onClick={() => setMitraPage(p => p - 1)}>« Prev</button>
                                        <span>Halaman {mitraPage} dari {getTotalPages(mitraList)}</span>
                                        <button disabled={mitraPage >= getTotalPages(mitraList)} onClick={() => setMitraPage(p => p + 1)}>Next »</button>
                                    </div>
                                </>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === "pega" && (
                    <div className={styles.content}>
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>Sync Score ke Pega</h2>
                            </div>

                            {/* Quiz/Lesson Dropdown */}
                            <div className={styles.formGroup}>
                                <label>Pilih Quiz/Lesson:</label>
                                <div className={styles.formRow}>
                                    <select
                                        value={pegaSelectedLesson}
                                        onChange={(e) => {
                                            setPegaSelectedLesson(e.target.value);
                                            fetchPegaScores(e.target.value);
                                        }}
                                        style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                                    >
                                        <option value="">-- Pilih Lesson --</option>
                                        {pegaLessons.map((lesson, i) => (
                                            <option key={i} value={lesson}>{lesson}</option>
                                        ))}
                                    </select>
                                    <button onClick={() => fetchPegaScores(pegaSelectedLesson)} className={styles.addBtn} disabled={!pegaSelectedLesson}>Refresh</button>
                                </div>
                            </div>

                            {/* Scores Preview Table */}
                            {pegaScores.length > 0 && (
                                <>
                                    <div className={styles.formGroup} style={{ marginTop: "20px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                            <span>Data Score ({pegaScores.length})</span>
                                            <div style={{ display: "flex", gap: "10px" }}>
                                                <button
                                                    onClick={syncToPega}
                                                    disabled={pegaLoading || pegaSelectedScores.length === 0}
                                                    style={{
                                                        background: pegaLoading ? "#9ca3af" : "#10b981",
                                                        color: "white",
                                                        border: "none",
                                                        padding: "10px 20px",
                                                        borderRadius: "6px",
                                                        cursor: pegaLoading ? "wait" : "pointer",
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {pegaLoading ? "Mengirim..." : `Kirim ${pegaSelectedScores.length} Terpilih ke Pega`}
                                                </button>
                                            </div>
                                        </div>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th><input type="checkbox" checked={pegaSelectedScores.length === pegaScores.length && pegaScores.length > 0} onChange={(e) => setPegaSelectedScores(e.target.checked ? pegaScores.map((_, i) => i) : [])} /></th>
                                                    <th>No</th>
                                                    <th>Status</th>
                                                    <th>Login</th>
                                                    <th>Batch</th>
                                                    <th>Program</th>
                                                    <th>Section</th>
                                                    <th>Score</th>
                                                    <th>Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pegaScores.map((s, i) => (
                                                    <tr key={i} style={{ background: s.pegaSyncStatus === "success" ? "#d1fae5" : s.pegaSyncStatus === "failed" ? "#fee2e2" : "inherit" }}>
                                                        <td><input type="checkbox" checked={pegaSelectedScores.includes(i)} onChange={(e) => setPegaSelectedScores(e.target.checked ? [...pegaSelectedScores, i] : pegaSelectedScores.filter(x => x !== i))} /></td>
                                                        <td>{i + 1}</td>
                                                        <td>
                                                            {s.pegaSyncStatus === "success" && <span style={{ color: "#059669" }}>🟢 Synced</span>}
                                                            {s.pegaSyncStatus === "failed" && <span style={{ color: "#dc2626" }} title={s.pegaSyncError}>🔴 Failed</span>}
                                                            {!s.pegaSyncStatus && <span style={{ color: "#9ca3af" }}>⚪ Pending</span>}
                                                        </td>
                                                        <td>{s.Login}</td>
                                                        <td>{s.Batch}</td>
                                                        <td>{s.NamaProgram}</td>
                                                        <td>{s.Section}</td>
                                                        <td>{s.Score}</td>
                                                        <td>{s.Date}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}

                            {pegaSelectedLesson && pegaScores.length === 0 && (
                                <p style={{ marginTop: "20px", color: "#6b7280" }}>Tidak ada data score untuk lesson ini</p>
                            )}

                            {/* Sync Results */}
                            {pegaSyncResult && (
                                <div style={{ marginTop: "20px", padding: "16px", borderRadius: "8px", background: pegaSyncResult.error ? "#fee2e2" : "#f0fdf4", border: `1px solid ${pegaSyncResult.error ? "#fecaca" : "#bbf7d0"}` }}>
                                    {pegaSyncResult.error ? (
                                        <p style={{ color: "#dc2626" }}>Error: {pegaSyncResult.error}</p>
                                    ) : (
                                        <>
                                            <p style={{ fontWeight: 600, marginBottom: "10px" }}>
                                                Hasil Sync: <span style={{ color: "#059669" }}>{pegaSyncResult.successCount} Berhasil</span> | <span style={{ color: "#dc2626" }}>{pegaSyncResult.failedCount} Gagal</span>
                                            </p>
                                            {pegaSyncResult.results?.failed?.length > 0 && (
                                                <div style={{ marginTop: "10px" }}>
                                                    <p style={{ fontWeight: 600, color: "#dc2626", marginBottom: "5px" }}>Detail Gagal:</p>
                                                    <table className={styles.table}>
                                                        <thead><tr><th>Row</th><th>Login</th><th>Error</th></tr></thead>
                                                        <tbody>
                                                            {pegaSyncResult.results.failed.map((f, i) => (
                                                                <tr key={i} style={{ background: "#fee2e2" }}>
                                                                    <td>{f.row}</td>
                                                                    <td>{f.login}</td>
                                                                    <td>{f.error}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}

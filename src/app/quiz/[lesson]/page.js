"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import styles from "./page.module.css";

export default function QuizPage() {
    const router = useRouter();
    const params = useParams();
    const lessonName = decodeURIComponent(params.lesson);

    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    // Get user data from sessionStorage
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const data = sessionStorage.getItem("siswaData");
        if (!data) {
            router.push("/");
            return;
        }
        setUserData(JSON.parse(data));
    }, [router]);

    // Fetch quiz
    useEffect(() => {
        async function fetchQuiz() {
            try {
                const res = await fetch(`/api/quiz?lesson=${encodeURIComponent(lessonName)}`);
                const data = await res.json();

                if (data.success) {
                    setQuiz(data.data);
                    setAnswers(new Array(data.data.questions.length).fill(null));
                    setTimeLeft(data.data.timerMinutes * 60);
                } else {
                    setError(data.error || "Quiz tidak ditemukan");
                }
            } catch (e) {
                setError("Gagal memuat quiz");
            }
            setLoading(false);
        }

        if (lessonName) fetchQuiz();
    }, [lessonName]);

    // Submit handler
    const submitQuiz = useCallback(async () => {
        if (isSubmitting || result) return;
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/quiz/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lessonName,
                    answers,
                    login: userData?.Login || userData?.NIS || "UNKNOWN",
                    userData,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setResult(data.result);
            } else {
                alert("Gagal submit: " + data.error);
            }
        } catch (e) {
            alert("Error: " + e.message);
        }
        setIsSubmitting(false);
    }, [isSubmitting, result, lessonName, answers, userData]);

    // Timer
    useEffect(() => {
        if (!quiz || result) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    submitQuiz();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [quiz, result, submitQuiz]);

    const selectAnswer = (answerIndex) => {
        const updated = [...answers];
        updated[currentQ] = answerIndex;
        setAnswers(updated);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    if (loading) {
        return (
            <main className={styles.main}>
                <div className={styles.loading}>Memuat quiz...</div>
            </main>
        );
    }

    if (error) {
        return (
            <main className={styles.main}>
                <div className={styles.errorBox}>
                    <h2>⚠️ Error</h2>
                    <p>{error}</p>
                    <button onClick={() => router.push("/form")}>Kembali</button>
                </div>
            </main>
        );
    }

    if (result) {
        return (
            <main className={styles.main}>
                <div className={styles.resultBox}>
                    <h1>Hasil Quiz</h1>
                    <div className={styles.resultScore}>{result.score}</div>
                    <div className={styles.resultGrade}>{result.grade}</div>
                    <p>{result.gradeDesc}</p>
                    <p className={styles.resultDetail}>
                        Benar: {result.correct} / {result.total}
                    </p>
                    <button onClick={() => router.push("/form")}>Kembali ke Form</button>
                </div>
            </main>
        );
    }

    const q = quiz.questions[currentQ];

    return (
        <main className={styles.main}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.lessonName}>{lessonName}</div>
                    <div className={`${styles.timer} ${timeLeft < 60 ? styles.timerWarning : ""}`}>
                        ⏱️ {formatTime(timeLeft)}
                    </div>
                </div>

                <div className={styles.progress}>
                    Soal {currentQ + 1} dari {quiz.questions.length}
                </div>

                <div className={styles.questionBox}>
                    <h2>{q.question}</h2>
                    <div className={styles.options}>
                        {q.options.map((opt, i) => (
                            <button
                                key={i}
                                className={`${styles.option} ${answers[currentQ] === i ? styles.selected : ""}`}
                                onClick={() => selectAnswer(i)}
                            >
                                <span className={styles.optLabel}>{String.fromCharCode(65 + i)}</span>
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.navigation}>
                    <button
                        onClick={() => setCurrentQ((c) => c - 1)}
                        disabled={currentQ === 0}
                    >
                        ← Sebelumnya
                    </button>

                    {currentQ < quiz.questions.length - 1 ? (
                        <button onClick={() => setCurrentQ((c) => c + 1)}>
                            Selanjutnya →
                        </button>
                    ) : (
                        <button
                            onClick={submitQuiz}
                            className={styles.submitBtn}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Mengirim..." : "Submit Quiz"}
                        </button>
                    )}
                </div>

                <div className={styles.questionNav}>
                    {quiz.questions.map((_, i) => (
                        <button
                            key={i}
                            className={`${styles.qBtn} ${currentQ === i ? styles.qBtnActive : ""} ${answers[i] !== null ? styles.qBtnAnswered : ""}`}
                            onClick={() => setCurrentQ(i)}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            </div>
        </main>
    );
}

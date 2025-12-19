import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration: 300 virtual users for 60 seconds
export let options = {
    stages: [
        { duration: '10s', target: 100 },  // Ramp up to 100 users
        { duration: '20s', target: 400 },  // Ramp up to 400 users
        { duration: '30s', target: 400 },  // Stay at 400 users
        { duration: '10s', target: 0 },    // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'], // 95% requests < 2s
        http_req_failed: ['rate<0.1'],     // Error rate < 10%
    },
};

// GANTI dengan URL Vercel Anda setelah deploy
const BASE_URL = 'https://cendekia-form.vercel.app/';

export default function () {
    // Test 1: Load login page
    let loginPage = http.get(`${BASE_URL}/`);
    check(loginPage, {
        'login page status 200': (r) => r.status === 200,
    });

    sleep(1);

    // Test 2: Load form page (simulating logged user)
    let formPage = http.get(`${BASE_URL}/form`);
    check(formPage, {
        'form page status 200 or redirect': (r) => r.status === 200 || r.status === 307,
    });

    sleep(1);

    // Test 3: Get active quizzes
    let quizzes = http.get(`${BASE_URL}/api/quiz/active`);
    check(quizzes, {
        'quiz API status 200': (r) => r.status === 200,
    });

    sleep(2);
}

/*
CARA PAKAI:
1. Ganti BASE_URL dengan URL Vercel Anda
2. Buka PowerShell di folder ini
3. Jalankan: k6 run loadtest.js
4. Tunggu hasilnya

HASIL YANG DIHARAPKAN:
- http_req_duration avg < 500ms = Bagus
- http_req_failed rate < 10% = Bagus
- Jika banyak error 503 = Perlu upgrade ke Pro
*/
import { NextResponse } from "next/server";
import { getAllScoreDetails, updateScoreSyncStatus } from "@/lib/program-store";

// Pega API configuration
const PEGA_SYNC_API_URL = process.env.PEGA_SYNC_API_URL || "http://pegadev2.sinarmas.co.id/prweb/api/EHC/v1/InsertMasterSiswa";
const PEGA_SYNC_USERNAME = process.env.PEGA_SYNC_USERNAME || "";
const PEGA_SYNC_PASSWORD = process.env.PEGA_SYNC_PASSWORD || "";

// Create Basic Auth header
const getPegaAuthHeader = () => {
    const credentials = Buffer.from(`${PEGA_SYNC_USERNAME}:${PEGA_SYNC_PASSWORD}`).toString("base64");
    return `Basic ${credentials}`;
};

/**
 * GET /api/admin/pega-sync
 * Get all scores grouped by lesson for dropdown
 */
export async function GET(request) {
    try {
        const auth = request.headers.get("authorization");
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const lesson = searchParams.get("lesson");

        const allScores = await getAllScoreDetails();

        if (lesson) {
            // Filter by specific lesson
            const filtered = allScores.filter(s => s.Lesson === lesson);
            return NextResponse.json({ success: true, data: filtered });
        }

        // Get unique lessons for dropdown
        const lessons = [...new Set(allScores.map(s => s.Lesson))].filter(Boolean);
        return NextResponse.json({ success: true, lessons, totalScores: allScores.length });
    } catch (error) {
        console.error("Pega sync GET error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/admin/pega-sync
 * Send selected scores to Pega API
 * Body: { scores: [...] }
 */
export async function POST(request) {
    try {
        const auth = request.headers.get("authorization");
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { scores } = await request.json();

        if (!scores || !Array.isArray(scores) || scores.length === 0) {
            return NextResponse.json({ error: "No scores provided" }, { status: 400 });
        }

        console.log("=== Pega Sync Start ===");
        console.log("Sending", scores.length, "scores to Pega");
        console.log("API URL:", PEGA_SYNC_API_URL);
        console.log("Credentials set:", !!PEGA_SYNC_USERNAME && !!PEGA_SYNC_PASSWORD);

        // Format payload for Pega API
        const payload = {
            ScoreDetailList: scores.map(s => ({
                Login: s.Login || "",
                Batch: s.Batch || "",
                EvaluationYearSequence: s.EvaluationYearSequence || "",
                NamaProgram: s.NamaProgram || "",
                Section: s.Section || "",
                Lesson: s.Lesson || "",
                Score: typeof s.Score === "number" ? s.Score : parseInt(s.Score) || 0,
                Date: s.Date || "",
            })),
        };

        console.log("Payload:", JSON.stringify(payload, null, 2));

        // Call Pega API
        const response = await fetch(PEGA_SYNC_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: getPegaAuthHeader(),
            },
            body: JSON.stringify(payload),
        });

        console.log("Pega Response Status:", response.status);

        const responseData = await response.json();
        console.log("Pega Response:", JSON.stringify(responseData, null, 2));

        // Parse Pega response
        const results = {
            success: [],
            failed: [],
        };

        if (responseData.ResponseList && Array.isArray(responseData.ResponseList)) {
            responseData.ResponseList.forEach((res, index) => {
                const originalScore = scores[index];
                if (res.Status === "Success" || res.Code === "200") {
                    results.success.push({
                        row: index + 1,
                        login: originalScore?.Login || res.Login || "",
                    });
                    // Update sync status in database
                    if (originalScore) {
                        updateScoreSyncStatus(originalScore.Login, originalScore.Lesson, "success");
                    }
                } else {
                    results.failed.push({
                        row: index + 1,
                        login: originalScore?.Login || res.Login || "",
                        error: res.pyStatusMessage || "Unknown error",
                        code: res.Code || "400",
                    });
                    // Update sync status in database
                    if (originalScore) {
                        updateScoreSyncStatus(originalScore.Login, originalScore.Lesson, "failed", res.pyStatusMessage);
                    }
                }
            });
        }

        return NextResponse.json({
            success: true,
            sent: scores.length,
            successCount: results.success.length,
            failedCount: results.failed.length,
            results,
        });
    } catch (error) {
        console.error("Pega sync POST error:", error);
        return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 });
    }
}

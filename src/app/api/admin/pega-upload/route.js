import { NextResponse } from "next/server";
import { savePegaCurriculumData, getAllPegaCurriculum } from "@/lib/pega-upload-store";

// Admin credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "WIDJ47@GMAIL.COM";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "@ASMHCD2025";

function verifyAdmin(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return false;
    try {
        const base64 = authHeader.replace("Basic ", "");
        const decoded = Buffer.from(base64, "base64").toString("utf-8");
        const colonIndex = decoded.indexOf(":");
        const email = decoded.substring(0, colonIndex);
        const password = decoded.substring(colonIndex + 1);
        return email.toUpperCase() === ADMIN_EMAIL.toUpperCase() && password === ADMIN_PASSWORD;
    } catch {
        return false;
    }
}

export async function GET(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = await getAllPegaCurriculum();
    return NextResponse.json({ success: true, data });
}

export async function POST(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        
        if (!body.data || !Array.isArray(body.data)) {
            return NextResponse.json({ error: "Invalid data format. Expected { data: [...] }" }, { status: 400 });
        }
        
        const result = await savePegaCurriculumData(body.data);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Upload Pega Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

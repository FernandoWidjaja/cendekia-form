import { NextResponse } from "next/server";

const EHC_BASE_URL = process.env.EHC_BASE_URL || "https://hcq.payrollq.id/prweb/api/EHC/v1";
const EHC_DATA_USERNAME = process.env.EHC_DATA_USERNAME || "";
const EHC_DATA_PASSWORD = process.env.EHC_DATA_PASSWORD || "";

/**
 * GET /api/siswa/search?q=keyword
 * Search siswa by Login only (API limitation)
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
        return NextResponse.json({ success: true, data: [] });
    }

    try {
        const credentials = Buffer.from(`${EHC_DATA_USERNAME}:${EHC_DATA_PASSWORD}`).toString("base64");

        const response = await fetch(`${EHC_BASE_URL}/GetDataEHC`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${credentials}`,
            },
            body: JSON.stringify({
                pyCompany: "SISWA",
                ServiceCategory: "EMPLOYEE",
                ServiceMode: "SINGLE",
                Login: query.toUpperCase(),
            }),
        });

        if (!response.ok) {
            return NextResponse.json({ success: true, data: [] });
        }

        const data = await response.json();
        if (data.Status !== "Success" || !data.EmployeeList?.length) {
            return NextResponse.json({ success: true, data: [] });
        }

        const results = data.EmployeeList.map((emp) => ({
            login: emp.Career?.Login || "",
            nama: emp.Career?.Name || "",
            nis: emp.Career?.NIK || "",
        })).filter(r => r.login);

        return NextResponse.json({ success: true, data: results });
    } catch (error) {
        console.error("Siswa search error:", error);
        return NextResponse.json({ success: true, data: [] });
    }
}

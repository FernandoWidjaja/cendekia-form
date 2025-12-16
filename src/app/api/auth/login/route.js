import { NextResponse } from "next/server";
import { getEmployeeData, validatePassword } from "@/lib/ehc-service";

/**
 * POST /api/auth/login
 * Validates employee login and password using 2 API calls
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { login, password } = body;

        // Validate input
        if (!login || !password) {
            return NextResponse.json(
                { success: false, message: "Login dan password wajib diisi" },
                { status: 400 }
            );
        }

        // Step 1: Check if employee exists via GetDataEHC
        const employeeData = await getEmployeeData(login);

        if (!employeeData) {
            return NextResponse.json(
                { success: false, message: "Login tidak ditemukan" },
                { status: 401 }
            );
        }

        // Step 2: Validate password via ValEmpPass
        const isPasswordValid = await validatePassword(login, password);

        if (!isPasswordValid) {
            return NextResponse.json(
                { success: false, message: "Password salah" },
                { status: 401 }
            );
        }

        // Success - return employee data
        return NextResponse.json({
            success: true,
            message: "Login berhasil",
            data: employeeData,
        });
    } catch (error) {
        console.error("Login Error:", error);
        return NextResponse.json(
            { success: false, message: "Terjadi kesalahan pada server" },
            { status: 500 }
        );
    }
}

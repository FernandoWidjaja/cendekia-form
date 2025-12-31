import { NextResponse } from "next/server";
import { getMitra } from "@/lib/mitra-store";

/**
 * POST /api/auth/mitra
 * Validate Mitra login
 * Body: { login }
 */
export async function POST(request) {
    try {
        const { login } = await request.json();

        if (!login) {
            return NextResponse.json(
                { success: false, error: "Login wajib diisi" },
                { status: 400 }
            );
        }

        console.log("=== Mitra Login ===");
        console.log("Login:", login);

        // Check if mitra exists in database
        const mitraData = await getMitra(login);

        if (!mitraData) {
            console.log("Mitra not found:", login);
            return NextResponse.json(
                { success: false, error: "Data Mitra tidak ditemukan. Hubungi HRIS." },
                { status: 404 }
            );
        }

        console.log("Mitra found:", mitraData.Nama);

        // Return mitra data for session
        return NextResponse.json({
            success: true,
            data: {
                NIS: mitraData.Login,
                Nama: mitraData.Nama,
                NamaWilayahStudi: mitraData.Cabang,
                NamaLokasiStudi: mitraData.Cabang,
                NamaProgramPelatihan: mitraData.Divisi,
                NamaPeminatanProgramPelatihan: mitraData.Departemen,
                TanggalMasukSiswa: "-",
                NamaJabatan: mitraData.NamaAtasan,
                Company: "MITRA",
                Login: mitraData.Login,
            },
        });
    } catch (error) {
        console.error("Mitra login error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}

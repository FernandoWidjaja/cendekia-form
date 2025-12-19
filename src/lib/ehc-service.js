/**
 * EHC API Service - Handles calls to external EHC APIs
 * Supports SEPARATE credentials for each API
 */

const EHC_BASE_URL = process.env.EHC_BASE_URL || "https://hcq.payrollq.id/prweb/api/EHC/v1";

// Master SISWA API (different base URL)
const MASTER_SISWA_URL = process.env.MASTER_SISWA_URL || "http://pegadev2.sinarmas.co.id/prweb/api/EHC/v01/MasterSISWA";

// Credentials for GetDataEHC API
const EHC_DATA_USERNAME = process.env.EHC_DATA_USERNAME || "";
const EHC_DATA_PASSWORD = process.env.EHC_DATA_PASSWORD || "";

// Credentials for ValEmpPass API  
const EHC_PASS_USERNAME = process.env.EHC_PASS_USERNAME || "";
const EHC_PASS_PASSWORD = process.env.EHC_PASS_PASSWORD || "";

// Credentials for Master SISWA API
const MASTER_SISWA_USERNAME = process.env.MASTER_SISWA_USERNAME || "";
const MASTER_SISWA_PASSWORD = process.env.MASTER_SISWA_PASSWORD || "";

// Create Basic Auth header for GetDataEHC
const getDataAuthHeader = () => {
    const credentials = Buffer.from(`${EHC_DATA_USERNAME}:${EHC_DATA_PASSWORD}`).toString("base64");
    return `Basic ${credentials}`;
};

// Create Basic Auth header for ValEmpPass
const getPassAuthHeader = () => {
    const credentials = Buffer.from(`${EHC_PASS_USERNAME}:${EHC_PASS_PASSWORD}`).toString("base64");
    return `Basic ${credentials}`;
};

// Create Basic Auth header for Master SISWA
const getMasterAuthHeader = () => {
    const credentials = Buffer.from(`${MASTER_SISWA_USERNAME}:${MASTER_SISWA_PASSWORD}`).toString("base64");
    return `Basic ${credentials}`;
};

/**
 * Get employee data from EHC API
 * Tries multiple companies (SISWA, SRNM, SASI) until a match is found
 * @param {string} loginEmail - Employee login email
 * @returns {Promise<object|null>} - Employee data or null if not found
 */
export async function getEmployeeData(loginEmail) {
    // List of companies to try
    const companies = ["SISWA", "SRNM", "SASI"];

    for (const pyCompany of companies) {
        const payload = {
            pyCompany: pyCompany,
            ServiceCategory: "EMPLOYEE",
            ServiceMode: "SINGLE",
            Login: loginEmail.toUpperCase(),
        };

        try {
            console.log(`Trying GetDataEHC with pyCompany: ${pyCompany}`);

            const response = await fetch(`${EHC_BASE_URL}/GetDataEHC`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: getDataAuthHeader(),
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                console.error(`GetDataEHC FAILED for ${pyCompany} - HTTP ${response.status}`);
                continue; // Try next company
            }

            const data = await response.json();

            if (data.Status !== "Success" || !data.EmployeeList?.length) {
                console.log(`No employee found in ${pyCompany}, trying next...`);
                continue; // Try next company
            }

            // Found employee!
            console.log(`Employee found in company: ${pyCompany}`);
            const employee = data.EmployeeList[0];
            const career = employee.Career || {};

            // Format date from YYYYMMDD to DD/MM/YYYY - using EffectiveDate from Career
            const effectiveDate = career.EffectiveDate || "";
            let formattedDate = "";
            if (effectiveDate && effectiveDate.length === 8) {
                formattedDate = `${effectiveDate.slice(6, 8)}/${effectiveDate.slice(4, 6)}/${effectiveDate.slice(0, 4)}`;
            }

            return {
                NIS: career.NIK || "",
                Nama: career.Name || "",
                NamaWilayahStudi: career.RegionName || "",
                NamaLokasiStudi: career.DetailBranchName || "",
                NamaProgramPelatihan: career.DivisionName || "",
                NamaPeminatanProgramPelatihan: career.DepartmentName || "",
                TanggalMasukSiswa: formattedDate,  // Now uses Career.EffectiveDate
                ProgramSiswa: career.EmpStatusCode || "",
                Company: career.pyCompany || pyCompany, // Use found company
                NamaJabatan: career.PositionName || "",
                StatusSiswa: career.CareerType || "",
                Login: career.Login || "",
                GradeCode: career.GradeCode || "",
                BranchName: career.BranchName || "",
                EffectiveDate: career.EffectiveDate || "",
            };
        } catch (error) {
            console.error(`GetDataEHC Error for ${pyCompany}:`, error);
            continue; // Try next company
        }
    }

    // No employee found in any company
    console.log("Employee not found in any company (SISWA, SRNM, SASI)");
    return null;
}

/**
 * Validate employee password
 * @param {string} login - Employee login email
 * @param {string} password - Employee password
 * @returns {Promise<boolean>} - True if valid, false otherwise
 */
export async function validatePassword(login, password) {
    const payload = {
        Login: login.toUpperCase(),
        String1: password,
    };

    try {
        const response = await fetch(`${EHC_BASE_URL}/ValEmpPass`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: getPassAuthHeader(), // Use ValEmpPass credentials
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // Check if Result is "VALID"
        return data.Result === "VALID";
    } catch (error) {
        console.error("ValEmpPass Error:", error);
        throw error;
    }
}

/**
 * Get master lessons from SISWA API
 * @returns {Promise<Array>} - List of lessons
 */
export async function getMasterLessons() {
    const payload = {
        Type: "Lesson",
        pyCompany: "SISWA",
    };

    try {
        const response = await fetch(MASTER_SISWA_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: getMasterAuthHeader(),
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error(`MasterSISWA FAILED - HTTP ${response.status}`);
            console.error(`Check MASTER_SISWA_USERNAME and MASTER_SISWA_PASSWORD in .env.local`);
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        const lessons = result.data || [];

        // Get unique lesson names and return with full data
        const uniqueLessons = [];
        const seenNames = new Set();

        for (const lesson of lessons) {
            if (lesson.Nama && !seenNames.has(lesson.Nama)) {
                seenNames.add(lesson.Nama);
                uniqueLessons.push({
                    id: lesson.Integer1 + "_" + lesson.Integer2,
                    nama: lesson.Nama.trim(),
                    section: lesson.Section || "",
                    program: lesson.Program || "",
                    trainer: lesson.Trainer || "",
                    kkm: lesson.KKM || "0",
                    sks: lesson.SKS || "0",
                });
            }
        }

        return uniqueLessons;
    } catch (error) {
        console.error("MasterSISWA Error:", error);
        throw error;
    }
}


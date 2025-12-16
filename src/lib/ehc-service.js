/**
 * EHC API Service - Handles calls to external EHC APIs
 */

const EHC_BASE_URL = process.env.EHC_BASE_URL || "https://hcq.payrollq.id/prweb/api/EHC/v1";
const EHC_USERNAME = process.env.EHC_USERNAME || "";
const EHC_PASSWORD = process.env.EHC_PASSWORD || "";

// Create Basic Auth header
const getAuthHeader = () => {
    const credentials = Buffer.from(`${EHC_USERNAME}:${EHC_PASSWORD}`).toString("base64");
    return `Basic ${credentials}`;
};

/**
 * Get employee data from EHC API
 * @param {string} loginEmail - Employee login email
 * @returns {Promise<object|null>} - Employee data or null if not found
 */
export async function getEmployeeData(loginEmail) {
    const payload = {
        pyCompany: "SISWA",
        ServiceCategory: "EMPLOYEE",
        ServiceMode: "SINGLE",
        Login: loginEmail.toUpperCase(),
    };

    try {
        const response = await fetch(`${EHC_BASE_URL}/GetDataEHC`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: getAuthHeader(),
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.Status !== "Success" || !data.EmployeeList?.length) {
            return null;
        }

        const employee = data.EmployeeList[0];
        const career = employee.Career || {};

        // Format date from YYYYMMDD to DD/MM/YYYY
        const dateInGroup = career.DateInGroup || "";
        let formattedDate = "";
        if (dateInGroup && dateInGroup.length === 8) {
            formattedDate = `${dateInGroup.slice(6, 8)}/${dateInGroup.slice(4, 6)}/${dateInGroup.slice(0, 4)}`;
        }

        return {
            NIS: career.NIK || "",
            Nama: career.Name || "",
            NamaWilayahStudi: career.RegionName || "",
            NamaLokasiStudi: career.DetailBranchName || "",
            NamaProgramPelatihan: career.DivisionName || "",
            NamaPeminatanProgramPelatihan: career.DepartmentName || "",
            TanggalMasukSiswa: formattedDate,
            ProgramSiswa: career.EmpStatusCode || "",
            Company: career.pyCompany || "",
            NamaJabatan: career.PositionName || "",
            StatusSiswa: career.CareerType || "",
            Login: career.Login || "",
            GradeCode: career.GradeCode || "",
            BranchName: career.BranchName || "",
        };
    } catch (error) {
        console.error("GetDataEHC Error:", error);
        throw error;
    }
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
                Authorization: getAuthHeader(),
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

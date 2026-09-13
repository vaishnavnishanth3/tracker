import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "finance.xlsx");

export async function ensureWorkbook(): Promise<ExcelJS.Workbook> {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
    const workbook = new ExcelJS.Workbook();
    if (fs.existsSync(FILE)) {
        await workbook.xlsx.readFile(FILE);
        // After reading from disk, ExcelJS doesn't preserve the `columns` metadata (keys/headers).
        // Restore column definitions from the first/header row for known sheets so addRow(obj) works.
        const sheetNames = [
            "investments",
            "checklist",
            "expenses",
            "balances",
            "payslips",
            "settings",
            "earnings",
            "epf",
        ];
        sheetNames.forEach((name) => {
            const sheet = workbook.getWorksheet(name);
            if (!sheet) return;
            const headerRow = sheet.getRow(1);
            if (!headerRow) return;
            const headers: string[] = [];
            headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                headers.push(String(cell.value));
            });
            if (headers.length > 0) {
                sheet.columns = headers.map((h) => ({ header: h, key: h }));
            }
        });
        // Migration: older files predate the investments.compounding column.
        let migrated = false;
        const invSheet = workbook.getWorksheet("investments");
        if (invSheet) {
            const headerRow = invSheet.getRow(1);
            const headers: string[] = [];
            headerRow.eachCell({ includeEmpty: false }, (cell) => {
                headers.push(String(cell.value));
            });
            for (const extra of [
                "compounding",
                "interestRate",
                "customMaturityAmount",
                "currentAmount",
                "debitDay",
                "paidMonths",
            ]) {
                if (headers.length > 0 && !headers.includes(extra)) {
                    headerRow.getCell(headers.length + 1).value = extra;
                    headers.push(extra);
                    migrated = true;
                }
            }
            if (migrated) {
                invSheet.columns = headers.map((h) => ({ header: h, key: h }));
            }
        }
        const paysSheet = workbook.getWorksheet("payslips");
        if (paysSheet) {
            const headerRow = paysSheet.getRow(1);
            const headers: string[] = [];
            headerRow.eachCell({ includeEmpty: false }, (cell) => {
                headers.push(String(cell.value));
            });
            if (headers.length > 0 && !headers.includes("expectedIncome")) {
                headerRow.getCell(headers.length + 1).value = "expectedIncome";
                headers.push("expectedIncome");
                paysSheet.columns = headers.map((h) => ({
                    header: h,
                    key: h,
                }));
                migrated = true;
            }
        }
        // Migration: settings sheet for app-level preferences (e.g. package).
        if (!workbook.getWorksheet("settings")) {
            const settings = workbook.addWorksheet("settings");
            settings.columns = [
                { header: "key", key: "key" },
                { header: "value", key: "value" },
            ];
            migrated = true;
        }
        // Migration: earnings sheet for manually entered income (earned) and
        // income tax paid, keyed by date so summaries can aggregate them.
        if (!workbook.getWorksheet("earnings")) {
            const earnings = workbook.addWorksheet("earnings");
            earnings.columns = [
                { header: "id", key: "id" },
                { header: "date", key: "date" },
                { header: "earned", key: "earned" },
                { header: "tax", key: "tax" },
                { header: "notes", key: "notes" },
            ];
            migrated = true;
        }
        // Migration: epf sheet for Employee Provident Fund monthly details.
        if (!workbook.getWorksheet("epf")) {
            const epf = workbook.addWorksheet("epf");
            epf.columns = [
                { header: "id", key: "id" },
                { header: "month", key: "month" },
                { header: "year", key: "year" },
                { header: "employee", key: "employee" },
                { header: "employer", key: "employer" },
                { header: "notes", key: "notes" },
            ];
            migrated = true;
        }
        if (migrated) {
            await workbook.xlsx.writeFile(FILE);
        }
        return workbook;
    }

    const inv = workbook.addWorksheet("investments");
    inv.columns = [
        { header: "id", key: "id" },
        { header: "name", key: "name" },
        { header: "type", key: "type" },
        { header: "startDate", key: "startDate" },
        { header: "endDate", key: "endDate" },
        { header: "amount", key: "amount" },
        { header: "termYears", key: "termYears" },
        { header: "notes", key: "notes" },
        { header: "compounding", key: "compounding" },
        { header: "interestRate", key: "interestRate" },
        { header: "customMaturityAmount", key: "customMaturityAmount" },
        { header: "currentAmount", key: "currentAmount" },
        { header: "debitDay", key: "debitDay" },
        { header: "paidMonths", key: "paidMonths" },
    ];

    const chk = workbook.addWorksheet("checklist");
    chk.columns = [
        { header: "id", key: "id" },
        { header: "month", key: "month" },
        { header: "year", key: "year" },
        { header: "investmentId", key: "investmentId" },
        { header: "done", key: "done" },
    ];

    const exp = workbook.addWorksheet("expenses");
    exp.columns = [
        { header: "id", key: "id" },
        { header: "date", key: "date" },
        { header: "category", key: "category" },
        { header: "amount", key: "amount" },
        { header: "description", key: "description" },
    ];

    const bal = workbook.addWorksheet("balances");
    bal.columns = [
        { header: "id", key: "id" },
        { header: "month", key: "month" },
        { header: "year", key: "year" },
        { header: "balance", key: "balance" },
    ];

    const pays = workbook.addWorksheet("payslips");
    pays.columns = [
        { header: "id", key: "id" },
        { header: "date", key: "date" },
        { header: "gross", key: "gross" },
        { header: "basic", key: "basic" },
        { header: "hra", key: "hra" },
        { header: "allowances", key: "allowances" },
        { header: "deductions", key: "deductions" },
        { header: "net", key: "net" },
        { header: "notes", key: "notes" },
        { header: "expectedIncome", key: "expectedIncome" },
    ];

    const settings = workbook.addWorksheet("settings");
    settings.columns = [
        { header: "key", key: "key" },
        { header: "value", key: "value" },
    ];

    const earnings = workbook.addWorksheet("earnings");
    earnings.columns = [
        { header: "id", key: "id" },
        { header: "date", key: "date" },
        { header: "earned", key: "earned" },
        { header: "tax", key: "tax" },
        { header: "notes", key: "notes" },
    ];

    const epf = workbook.addWorksheet("epf");
    epf.columns = [
        { header: "id", key: "id" },
        { header: "month", key: "month" },
        { header: "year", key: "year" },
        { header: "employee", key: "employee" },
        { header: "employer", key: "employer" },
        { header: "notes", key: "notes" },
    ];

    await workbook.xlsx.writeFile(FILE);
    return workbook;
}

export async function readSheet(name: string): Promise<any[]> {
    const wb = await ensureWorkbook();
    const sheet = wb.getWorksheet(name);
    if (!sheet) return [];
    const rows: any[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        const obj: any = {};
        sheet.columns.forEach((col, idx) => {
            obj[col.key as string] = row.getCell(idx + 1).value;
        });
        rows.push(obj);
    });
    return rows;
}

export async function appendRow(
    name: string,
    data: Record<string, any>,
): Promise<boolean> {
    const wb = await ensureWorkbook();
    const sheet = wb.getWorksheet(name);
    if (!sheet) throw new Error("Sheet not found");
    sheet.addRow(data);
    await wb.xlsx.writeFile(FILE);
    return true;
}

export async function updateRow(
    name: string,
    id: string | number,
    updates: Record<string, any>,
): Promise<boolean> {
    const wb = await ensureWorkbook();
    const sheet = wb.getWorksheet(name);
    if (!sheet) throw new Error("Sheet not found");

    const idCol = sheet.getColumn("id");
    if (!idCol || typeof idCol.number !== "number") {
        return false;
    }

    let found = false;
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;

        const cell = row.getCell(idCol.number);
        if (String(cell.value) === String(id)) {
            found = true;
            Object.keys(updates).forEach((k) => {
                const col = sheet.getColumn(k);
                if (col && typeof col.number === "number") {
                    row.getCell(col.number).value = updates[k];
                }
            });
        }
    });

    if (found) {
        await wb.xlsx.writeFile(FILE);
    }
    return found;
}

export async function deleteRow(
    name: string,
    id: string | number,
): Promise<boolean> {
    const wb = await ensureWorkbook();
    const sheet = wb.getWorksheet(name);
    if (!sheet) throw new Error("Sheet not found");

    const idCol = sheet.getColumn("id");
    if (!idCol || typeof idCol.number !== "number") {
        return false;
    }

    const toDelete: number[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        const cell = row.getCell(idCol.number);
        if (String(cell.value) === String(id)) {
            toDelete.push(rowNumber);
        }
    });

    // Splice bottom-up so row numbers stay valid.
    toDelete.reverse().forEach((rowNumber) => {
        sheet.spliceRows(rowNumber, 1);
    });

    if (toDelete.length > 0) {
        await wb.xlsx.writeFile(FILE);
    }
    return toDelete.length > 0;
}

export { FILE };

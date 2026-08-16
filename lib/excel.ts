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
        const sheetNames = ["investments", "checklist", "expenses", "balances", "payslips"];
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
        return workbook;
    }

    const inv = workbook.addWorksheet("investments");
    inv.columns = [
        { header: "id", key: "id" },
        { header: "name", key: "name" },
        { header: "type", key: "type" },
        { header: "startDate", key: "startDate" },
        { header: "amount", key: "amount" },
        { header: "termYears", key: "termYears" },
        { header: "notes", key: "notes" },
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
    let found = false;
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        const cell = row.getCell(idCol.number);
        if (String(cell.value) === String(id)) {
            found = true;
            Object.keys(updates).forEach((k) => {
                const col = sheet.getColumn(k);
                if (col && col.number)
                    row.getCell(col.number).value = updates[k];
            });
        }
    });
    if (found) await wb.xlsx.writeFile(FILE);
    return found;
}

export { FILE };

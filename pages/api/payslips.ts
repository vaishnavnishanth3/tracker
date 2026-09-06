import type { NextApiRequest, NextApiResponse } from "next";
import { readSheet, appendRow, updateRow } from "../../lib/excel";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method === "GET") return res.json(await readSheet("payslips"));
    if (req.method === "POST") {
        const b = req.body;
        const id = Date.now();
        const gross = Number(b.gross) || 0;
        const basic = Number(b.basic) || 0;
        const hra = Number(b.hra) || 0;
        const allowances = Number(b.allowances) || 0;
        const deductions = Number(b.deductions) || 0;
        const net = Number(b.net) || gross - deductions;
        await appendRow("payslips", {
            id,
            date: b.date,
            gross,
            basic,
            hra,
            allowances,
            deductions,
            net,
            notes: b.notes || "",
            expectedIncome:
                b.expectedIncome === "" || b.expectedIncome === undefined
                    ? ""
                    : Number(b.expectedIncome),
        });
        return res.json({ ok: true });
    }
    if (req.method === "PATCH") {
        const b = req.body || {};
        if (b.id === undefined || b.id === null || b.id === "") {
            return res.status(400).json({ error: "Missing payslip id" });
        }
        const updates: Record<string, any> = {};
        for (const k of [
            "date",
            "gross",
            "basic",
            "hra",
            "allowances",
            "deductions",
            "net",
            "notes",
            "expectedIncome",
        ]) {
            if (k in b) updates[k] = b[k];
        }
        const found = await updateRow("payslips", String(b.id), updates);
        if (!found) {
            return res.status(404).json({ error: "Payslip not found" });
        }
        return res.json({ ok: true });
    }
    res.status(405).end();
}

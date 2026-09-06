import type { NextApiRequest, NextApiResponse } from "next";
import { readSheet, appendRow, deleteRow, updateRow } from "../../lib/excel";
import { estimateInvestment } from "../../lib/investCalc";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method === "GET") {
        const rows = await readSheet("investments");
        // Count how many installments were actually paid per investment
        // (checklist rows that are currently marked done).
        const checklist = await readSheet("checklist");
        const paidCounts = new Map<string, number>();
        for (const c of checklist) {
            const done =
                c.done === true || String(c.done).toLowerCase() === "true";
            if (!done) continue;
            const key = String(c.investmentId);
            paidCounts.set(key, (paidCounts.get(key) ?? 0) + 1);
        }
        const enriched = rows
            .map((inv) => ({
                ...inv,
                estimate: estimateInvestment(
                    inv,
                    paidCounts.get(String(inv.id)) ?? 0,
                ),
            }))
            // Order by start date (oldest first); undated entries go last.
            .sort((a, b) => {
                const ta = a.startDate
                    ? new Date(a.startDate).getTime()
                    : Infinity;
                const tb = b.startDate
                    ? new Date(b.startDate).getTime()
                    : Infinity;
                return ta - tb;
            });
        return res.json(enriched);
    }
    if (req.method === "POST") {
        const body = req.body;
        const id = Date.now();
        await appendRow("investments", {
            id,
            name: body.name,
            type: body.type,
            startDate: body.startDate,
            endDate: body.endDate || "",
            amount: body.amount,
            termYears: body.termYears || "",
            notes: body.notes || "",
            compounding: body.compounding || "",
            interestRate: body.interestRate || "",
            customMaturityAmount: body.customMaturityAmount || "",
            currentAmount: body.currentAmount || "",
            debitDay: body.debitDay || "",
            paidMonths: body.paidMonths || "",
        });
        return res.json({ ok: true });
    }
    if (req.method === "PATCH") {
        const body = req.body || {};
        const id = body.id;
        if (id === undefined || id === null || id === "") {
            return res.status(400).json({ error: "Missing investment id" });
        }
        const allowed = [
            "name",
            "type",
            "startDate",
            "endDate",
            "amount",
            "termYears",
            "notes",
            "compounding",
            "interestRate",
            "customMaturityAmount",
            "currentAmount",
            "debitDay",
            "paidMonths",
        ];
        const updates: Record<string, any> = {};
        for (const key of allowed) {
            if (key in body) updates[key] = body[key];
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "Nothing to update" });
        }
        const found = await updateRow("investments", String(id), updates);
        if (!found) {
            return res.status(404).json({ error: "Investment not found" });
        }
        return res.json({ ok: true });
    }
    if (req.method === "DELETE") {
        const id = req.query.id ?? req.body?.id;
        if (id === undefined || id === null || id === "") {
            return res.status(400).json({ error: "Missing investment id" });
        }
        const removed = await deleteRow("investments", String(id));
        if (!removed) {
            return res.status(404).json({ error: "Investment not found" });
        }
        return res.json({ ok: true });
    }
    res.status(405).end();
}

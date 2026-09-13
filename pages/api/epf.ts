import type { NextApiRequest, NextApiResponse } from "next";
import { readSheet, appendRow, updateRow, deleteRow } from "../../lib/excel";

// Employee Provident Fund (EPF) monthly details, entered manually each month.
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method === "GET") {
        const rows = await readSheet("epf");
        // Order chronologically (oldest first).
        rows.sort(
            (a, b) =>
                (Number(a.year) || 0) * 12 +
                (Number(a.month) || 0) -
                ((Number(b.year) || 0) * 12 + (Number(b.month) || 0)),
        );
        return res.json(rows);
    }

    if (req.method === "POST") {
        const b = req.body || {};
        const month = Number(b.month);
        const year = Number(b.year);
        if (
            !Number.isFinite(month) ||
            month < 1 ||
            month > 12 ||
            !Number.isFinite(year)
        ) {
            return res
                .status(400)
                .json({ error: "Valid month (1-12) and year are required" });
        }
        const id = Date.now();
        await appendRow("epf", {
            id,
            month,
            year,
            employee: Number(b.employee) || 0,
            employer: Number(b.employer) || 0,
            notes: b.notes || "",
        });
        return res.json({ ok: true });
    }

    if (req.method === "PATCH") {
        const b = req.body || {};
        if (b.id === undefined || b.id === null || b.id === "") {
            return res.status(400).json({ error: "Missing epf id" });
        }
        const updates: Record<string, any> = {};
        for (const k of ["month", "year", "employee", "employer", "notes"]) {
            if (k in b) updates[k] = b[k];
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "Nothing to update" });
        }
        const found = await updateRow("epf", String(b.id), updates);
        if (!found) {
            return res.status(404).json({ error: "EPF entry not found" });
        }
        return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
        const id = req.query.id ?? req.body?.id;
        if (id === undefined || id === null || id === "") {
            return res.status(400).json({ error: "Missing epf id" });
        }
        const removed = await deleteRow("epf", String(id));
        if (!removed) {
            return res.status(404).json({ error: "EPF entry not found" });
        }
        return res.json({ ok: true });
    }

    res.status(405).end();
}

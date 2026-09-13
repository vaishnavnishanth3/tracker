import type { NextApiRequest, NextApiResponse } from "next";
import { readSheet, appendRow, updateRow, deleteRow } from "../../lib/excel";

// Manually entered earnings (income) and income tax paid, keyed by date.
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method === "GET") {
        return res.json(await readSheet("earnings"));
    }

    if (req.method === "POST") {
        const b = req.body || {};
        const id = Date.now();
        await appendRow("earnings", {
            id,
            date: b.date,
            earned: Number(b.earned) || 0,
            tax: Number(b.tax) || 0,
            notes: b.notes || "",
        });
        return res.json({ ok: true });
    }

    if (req.method === "PATCH") {
        const b = req.body || {};
        if (b.id === undefined || b.id === null || b.id === "") {
            return res.status(400).json({ error: "Missing earning id" });
        }
        const updates: Record<string, any> = {};
        for (const k of ["date", "earned", "tax", "notes"]) {
            if (k in b) updates[k] = b[k];
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "Nothing to update" });
        }
        const found = await updateRow("earnings", String(b.id), updates);
        if (!found) {
            return res.status(404).json({ error: "Earning not found" });
        }
        return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
        const id = req.query.id ?? req.body?.id;
        if (id === undefined || id === null || id === "") {
            return res.status(400).json({ error: "Missing earning id" });
        }
        const removed = await deleteRow("earnings", String(id));
        if (!removed) {
            return res.status(404).json({ error: "Earning not found" });
        }
        return res.json({ ok: true });
    }

    res.status(405).end();
}

import type { NextApiRequest, NextApiResponse } from "next";
import { readSheet, appendRow, updateRow } from "../../lib/excel";

// Simple key-value settings store backed by the "settings" sheet.
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method === "GET") {
        const rows = await readSheet("settings");
        const out: Record<string, string> = {};
        for (const r of rows) {
            if (r.key !== undefined && r.key !== null && r.key !== "") {
                out[String(r.key)] = String(r.value ?? "");
            }
        }
        return res.json(out);
    }

    if (req.method === "POST") {
        const body = req.body || {};
        const key = String(body.key ?? "");
        if (!key) {
            return res.status(400).json({ error: "Missing setting key" });
        }
        const value = body.value === undefined ? "" : String(body.value);
        const rows = await readSheet("settings");
        const existing = rows.find((r) => String(r.key) === key);
        if (existing) {
            await updateRow("settings", String(existing.key), { value });
        } else {
            await appendRow("settings", { key, value });
        }
        return res.json({ ok: true });
    }

    res.status(405).end();
}

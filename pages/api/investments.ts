import type { NextApiRequest, NextApiResponse } from "next";
import { readSheet, appendRow } from "../../lib/excel";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method === "GET") {
        const rows = await readSheet("investments");
        return res.json(rows);
    }
    if (req.method === "POST") {
        const body = req.body;
        const id = Date.now();
        await appendRow("investments", {
            id,
            name: body.name,
            type: body.type,
            startDate: body.startDate,
            amount: body.amount,
            termYears: body.termYears || "",
            notes: body.notes || "",
        });
        return res.json({ ok: true });
    }
    res.status(405).end();
}

import type { NextApiRequest, NextApiResponse } from "next";
import { readSheet, appendRow } from "../../lib/excel";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method === "GET") return res.json(await readSheet("expenses"));
    if (req.method === "POST") {
        const body = req.body;
        const id = Date.now();
        await appendRow("expenses", {
            id,
            date: body.date,
            category: body.category,
            amount: body.amount,
            description: body.description || "",
        });
        return res.json({ ok: true });
    }
    res.status(405).end();
}

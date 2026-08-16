import type { NextApiRequest, NextApiResponse } from "next";
import { readSheet, appendRow } from "../../lib/excel";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method === "GET") return res.json(await readSheet("balances"));
    if (req.method === "POST") {
        const body = req.body;
        const id = Date.now();
        await appendRow("balances", {
            id,
            month: body.month,
            year: body.year,
            balance: body.balance,
        });
        return res.json({ ok: true });
    }
    res.status(405).end();
}

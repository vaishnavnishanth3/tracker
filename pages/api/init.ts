import type { NextApiRequest, NextApiResponse } from "next";
import { ensureWorkbook, FILE } from "../../lib/excel";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    try {
        await ensureWorkbook();
        res.status(200).json({ ok: true, file: FILE });
    } catch (err) {
        res.status(500).json({ error: String(err) });
    }
}

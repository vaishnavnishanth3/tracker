import type { NextApiRequest, NextApiResponse } from "next";
import { readSheet, appendRow, updateRow } from "../../lib/excel";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method === "GET") return res.json(await readSheet("checklist"));
    if (req.method === "POST") {
        const body = req.body;
        const rows = await readSheet("checklist");
        const found = rows.find(
            (r) =>
                String(r.month) === String(body.month) &&
                String(r.year) === String(body.year) &&
                String(r.investmentId) === String(body.investmentId),
        );
        if (found) {
            await updateRow("checklist", found.id, { done: false });
            return res.json({ ok: true, toggled: "off" });
        }
        const id = Date.now();
        await appendRow("checklist", {
            id,
            month: body.month,
            year: body.year,
            investmentId: body.investmentId,
            done: true,
        });
        return res.json({ ok: true, toggled: "on" });
    }
    res.status(405).end();
}

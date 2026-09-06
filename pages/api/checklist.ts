import type { NextApiRequest, NextApiResponse } from "next";
import { readSheet, appendRow, updateRow } from "../../lib/excel";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method === "GET") {
        try {
            return res.json(await readSheet("checklist"));
        } catch (error: any) {
            return res.status(500).json({
                error: "Failed to load checklist",
                message: error?.message || "Unknown error",
            });
        }
    }

    if (req.method === "POST") {
        try {
            const body = req.body || {};
            const month = Number(body.month);
            const year = Number(body.year);
            const investmentId = body.investmentId;

            if (
                !Number.isFinite(month) ||
                !Number.isFinite(year) ||
                investmentId === undefined ||
                investmentId === null
            ) {
                return res.status(400).json({
                    error: "Invalid checklist payload",
                });
            }

            const rows = await readSheet("checklist");
            const found = rows.find(
                (r) =>
                    String(r.month) === String(month) &&
                    String(r.year) === String(year) &&
                    String(r.investmentId) === String(investmentId),
            );

            if (!found) {
                // Reject toggles outside the investment's start-end period.
                const investments = await readSheet("investments");
                const inv = investments.find(
                    (i) => String(i.id) === String(investmentId),
                );
                const start = inv?.startDate ? new Date(inv.startDate) : null;
                const end = inv?.endDate ? new Date(inv.endDate) : null;
                if (start && !isNaN(start.getTime())) {
                    const selected = new Date(year, month - 1, 1);
                    const mStart = new Date(
                        start.getFullYear(),
                        start.getMonth(),
                        1,
                    );
                    const afterStart = selected >= mStart;
                    const beforeEnd =
                        !end ||
                        isNaN(end.getTime()) ||
                        selected <=
                            new Date(end.getFullYear(), end.getMonth(), 1);
                    if (!afterStart || !beforeEnd) {
                        return res.status(400).json({
                            error: "Selected month is outside the investment period",
                        });
                    }
                }
            }

            if (found) {
                await updateRow("checklist", found.id, { done: false });
                return res.json({ ok: true, toggled: "off" });
            }

            const id = Date.now();
            await appendRow("checklist", {
                id,
                month,
                year,
                investmentId,
                done: true,
            });
            return res.json({ ok: true, toggled: "on" });
        } catch (error: any) {
            return res.status(500).json({
                error: "Checklist update failed",
                message: error?.message || "Unknown error",
            });
        }
    }

    res.status(405).end();
}

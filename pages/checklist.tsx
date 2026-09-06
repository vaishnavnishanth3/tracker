import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Checkbox from "@mui/material/Checkbox";
import Button from "@mui/material/Button";

export default function Checklist(): JSX.Element {
    const [investments, setInvestments] = useState<any[]>([]);
    const [checks, setChecks] = useState<any[]>([]);
    const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
    const [year, setYear] = useState<number>(new Date().getFullYear());

    useEffect(() => {
        (async () => {
            const invs: any[] = await (await fetch("/api/investments")).json();
            const existing: any[] = await (
                await fetch("/api/checklist")
            ).json();
            // Auto-mark this month's payments whose debit day has passed.
            const now = new Date();
            const m = now.getMonth() + 1;
            const y = now.getFullYear();
            const today = now.getDate();
            for (const inv of invs) {
                const start = inv.startDate ? new Date(inv.startDate) : null;
                if (!start || isNaN(start.getTime())) continue;
                const end = inv.endDate ? new Date(inv.endDate) : null;
                const selected = new Date(y, m - 1, 1);
                if (
                    selected <
                    new Date(start.getFullYear(), start.getMonth(), 1)
                )
                    continue;
                if (
                    end &&
                    !isNaN(end.getTime()) &&
                    selected >
                        new Date(end.getFullYear(), end.getMonth() - 1, 1)
                )
                    continue;
                const debitDay = Number(inv.debitDay) || start.getDate();
                if (today < debitDay) continue; // not debited yet this month
                const already = existing.some(
                    (c) =>
                        String(c.investmentId) === String(inv.id) &&
                        Number(c.month) === m &&
                        Number(c.year) === y,
                );
                if (already) continue;
                await fetch("/api/checklist", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        month: m,
                        year: y,
                        investmentId: inv.id,
                    }),
                });
            }
            setInvestments(await (await fetch("/api/investments")).json());
            setChecks(await (await fetch("/api/checklist")).json());
        })();
    }, []);

    async function toggle(invId: string | number) {
        await fetch("/api/checklist", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ month, year, investmentId: invId }),
        });
        setChecks(await (await fetch("/api/checklist")).json());
    }

    function doneFor(invId: any) {
        return checks.some(
            (c) =>
                String(c.investmentId) === String(invId) &&
                Number(c.month) === Number(month) &&
                Number(c.year) === Number(year),
        );
    }

    // The selected month/year is a payable month: from the start month
    // through the month before maturity (the maturity month itself is
    // the withdrawal month and is not payable).
    function withinPeriod(inv: any): boolean {
        const start = inv.startDate ? new Date(inv.startDate) : null;
        if (!start || isNaN(start.getTime())) return false;
        const end = inv.endDate ? new Date(inv.endDate) : null;
        const selected = new Date(Number(year), Number(month) - 1, 1);
        const mStart = new Date(start.getFullYear(), start.getMonth(), 1);
        if (selected < mStart) return false;
        if (end && !isNaN(end.getTime())) {
            const lastPayable = new Date(end.getFullYear(), end.getMonth(), 1);
            lastPayable.setMonth(lastPayable.getMonth() - 1);
            if (selected > lastPayable) return false;
        }
        return true;
    }

    return (
        <Box>
            <Typography variant='h5'>Checklist</Typography>
            <Box sx={{ display: "flex", gap: 2, my: 2 }}>
                <TextField
                    label='Month'
                    type='number'
                    inputProps={{ min: 1, max: 12 }}
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                />
                <TextField
                    label='Year'
                    type='number'
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                />
                <Button
                    variant='contained'
                    onClick={async () => {
                        setChecks(await (await fetch("/api/checklist")).json());
                    }}
                >
                    Refresh
                </Button>
            </Box>

            <Typography variant='h6'>
                Investments for {month}/{year}
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Done</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {investments
                        .filter((inv) => withinPeriod(inv))
                        .map((inv) => (
                            <TableRow key={String(inv.id)}>
                                <TableCell>{inv.name}</TableCell>
                                <TableCell>{inv.type}</TableCell>
                                <TableCell>
                                    <Checkbox
                                        checked={doneFor(inv.id)}
                                        onChange={() => toggle(inv.id)}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    {investments.filter((inv) => withinPeriod(inv)).length ===
                        0 && (
                        <TableRow>
                            <TableCell colSpan={3}>
                                <Typography
                                    variant='body2'
                                    color='text.secondary'
                                >
                                    No investments are active in {month}/{year}.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Box>
    );
}

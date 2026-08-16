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
        fetch("/api/investments")
            .then((r) => r.json())
            .then(setInvestments);
        fetch("/api/checklist")
            .then((r) => r.json())
            .then(setChecks);
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
                    {investments.map((inv) => (
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
                </TableBody>
            </Table>
        </Box>
    );
}

import React, { useEffect, useState } from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

type Inv = {
    id: string | number;
    name: string;
    type: string;
    startDate?: string;
    endDate?: string;
    amount?: string;
};

export default function Investments(): JSX.Element {
    const [items, setItems] = useState<Inv[]>([]);
    const [form, setForm] = useState({
        name: "",
        type: "SIP",
        startDate: "",
        endDate: "",
        amount: "",
    });

    useEffect(() => {
        fetch("/api/investments")
            .then((r) => r.json())
            .then(setItems);
    }, []);

    async function add(e: React.FormEvent) {
        e.preventDefault();
        await fetch("/api/investments", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(form),
        });
        const res = await fetch("/api/investments");
        setItems(await res.json());
    }

    return (
        <Box>
            <Typography variant='h5' gutterBottom>
                Investments
            </Typography>
            <Box
                component='form'
                onSubmit={add}
                sx={{ display: "flex", gap: 2, mb: 3 }}
            >
                <TextField
                    required
                    label='Name'
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <TextField
                    select
                    label='Type'
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                    <MenuItem value='SIP'>SIP</MenuItem>
                    <MenuItem value='RD'>RD</MenuItem>
                    <MenuItem value='FD'>FD</MenuItem>
                </TextField>
                <TextField
                    type='date'
                    label='Start'
                    InputLabelProps={{ shrink: true }}
                    value={form.startDate}
                    onChange={(e) =>
                        setForm({ ...form, startDate: e.target.value })
                    }
                    required
                />
                <TextField
                    type='date'
                    label='End'
                    InputLabelProps={{ shrink: true }}
                    value={form.endDate}
                    onChange={(e) =>
                        setForm({ ...form, endDate: e.target.value })
                    }
                />
                <TextField
                    type='number'
                    label='Amount'
                    value={form.amount}
                    onChange={(e) =>
                        setForm({ ...form, amount: e.target.value })
                    }
                    required
                />
                <Button type='submit' variant='contained'>
                    Add
                </Button>
            </Box>

            <Typography variant='h6' gutterBottom>
                All
            </Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Start</TableCell>
                        <TableCell>End</TableCell>
                        <TableCell>Amount</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.map((it) => (
                        <TableRow key={String(it.id)}>
                            <TableCell>{it.id}</TableCell>
                            <TableCell>{it.name}</TableCell>
                            <TableCell>{it.type}</TableCell>
                            <TableCell>{it.startDate}</TableCell>
                            <TableCell>{it.endDate || "-"}</TableCell>
                            <TableCell>{it.amount}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
}

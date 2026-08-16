import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

type Exp = {
    id: string | number;
    date: string;
    category: string;
    amount: number;
    description?: string;
};

export default function Expenses(): JSX.Element {
    const [items, setItems] = useState<Exp[]>([]);
    const [balances, setBalances] = useState<any[]>([]);
    const [form, setForm] = useState({
        date: "",
        category: "",
        amount: "",
        description: "",
    });
    useEffect(() => {
        fetch("/api/expenses")
            .then((r) => r.json())
            .then(setItems);
        fetch("/api/balances")
            .then((r) => r.json())
            .then(setBalances);
    }, []);
    async function add(e: React.FormEvent) {
        e.preventDefault();
        await fetch("/api/expenses", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(form),
        });
        setItems(await (await fetch("/api/expenses")).json());
    }
    async function addBalance(e: React.FormEvent) {
        e.preventDefault();
        const target = e.target as HTMLFormElement;
        const b = {
            month: (target.month as HTMLInputElement).value,
            year: (target.year as HTMLInputElement).value,
            balance: (target.balance as HTMLInputElement).value,
        };
        await fetch("/api/balances", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(b),
        });
        setBalances(await (await fetch("/api/balances")).json());
    }
    return (
        <Box>
            <Typography variant='h5'>Expenses</Typography>
            <Box
                component='form'
                onSubmit={addBalance}
                sx={{ display: "flex", gap: 2, my: 2 }}
            >
                <TextField
                    name='month'
                    type='number'
                    label='Month'
                    inputProps={{ min: 1, max: 12 }}
                    required
                />
                <TextField name='year' type='number' label='Year' required />
                <TextField
                    name='balance'
                    type='number'
                    label='Balance'
                    required
                />
                <Button type='submit' variant='contained'>
                    Add Balance
                </Button>
            </Box>
            <Table sx={{ mb: 3 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Month</TableCell>
                        <TableCell>Year</TableCell>
                        <TableCell>Balance</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {balances.map((b) => (
                        <TableRow key={String(b.id)}>
                            <TableCell>{b.id}</TableCell>
                            <TableCell>{b.month}</TableCell>
                            <TableCell>{b.year}</TableCell>
                            <TableCell>{b.balance}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Typography variant='h6'>Add Expense</Typography>
            <Box
                component='form'
                onSubmit={add}
                sx={{ display: "flex", gap: 2, my: 2 }}
            >
                <TextField
                    type='date'
                    label='Date'
                    InputLabelProps={{ shrink: true }}
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                />
                <TextField
                    label='Category'
                    value={form.category}
                    onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
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
                <TextField
                    label='Description'
                    value={form.description}
                    onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                    }
                />
                <Button type='submit' variant='contained'>
                    Add
                </Button>
            </Box>

            <Typography variant='h6'>All</Typography>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Description</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.map((it) => (
                        <TableRow key={String(it.id)}>
                            <TableCell>{it.id}</TableCell>
                            <TableCell>{it.date}</TableCell>
                            <TableCell>{it.category}</TableCell>
                            <TableCell>{it.amount}</TableCell>
                            <TableCell>{it.description}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
}

import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";

type Row = {
    fy: string;
    investmentId: string | number;
    name: string;
    type?: string;
    rateUsed: number;
    isCustomMaturity: boolean;
    totalPrincipal: number;
    maturityAmount: number;
    interest: number;
    maturesOn: string;
};

const fmt = (n: number): string =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

// Current financial year (Apr-Mar) start year.
function currentFYStart(): number {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

export default function Itr(): JSX.Element {
    const [fy, setFy] = useState<number>(currentFYStart());
    const [pkg, setPkg] = useState<string>("");
    const [data, setData] = useState<{
        fy: string;
        rows: Row[];
        totalInterest: number;
        totalPrincipal: number;
        totalMaturity: number;
        packageIncome: number;
        slabRate: number;
        taxOnInterest: number;
    } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        const pkgParam = pkg.trim() !== "" ? `&package=${pkg.trim()}` : "";
        fetch(`/api/itr?fy=${fy}${pkgParam}`)
            .then((r) => r.json())
            .then((d) => {
                setData(d);
                setLoading(false);
            });
    }, [fy, pkg]);

    return (
        <Box>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 2,
                    flexWrap: "wrap",
                }}
            >
                <Typography variant='h5' sx={{ flexGrow: 1 }}>
                    ITR — Interest Income
                </Typography>
                <Button onClick={() => setFy(fy - 1)}>&larr;</Button>
                <Typography variant='h6'>
                    FY {fy}-{String((fy + 1) % 100).padStart(2, "0")}
                </Typography>
                <Button onClick={() => setFy(fy + 1)}>&rarr;</Button>
                <Button
                    variant='outlined'
                    size='small'
                    onClick={() => setFy(currentFYStart())}
                >
                    Current FY
                </Button>
                <TextField
                    type='number'
                    size='small'
                    label='Package (annual ₹)'
                    title='Your total annual income package. Overrides the payslip-derived value and selects the tax slab.'
                    inputProps={{ min: 0, step: "any" }}
                    sx={{ width: 190 }}
                    value={pkg}
                    onChange={(e) => setPkg(e.target.value)}
                />
            </Box>

            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                Investments maturing (withdrawal) between 1 Apr {fy} and 31 Mar{" "}
                {fy + 1}.{" "}
                <b>
                    Income = Final maturity amount &minus; total principal
                    deposited
                </b>
                , counted in the financial year the investment matures. The
                principal you deposit is not income; only the interest earned is
                taxable. Declare under &quot;Income from Other Sources&quot; in
                your ITR.
            </Typography>

            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Investment</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Rate p.a.</TableCell>
                        <TableCell>Matures On</TableCell>
                        <TableCell align='right'>Total Principal</TableCell>
                        <TableCell align='right'>Maturity Amount</TableCell>
                        <TableCell align='right'>Income (Interest)</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {(data?.rows ?? []).map((r) => (
                        <TableRow key={String(r.investmentId)}>
                            <TableCell>
                                {r.name}
                                {r.isCustomMaturity && (
                                    <Chip
                                        label='custom maturity'
                                        size='small'
                                        variant='outlined'
                                        sx={{ ml: 1, height: 20 }}
                                    />
                                )}
                            </TableCell>
                            <TableCell>{r.type}</TableCell>
                            <TableCell>{r.rateUsed.toFixed(2)}%</TableCell>
                            <TableCell>{r.maturesOn || "-"}</TableCell>
                            <TableCell align='right'>
                                ₹{fmt(r.totalPrincipal)}
                            </TableCell>
                            <TableCell align='right'>
                                ₹{fmt(r.maturityAmount)}
                            </TableCell>
                            <TableCell
                                align='right'
                                sx={{ fontWeight: 700, color: "#22c55e" }}
                            >
                                ₹{fmt(r.interest)}
                            </TableCell>
                        </TableRow>
                    ))}
                    {data && data.rows.length > 0 && (
                        <>
                            <TableRow
                                sx={{
                                    background: "rgba(99, 102, 241, 0.08)",
                                }}
                            >
                                <TableCell
                                    colSpan={4}
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: "1.05rem",
                                    }}
                                >
                                    Totals ({data.fy})
                                </TableCell>
                                <TableCell
                                    align='right'
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: "1.05rem",
                                    }}
                                >
                                    ₹{fmt(data.totalPrincipal)}
                                </TableCell>
                                <TableCell
                                    align='right'
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: "1.05rem",
                                    }}
                                >
                                    ₹{fmt(data.totalMaturity)}
                                </TableCell>
                                <TableCell
                                    align='right'
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: "1.05rem",
                                        color: "#22c55e",
                                    }}
                                >
                                    ₹{fmt(data.totalInterest)}
                                </TableCell>
                            </TableRow>
                            <TableRow
                                sx={{
                                    background: "rgba(239, 68, 68, 0.06)",
                                }}
                            >
                                <TableCell
                                    colSpan={4}
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: "1.05rem",
                                    }}
                                >
                                    Income Tax
                                    <Typography
                                        component='span'
                                        variant='caption'
                                        color='text.secondary'
                                        sx={{ ml: 1 }}
                                    >
                                        {(data.slabRate * 100).toFixed(0)}% slab
                                        (new regime) on ₹
                                        {fmt(data.packageIncome)} package
                                    </Typography>
                                </TableCell>
                                <TableCell colSpan={2} />
                                <TableCell
                                    align='right'
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: "1.05rem",
                                        color: "#ef4444",
                                    }}
                                >
                                    ₹{fmt(data.taxOnInterest)}
                                </TableCell>
                            </TableRow>
                        </>
                    )}
                    {data && data.rows.length === 0 && !loading && (
                        <TableRow>
                            <TableCell colSpan={7}>
                                <Typography color='text.secondary'>
                                    No investments mature in this financial
                                    year.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Box>
    );
}

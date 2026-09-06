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
    openingValue: number;
    paidInFY: number;
    closingValue: number;
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
    const [pkgSaved, setPkgSaved] = useState(false);
    const [data, setData] = useState<{
        fy: string;
        rows: Row[];
        totalInterest: number;
        totalPaid: number;
        totalClosing: number;
        packageIncome: number;
        packageSource?: string;
        slabRate: number;
        taxOnInterest: number;
    } | null>(null);
    const [loading, setLoading] = useState(false);

    // Load the saved package once on mount.
    useEffect(() => {
        fetch("/api/settings")
            .then((r) => r.json())
            .then((s) => {
                if (s.package) setPkg(String(s.package));
            })
            .catch(() => {});
    }, []);

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

    async function savePackage() {
        await fetch("/api/settings", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ key: "package", value: pkg.trim() }),
        });
        setPkgSaved(true);
        setTimeout(() => setPkgSaved(false), 2500);
    }

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
                    title='Your total annual income package. Saved and used to select the income-tax slab.'
                    inputProps={{ min: 0, step: "any" }}
                    sx={{ width: 190 }}
                    value={pkg}
                    onChange={(e) => setPkg(e.target.value)}
                />
                <Button
                    variant='contained'
                    size='small'
                    onClick={savePackage}
                    disabled={pkg.trim() === ""}
                >
                    Save
                </Button>
                {pkgSaved && (
                    <Typography variant='caption' sx={{ color: "#22c55e" }}>
                        Saved ✓
                    </Typography>
                )}
            </Box>

            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                Interest earned between 1 Apr {fy} and 31 Mar {fy + 1} is
                income of this financial year &mdash; even if it stays
                reinvested in the deposit.{" "}
                <b>Interest = Closing value &minus; Opening value &minus;
                Deposits made in the FY</b>. Declare under &quot;Income from
                Other Sources&quot; in your ITR.
            </Typography>

            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Investment</TableCell>
                        <TableCell align='right'>Type</TableCell>
                        <TableCell align='right'>Rate p.a.</TableCell>
                        <TableCell align='right'>Matures On</TableCell>
                        <TableCell align='right'>Opening (1 Apr)</TableCell>
                        <TableCell align='right'>Deposited in FY</TableCell>
                        <TableCell align='right'>Closing (31 Mar)</TableCell>
                        <TableCell align='right'>Interest Earned</TableCell>
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
                            <TableCell align='right'>{r.type}</TableCell>
                            <TableCell align='right'>
                                {r.rateUsed.toFixed(2)}%
                            </TableCell>
                            <TableCell align='right'>
                                {r.maturesOn || "-"}
                            </TableCell>
                            <TableCell align='right'>
                                ₹{fmt(r.openingValue)}
                            </TableCell>
                            <TableCell align='right'>
                                ₹{fmt(r.paidInFY)}
                            </TableCell>
                            <TableCell align='right'>
                                ₹{fmt(r.closingValue)}
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
                                        color: "text.secondary",
                                    }}
                                >
                                    &mdash;
                                </TableCell>
                                <TableCell
                                    align='right'
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: "1.05rem",
                                    }}
                                >
                                    ₹{fmt(data.totalPaid)}
                                </TableCell>
                                <TableCell
                                    align='right'
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: "1.05rem",
                                    }}
                                >
                                    ₹{fmt(data.totalClosing)}
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
                                    colSpan={7}
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
                                        (new regime, incometax.gov.in) on ₹
                                        {fmt(data.packageIncome)} package
                                        {data.packageSource === "saved"
                                            ? " (saved)"
                                            : data.packageSource === "payslips"
                                              ? " (from payslips)"
                                              : data.packageSource ===
                                                  "estimate"
                                                ? " (estimated)"
                                                : ""}
                                    </Typography>
                                </TableCell>
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
                            <TableCell colSpan={8}>
                                <Typography color='text.secondary'>
                                    No interest earned in this financial year.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Box>
    );
}

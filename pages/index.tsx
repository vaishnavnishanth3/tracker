import Link from "next/link";
import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export default function Home(): JSX.Element {
    return (
        <Box>
            <Typography variant='h4' gutterBottom>
                Financial Tracker
            </Typography>
            <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                <Button
                    component={Link}
                    href='/investments'
                    variant='contained'
                >
                    Investments
                </Button>
                <Button component={Link} href='/checklist' variant='contained'>
                    Checklist
                </Button>
                <Button component={Link} href='/expenses' variant='contained'>
                    Expenses
                </Button>
                <Button component={Link} href='/payslips' variant='contained'>
                    Payslips
                </Button>
                <Button component={Link} href='/timeline' variant='contained'>
                    Timeline
                </Button>
            </Box>
            <Typography>
                Data stored in an Excel workbook at{" "}
                <strong>data/finance.xlsx</strong>.
            </Typography>
            <Typography>
                Initialize workbook: <a href='/api/init'>/api/init</a>
            </Typography>
        </Box>
    );
}

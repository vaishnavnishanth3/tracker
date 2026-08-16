import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        mode: "dark",
        primary: { main: "#6366f1" },
        secondary: { main: "#f8fafc" },
        background: {
            default: "#020817",
            paper: "#f8fafc",
        },
        text: {
            primary: "#e2e8f0",
            secondary: "#94a3b8",
        },
    },
    typography: {
        fontFamily: "Inter, Roboto, Arial",
        h1: { fontWeight: 700 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 700 },
        h4: { fontWeight: 700 },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 700 },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 999,
                    textTransform: "none",
                    fontWeight: 600,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 18,
                    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.14)",
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: "none",
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: "1px solid rgba(148, 163, 184, 0.22)",
                },
            },
        },
    },
});

export default theme;

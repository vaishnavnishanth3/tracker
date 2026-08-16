import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        mode: "dark",
        primary: { main: "#6366f1" },
        background: { default: "#071428", paper: "#0b1220" },
    },
    typography: { fontFamily: "Inter, Roboto, Arial" },
});

export default theme;

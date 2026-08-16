# Next.js Financial Tracker (Excel-backed)

Simple Next.js app that uses an Excel workbook as the data store.

Setup

1. Install dependencies:

```powershell
cd tracker
npm install
```

2. Run dev server:

```powershell
npm run dev
```

3. Initialize the workbook (first run):

Open `http://localhost:3000/api/init` in your browser or use `curl`.

Notes

- Data file is stored in `data/finance.xlsx` and will be created on first init.
- API routes live under `pages/api/*` and use `exceljs` to read/write.

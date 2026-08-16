import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

function monthIndex(date: Date) {
    return date.getFullYear() * 12 + (date.getMonth() + 1);
}
function addMonths(date: Date, months: number) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

export default function Timeline(): JSX.Element {
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        fetch("/api/investments")
            .then((r) => r.json())
            .then((raw) => {
                const parsed = raw.map((rw: any) => {
                    const start = rw.startDate
                        ? new Date(String(rw.startDate))
                        : new Date();
                    const term = Number(rw.termYears) || 0;
                    const end = term > 0 ? addMonths(start, term * 12) : null;
                    return { ...rw, start, end };
                });
                setItems(parsed);
            });
    }, []);

    if (!items) return <div>Loading...</div>;

    const starts = items.map((i) => monthIndex(i.start));
    const tentativeEnds = items.map((i) =>
        i.end ? monthIndex(i.end) : monthIndex(addMonths(i.start, 11)),
    );
    const nowIdx = monthIndex(new Date());
    const minIdx = Math.min(...starts, nowIdx);
    const maxIdx = Math.max(...tentativeEnds, minIdx + 11);
    const totalMonths = Math.max(1, maxIdx - minIdx + 1);

    const months = [] as { idx: number; label: string }[];
    for (let idx = minIdx; idx <= maxIdx; idx++) {
        const year = Math.floor(idx / 12);
        const month = idx % 12;
        const displayMonth = month === 0 ? 12 : month;
        const displayYear = month === 0 ? year - 1 : year;
        months.push({
            idx,
            label: `${displayYear}-${String(displayMonth).padStart(2, "0")}`,
        });
    }

    return (
        <Box>
            <Typography variant='h5'>Investments Timeline</Typography>
            <Typography sx={{ mb: 2 }}>
                Range: {months[0]?.label} → {months[months.length - 1]?.label}
            </Typography>

            <Box className='timeline'>
                <Box className='timelineGrid'>
                    <div className='labelsHeader'>Investments</div>
                    <div className='monthsHeader'>
                        {months.map((m) => (
                            <div key={m.idx} className='month'>
                                {m.label}
                            </div>
                        ))}
                    </div>
                </Box>

                <div className='rows'>
                    {items.map((it) => {
                        const s = monthIndex(it.start);
                        const e = it.end ? monthIndex(it.end) : maxIdx;
                        const left = ((s - minIdx) / totalMonths) * 100;
                        const width =
                            ((Math.max(e, s) - s + 1) / totalMonths) * 100;
                        return (
                            <div className='row' key={String(it.id)}>
                                <div className='labels'>
                                    {it.name} ({it.type})
                                </div>
                                <div className='chart'>
                                    <div
                                        className='bar'
                                        style={{
                                            left: `${left}%`,
                                            width: `${width}%`,
                                        }}
                                    >
                                        {it.amount || ""}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Box>
        </Box>
    );
}

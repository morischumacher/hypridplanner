/**
 * The bar under each headline figure. The percentage is clamped here because
 * one of the two callers passes a share that can exceed 100.
 */

export interface KpiProgressBarProps {
    pct: number;
    color: string;
}

export default function KpiProgressBar({ pct, color }: KpiProgressBarProps) {
    return (
        <div style={{ marginTop: 6, height: 6, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
            <div style={{ width: `${Math.max(0, Math.min(100, Number(pct) || 0))}%`, height: "100%", background: color }} />
        </div>
    );
}

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { num, bucketParts } from '@/lib/format';
import PageHeader from '@/components/ui-custom/PageHeader';
import LoadingState from '@/components/ui-custom/LoadingState';
import ErrorState from '@/components/ui-custom/ErrorState';
import EmptyState from '@/components/ui-custom/EmptyState';
import {
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, Trophy, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SEGMENT_COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
];

export default function SpeedTrends() {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['speed-trends'],
        queryFn: api.speedTrends,
    });
    const [active, setActive] = useState(null);

    const buckets = useMemo(() => (data ? Object.keys(data) : []), [data]);
    const current = active || buckets[0];
    const bucketData = current ? data?.[current] : null;

    return (
        <div className="px-5 lg:px-10 py-8 lg:py-12 max-w-6xl mx-auto">
            <PageHeader
                eyebrow="Speed"
                title="Are you getting faster?"
                description="Per-bike trends broken down by segment."
            />

            {isLoading ? (
                <LoadingState rows={6} />
            ) : error ? (
                <ErrorState error={error} onRetry={refetch} />
            ) : !buckets.length ? (
                <EmptyState />
            ) : (
                <>
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-6 -mx-5 px-5 lg:mx-0 lg:px-0 pb-1">
                        {buckets.map((b) => {
                            const { dist, grade } = bucketParts(b);
                            const isA = current === b;
                            return (
                                <button
                                    key={b}
                                    onClick={() => setActive(b)}
                                    className={`shrink-0 text-left px-4 py-2.5 rounded-md border transition-all ${isA
                                            ? 'bg-foreground text-background border-foreground'
                                            : 'border-border hover:bg-muted'
                                        }`}
                                >
                                    <div className="text-[10px] uppercase tracking-wider opacity-70">{dist}</div>
                                    <div className="text-sm font-medium mt-0.5">{grade}</div>
                                </button>
                            );
                        })}
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={current}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                        >
                            {bucketData && <BucketView data={bucketData} />}
                        </motion.div>
                    </AnimatePresence>
                </>
            )}
        </div>
    );
}

function BucketView({ data }) {
    const gears = Object.keys(data.gears || {});
    const fastest = data.summary?.fastest_gear;

    // Summary bar: avg speed per gear
    const perfData = useMemo(
        () =>
            (data.summary?.performance || []).slice().sort((a, b) => b.average_speed - a.average_speed),
        [data]
    );

    return (
        <div className="space-y-5">
            {/* Fastest gear banner */}
            {fastest && (
                <div className="rounded-lg border border-border bg-card p-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                            <Trophy className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fastest gear</div>
                            <div className="font-display text-xl font-semibold">{fastest}</div>
                        </div>
                    </div>
                    <div className="flex gap-4 ml-auto">
                        {perfData.map((p) => (
                            <div key={p.gear} className="text-right">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate max-w-[120px]">{p.gear}</div>
                                <div className="font-display text-lg tabular-nums">
                                    {num(p.average_speed)} <span className="text-xs text-muted-foreground">mph avg</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* One card per gear */}
            {gears.map((gear) => (
                <GearCard key={gear} gear={gear} gearData={data.gears[gear]} isFastest={gear === fastest} />
            ))}
        </div>
    );
}

function GearCard({ gear, gearData, isFastest }) {
    const [open, setOpen] = useState(true);

    // Group efforts by segment
    const segments = useMemo(() => {
        const map = new Map();
        (gearData.efforts || []).forEach((e) => {
            if (!map.has(e.segment_name)) map.set(e.segment_name, []);
            map.get(e.segment_name).push(e);
        });
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [gearData]);

    // Trendline chart data (index-based, one point per effort sorted by time)
    const trendData = useMemo(() => {
        const sorted = [...(gearData.efforts || [])].sort((a, b) => a.timestamp - b.timestamp);
        return sorted.map((e, i) => ({
            i,
            speed: e.speed,
            date: e.date,
            segment: e.segment_name,
            trend: gearData.trendline?.[i] ?? null,
        }));
    }, [gearData]);

    const trend = gearData.description || '';
    const isUp = trend.toLowerCase().includes('increas');
    const isDown = trend.toLowerCase().includes('decreas');
    const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
    const trendColor = isUp ? 'text-green-500' : isDown ? 'text-destructive' : 'text-muted-foreground';

    return (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center gap-3 p-4 lg:p-5 hover:bg-muted/30 transition text-left"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-xl font-semibold">{gear}</span>
                        {isFastest && <Trophy className="w-3.5 h-3.5 text-accent" />}
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs mt-1 ${trendColor}`}>
                        <TrendIcon className="w-3.5 h-3.5" />
                        {trend}
                    </div>
                </div>
                <div className="text-right shrink-0 mr-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">3-mo prediction</div>
                    <div className="font-mono text-sm">{gearData.prediction?.replace('Predicted speed in 3 months: ', '') || '—'}</div>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-border p-4 lg:p-5 space-y-6">
                            {/* Trend chart */}
                            {trendData.length > 1 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <TrendingUp className="w-3.5 h-3.5 text-accent" />
                                        <span className="text-xs uppercase tracking-wider text-muted-foreground">Speed trend (all efforts, chronological)</span>
                                    </div>
                                    <div className="h-52 -ml-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trendData}>
                                                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
                                                <XAxis
                                                    dataKey="i"
                                                    hide
                                                />
                                                <YAxis
                                                    stroke="hsl(var(--muted-foreground))"
                                                    style={{ fontSize: 11 }}
                                                    domain={['auto', 'auto']}
                                                    tickFormatter={(v) => `${num(v)}`}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        background: 'hsl(var(--card))',
                                                        border: '1px solid hsl(var(--border))',
                                                        borderRadius: 8,
                                                        fontSize: 12,
                                                    }}
                                                    content={<CustomTooltip />}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="speed"
                                                    stroke="hsl(var(--chart-2))"
                                                    strokeWidth={1.5}
                                                    dot={{ r: 3, fill: 'hsl(var(--chart-2))' }}
                                                    activeDot={{ r: 5 }}
                                                    name="Speed"
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="trend"
                                                    stroke="hsl(var(--accent))"
                                                    strokeWidth={2}
                                                    strokeDasharray="5 3"
                                                    dot={false}
                                                    name="Trend"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><span className="w-4 h-px bg-chart-2 inline-block" style={{ background: 'hsl(var(--chart-2))' }} /> Efforts</span>
                                        <span className="flex items-center gap-1.5"><span className="w-4 h-px inline-block border-t-2 border-dashed border-accent" /> Trendline</span>
                                    </div>
                                </div>
                            )}

                            {/* Per-segment breakdown */}
                            <div>
                                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">By segment</div>
                                <div className="space-y-3">
                                    {segments.map(([segName, efforts], si) => (
                                        <SegmentRow
                                            key={segName}
                                            name={segName}
                                            efforts={efforts}
                                            color={SEGMENT_COLORS[si % SEGMENT_COLORS.length]}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function SegmentRow({ name, efforts, color }) {
    const sorted = useMemo(
        () => [...efforts].sort((a, b) => a.timestamp - b.timestamp),
        [efforts]
    );
    const avg = efforts.reduce((a, e) => a + e.speed, 0) / efforts.length;
    const best = Math.max(...efforts.map((e) => e.speed));

    return (
        <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-sm font-medium">{name}</span>
                </div>
                <div className="flex gap-4 text-xs font-mono text-muted-foreground">
                    <span>avg <span className="text-foreground">{num(avg)} mph</span></span>
                    <span>best <span className="text-foreground">{num(best)} mph</span></span>
                    <span>{efforts.length} effort{efforts.length !== 1 ? 's' : ''}</span>
                </div>
            </div>
            {sorted.length > 1 && (
                <div className="h-24 -ml-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey="timestamp"
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                tickFormatter={(v) => format(new Date(v * 1000), 'MMM yy')}
                                stroke="hsl(var(--muted-foreground))"
                                style={{ fontSize: 10 }}
                                tickCount={4}
                            />
                            <YAxis
                                dataKey="speed"
                                domain={['auto', 'auto']}
                                stroke="hsl(var(--muted-foreground))"
                                style={{ fontSize: 10 }}
                                tickFormatter={(v) => num(v, 0)}
                                width={28}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 8,
                                    fontSize: 11,
                                }}
                                formatter={(v) => [`${num(v)} mph`, 'Speed']}
                                labelFormatter={() => ''}
                                content={({ payload }) => {
                                    if (!payload?.length) return null;
                                    const d = payload[0]?.payload;
                                    return (
                                        <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs">
                                            <div className="text-muted-foreground">{d?.date}</div>
                                            <div className="font-semibold">{num(d?.speed)} mph</div>
                                        </div>
                                    );
                                }}
                            />
                            <ReferenceLine y={avg} stroke={color} strokeDasharray="4 2" strokeOpacity={0.5} />
                            <Scatter data={sorted} fill={color} opacity={0.85} />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            )}
            {sorted.length === 1 && (
                <div className="text-xs font-mono text-muted-foreground pt-1">
                    {sorted[0].date} · {num(sorted[0].speed)} mph
                </div>
            )}
        </div>
    );
}

function CustomTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-md">
            <div className="text-muted-foreground mb-1">{d?.date} · {d?.segment}</div>
            {payload.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span>{p.name}: <span className="font-semibold">{num(p.value)} mph</span></span>
                </div>
            ))}
        </div>
    );
}
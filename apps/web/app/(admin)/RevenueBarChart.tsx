'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function RevenueBarChart({ data }: { data: { week: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid stroke="#2A2A2A" strokeDasharray="3 3" />
        <XAxis dataKey="week" tick={{ fill: '#A0A0A0', fontSize: 10 }} tickFormatter={(w: string) => w.slice(5)} />
        <YAxis tick={{ fill: '#A0A0A0', fontSize: 10 }} />
        <Tooltip contentStyle={{ backgroundColor: '#141414', border: '1px solid #2A2A2A', color: '#fff' }} />
        <Bar dataKey="total" fill="#C9A84C" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

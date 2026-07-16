'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function BookingsLineChart({ data }: { data: { day: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid stroke="#2A2A2A" strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={{ fill: '#A0A0A0', fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
        <YAxis tick={{ fill: '#A0A0A0', fontSize: 10 }} allowDecimals={false} />
        <Tooltip contentStyle={{ backgroundColor: '#141414', border: '1px solid #2A2A2A', color: '#fff' }} />
        <Line type="monotone" dataKey="count" stroke="#C9A84C" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

import { BookingsDataTable } from '../../../components/BookingsDataTable';
import { StatCard } from '../../../components/StatCard';
import { getOverviewStats } from '../../../lib/admin-data';
import { BookingsLineChart } from '../BookingsLineChart';
import { RevenueBarChart } from '../RevenueBarChart';

export default async function AdminOverviewPage() {
  const stats = await getOverviewStats();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Overview</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Bookings" value={stats.totalBookings} />
        <StatCard label="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`} />
        <StatCard label="Active Barbers" value={stats.activeBarbers} />
        <StatCard label="Registered Users" value={stats.totalUsers} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-white">Daily Bookings (30 days)</h2>
          <BookingsLineChart data={stats.dailyBookings} />
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-white">Weekly Revenue</h2>
          <RevenueBarChart data={stats.weeklyRevenue} />
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-white">Recent Bookings</h2>
      <BookingsDataTable rows={stats.recentBookings} emptyMessage="No bookings yet." />
    </div>
  );
}

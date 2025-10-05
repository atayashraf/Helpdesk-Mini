type TicketStats = {
  total: number;
  open: number;
  inProgress: number;
  breached: number;
};

type StatsOverviewProps = {
  stats: TicketStats;
};

export const StatsOverview = ({ stats }: StatsOverviewProps) => (
  <div className="stats-grid">
    <div className="stat-card">
      <div className="stat-label">Total Tickets</div>
      <div className="stat-value">{stats.total}</div>
    </div>
    <div className="stat-card warning">
      <div className="stat-label">Open</div>
      <div className="stat-value">{stats.open}</div>
    </div>
    <div className="stat-card success">
      <div className="stat-label">In Progress</div>
      <div className="stat-value">{stats.inProgress}</div>
    </div>
    <div className="stat-card danger">
      <div className="stat-label">SLA Breached</div>
      <div className="stat-value">{stats.breached}</div>
    </div>
  </div>
);

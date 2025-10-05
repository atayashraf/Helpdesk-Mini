import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';

import dayjs from '../utils/dayjs';

import api, { parseError } from '../api/client';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { TicketListSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { StatsOverview } from '../components/StatsOverview';

type TicketSummary = {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  creatorId: string;
  creatorName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  slaDueAt: string;
  slaBreached: boolean;
  latestCommentExcerpt: string | null;
  latestCommentAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type TicketsResponse = {
  items: TicketSummary[];
  next_offset: number | null;
};

const PAGE_SIZE = 10;

const statusLabels: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const priorityLabels: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const TicketsListPage = () => {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [search, setSearch] = useState('');
  const [breachedOnly, setBreachedOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState<number | null>(0);

  const effectiveAssigneeId = user && user.role !== 'user' && onlyMine ? user.id : undefined;

  // Calculate stats from tickets
  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in_progress').length,
      breached: tickets.filter(t => t.slaBreached).length,
    };
  }, [tickets]);

  const fetchTickets = async (offset = 0, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ data: TicketsResponse }>('/tickets', {
        params: {
          limit: PAGE_SIZE,
          offset,
          q: search || undefined,
          breached: breachedOnly || undefined,
          status: statusFilter || undefined,
          assigneeId: effectiveAssigneeId,
        },
      });
      const payload = response.data.data;
      setNextOffset(payload.next_offset);
      setTickets((prev) => (append ? [...prev, ...payload.items] : payload.items));
    } catch (err) {
      const message = parseError(err);
      setError(message);
      pushToast({ tone: 'error', message: 'Unable to load tickets. Please retry.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, breachedOnly, statusFilter, effectiveAssigneeId]);

  const showLoadMore = useMemo(() => nextOffset !== null, [nextOffset]);

  const hasFilters = search || statusFilter || breachedOnly || onlyMine;

  return (
    <div className="page">
      <a className="skip-link" href="#tickets-table">
        Skip to ticket list
      </a>
      <div className="page-header">
        <div>
          <h2>Tickets</h2>
          <p className="subtitle">Monitor active tickets and SLA breaches</p>
        </div>
        <div className="filters" role="group" aria-label="Ticket filters">
          <input
            type="search"
            placeholder="Search tickets"
            value={search}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
            aria-label="Search tickets"
          />
          <select
            className="select-control"
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="checkbox" aria-label="Show only breached SLAs">
            <input
              type="checkbox"
              checked={breachedOnly}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setBreachedOnly(event.target.checked)}
            />
            SLA breached only
          </label>
          {user?.role !== 'user' && (
            <label className="checkbox" aria-label="Show only my assigned tickets">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setOnlyMine(event.target.checked)}
              />
              My queue
            </label>
          )}
          <Link className="primary" to="/tickets/new">
            Create ticket
          </Link>
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        {loading ? 'Loading tickets' : ''}
      </div>

      {error && <div className="error-box" role="alert">{error}</div>}

      {!loading && tickets.length > 0 && <StatsOverview stats={stats} />}

      {loading && tickets.length === 0 ? (
        <TicketListSkeleton />
      ) : tickets.length === 0 && !error ? (
        <EmptyState
          icon="🎫"
          title="No tickets found"
          description={
            hasFilters
              ? "Try adjusting your filters to see more results."
              : "Create your first ticket to get started with the helpdesk system."
          }
          action={
            !hasFilters ? (
              <Link className="primary" to="/tickets/new">
                Create your first ticket
              </Link>
            ) : null
          }
        />
      ) : tickets.length > 0 ? (
        <>
          <div id="tickets-table" className="ticket-list" role="list">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className={`card ticket-card ${ticket.slaBreached ? 'breached' : ''}`}
                role="listitem"
                aria-label={`${ticket.title}, ${statusLabels[ticket.status] ?? ticket.status}`}
              >
                <header>
                  <div>
                    <h3>{ticket.title}</h3>
                    <p className="ticket-meta">
                      <span className={`badge priority-${ticket.priority}`} aria-label={`Priority ${priorityLabels[ticket.priority] ?? ticket.priority}`}>
                        {priorityLabels[ticket.priority] ?? ticket.priority}
                      </span>
                      <span className={`badge status-${ticket.status}`} aria-label={`Status ${statusLabels[ticket.status] ?? ticket.status}`}>
                        {statusLabels[ticket.status] ?? ticket.status}
                      </span>
                      <span className="meta">Reporter: {ticket.creatorName}</span>
                      <span className="meta">Assignee: {ticket.assigneeName ?? 'Unassigned'}</span>
                    </p>
                  </div>
                  <div className="sla" aria-live="polite">
                    <span>{ticket.slaBreached ? 'SLA breached' : 'SLA due'}</span>
                    <strong>{dayjs(ticket.slaDueAt).format('MMM D, HH:mm')}</strong>
                  </div>
                </header>
                {ticket.latestCommentExcerpt && <p className="latest-comment">"{ticket.latestCommentExcerpt}"</p>}
                <footer>
                  <span>Updated {dayjs(ticket.updatedAt).fromNow()}</span>
                  {ticket.latestCommentAt && <span>Last comment {dayjs(ticket.latestCommentAt).fromNow()}</span>}
                </footer>
              </Link>
            ))}
          </div>

          {showLoadMore && nextOffset !== null && (
            <button className="secondary" disabled={loading} onClick={() => fetchTickets(nextOffset, true)}>
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </>
      ) : null}
    </div>
  );
};

export default TicketsListPage;

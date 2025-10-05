import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import dayjs from '../utils/dayjs';

import api, { parseError } from '../api/client';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { ContentSkeleton } from '../components/LoadingSkeleton';

type CommentNode = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
  replies: CommentNode[];
};

type TimelineEvent = {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  type: string;
  description: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

type Participant = {
  id: string;
  fullName: string;
  role: string;
};

type TicketDetail = {
  id: string;
  title: string;
  description: string;
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
  participants: Record<string, Participant>;
  comments: CommentNode[];
  timeline: TimelineEvent[];
};

type SupportMember = {
  id: string;
  fullName: string;
  email: string;
  role: string;
};

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  agent: 'Agent',
  user: 'Requester',
  system: 'System',
};

const formatRole = (role: string) => roleLabels[role] ?? role;

const TicketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [updating, setUpdating] = useState(false);
  const [supportTeam, setSupportTeam] = useState<SupportMember[]>([]);
  const [categoryDraft, setCategoryDraft] = useState('');

  const canEditWorkflow = user?.role === 'agent' || user?.role === 'admin';

  const loadTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ data: { ticket: TicketDetail } }>(`/tickets/${id}`);
      setTicket(response.data.data.ticket);
      setCategoryDraft(response.data.data.ticket.category ?? '');
    } catch (err) {
      const message = parseError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadSupportTeam = useCallback(async () => {
    if (!canEditWorkflow) return;
    try {
      const response = await api.get<{ data: { members: SupportMember[] } }>('/tickets/support-team');
      setSupportTeam(response.data.data.members);
    } catch (err) {
      pushToast({ tone: 'error', message: 'Unable to load support roster.' });
    }
  }, [canEditWorkflow, pushToast]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    loadSupportTeam();
  }, [loadSupportTeam]);

  const participantsList = useMemo(() => {
    if (!ticket) return [] as Participant[];
    return Object.values(ticket.participants).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [ticket]);

  const assignmentOptions = useMemo(() => {
    if (!ticket) return supportTeam;
    const exists = supportTeam.some((member) => member.id === ticket.assigneeId);
    const roster = exists || !ticket.assigneeId
      ? [...supportTeam]
      : [
          ...supportTeam,
          {
            id: ticket.assigneeId,
            fullName: ticket.assigneeName ?? 'Assigned user',
            email: '',
            role: 'user',
          },
        ];
    return roster.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [supportTeam, ticket]);

  const handleTicketMutation = async (
    payload: Record<string, unknown>,
    successMessage: string,
  ) => {
    if (!ticket) return;
    setUpdating(true);
    setError(null);
    try {
  const response = await api.patch<{ data: { ticket: TicketDetail } }>(`/tickets/${ticket.id}`, {
        ...payload,
        version: ticket.version,
      });
      setTicket(response.data.data.ticket);
      setCategoryDraft(response.data.data.ticket.category ?? '');
      pushToast({ tone: 'success', message: successMessage });
    } catch (err) {
      const message = parseError(err);
      setError(message);
      pushToast({ tone: 'error', message });
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    handleTicketMutation({ status: event.target.value }, 'Status updated');
  };

  const handlePriorityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    handleTicketMutation({ priority: event.target.value }, 'Priority updated');
  };

  const handleAssigneeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    handleTicketMutation(
      { assigneeId: value || null },
      value ? 'Ticket assigned' : 'Ticket unassigned',
    );
  };

  const handleCategorySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleTicketMutation(
      { category: categoryDraft.trim() || null },
      'Category updated',
    );
  };

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ticket || comment.trim().length === 0) return;
    try {
      const response = await api.post<{ data: { ticket: TicketDetail } }>(`/tickets/${ticket.id}/comments`, {
        body: comment.trim(),
      });
      setTicket(response.data.data.ticket);
      setCategoryDraft(response.data.data.ticket.category ?? '');
      setComment('');
      pushToast({ tone: 'success', message: 'Comment added' });
    } catch (err) {
      const message = parseError(err);
      setError(message);
      pushToast({ tone: 'error', message });
    }
  };

  const handleBackToList = () => {
    navigate('/tickets');
  };

  if (loading) {
    return (
      <div className="page ticket-detail">
        <ContentSkeleton />
        <ContentSkeleton />
        <ContentSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-box" role="alert">
        <p>{error}</p>
        <button className="secondary" onClick={loadTicket}>
          Retry
        </button>
      </div>
    );
  }

  if (!ticket) {
    return <p>Ticket not found.</p>;
  }

  return (
    <div className="page ticket-detail">
      <div className="page-header">
        <div>
          <h2>{ticket.title}</h2>
          <p className="subtitle">
            Created {dayjs(ticket.createdAt).format('MMM D, YYYY HH:mm')} · Reporter {ticket.creatorName}
          </p>
        </div>
        <div className="actions">
          <button className="secondary" onClick={handleBackToList}>
            Back to list
          </button>
        </div>
      </div>

      <section className="card ticket-overview" aria-labelledby="ticket-overview-heading">
        <header className="ticket-header">
          <div>
            <label className="field-label" htmlFor="ticket-priority">
              Priority
            </label>
            <select
              className="select-control"
              id="ticket-priority"
              value={ticket.priority}
              onChange={handlePriorityChange}
              disabled={!canEditWorkflow || updating}
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="ticket-status">
              Status
            </label>
            <select
              className="select-control"
              id="ticket-status"
              value={ticket.status}
              onChange={handleStatusChange}
              disabled={!canEditWorkflow || updating}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className={`sla-pill ${ticket.slaBreached ? 'breached' : ''}`} aria-live="polite">
            <span>{ticket.slaBreached ? 'SLA breached' : 'SLA due'}</span>
            <strong>{dayjs(ticket.slaDueAt).format('MMM D, HH:mm')}</strong>
          </div>
        </header>

        <div className="ticket-grid">
          <article>
            <h3 id="ticket-overview-heading">Description</h3>
            <p>{ticket.description}</p>
          </article>
          <aside className="ticket-meta-panel" aria-label="Ticket metadata">
            <dl>
              <div>
                <dt>Assignee</dt>
                <dd>
                  {canEditWorkflow ? (
                    <select
                      className="select-control"
                      value={ticket.assigneeId ?? ''}
                      onChange={handleAssigneeChange}
                      disabled={updating}
                    >
                      <option value="">Unassigned</option>
                      {assignmentOptions.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.fullName} · {member.role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    ticket.assigneeName ?? 'Unassigned'
                  )}
                </dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>
                  <form className="inline-form" onSubmit={handleCategorySubmit}>
                    <input
                      type="text"
                      value={categoryDraft}
                      placeholder="Add category"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setCategoryDraft(event.target.value)}
                    />
                    <button className="secondary" type="submit" disabled={updating}>
                      Save
                    </button>
                  </form>
                </dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{dayjs(ticket.updatedAt).fromNow()}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="card participants" aria-labelledby="participants-heading">
        <h3 id="participants-heading">Participants</h3>
        <ul>
          {participantsList.map((participant) => (
            <li key={participant.id}>
              <strong>{participant.fullName}</strong>
              <span className="role-chip">{formatRole(participant.role)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" aria-labelledby="timeline-heading">
        <h3 id="timeline-heading">Timeline</h3>
        {ticket.timeline.length === 0 ? (
          <p>No activity yet.</p>
        ) : (
          <ul className="timeline">
            {ticket.timeline.map((event) => (
              <li key={event.id}>
                <div className="timeline-meta">
                  <span>{event.description}</span>
                  <time>{dayjs(event.createdAt).format('MMM D, HH:mm')}</time>
                </div>
                <p className="timeline-actor">
                  {event.actorName}
                  {event.actorRole && ` · ${formatRole(event.actorRole)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="comments-heading">
        <h3 id="comments-heading">Comments</h3>
        {ticket.comments.length === 0 && <p>No comments yet.</p>}
        <div className="comments">
          {ticket.comments.map((commentNode) => (
            <CommentThread key={commentNode.id} comment={commentNode} depth={0} />
          ))}
        </div>
        <form className="comment-form" onSubmit={handleCommentSubmit}>
          <label htmlFor="comment-body" className="field-label">
            Add a comment
          </label>
          <textarea
            id="comment-body"
            rows={4}
            placeholder="Share an update"
            value={comment}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setComment(event.target.value)}
            aria-label="Comment body"
          />
          <div className="form-actions">
            <button className="primary" type="submit" disabled={comment.trim().length === 0}>
              Post comment
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

const CommentThread = ({ comment, depth }: { comment: CommentNode; depth: number }) => (
  <div className="comment" style={{ marginInlineStart: depth * 16 }}>
    <div className="comment-meta">
      <span>
        {comment.authorName} · {formatRole(comment.authorRole)}
      </span>
      <time>{dayjs(comment.createdAt).fromNow()}</time>
    </div>
    <p>{comment.body}</p>
    {comment.replies.length > 0 &&
      comment.replies.map((reply) => <CommentThread key={reply.id} comment={reply} depth={depth + 1} />)}
  </div>
);

export default TicketDetailPage;

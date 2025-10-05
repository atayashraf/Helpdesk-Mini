import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import api, { parseError } from '../api/client';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';

type SupportMember = {
  id: string;
  fullName: string;
  role: string;
};

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const NewTicketPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportTeam, setSupportTeam] = useState<SupportMember[]>([]);

  const canAssign = user?.role === 'agent' || user?.role === 'admin';

  useEffect(() => {
    const fetchSupportTeam = async () => {
      if (!canAssign) return;
      try {
        const response = await api.get<{ data: { members: SupportMember[] } }>('/tickets/support-team');
        setSupportTeam(response.data.data.members);
      } catch (err) {
        pushToast({ tone: 'error', message: 'Unable to load support roster' });
      }
    };
    fetchSupportTeam();
  }, [canAssign, pushToast]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/tickets', {
        title,
        description,
        priority,
        category: category || undefined,
        assigneeId: canAssign && assigneeId ? assigneeId : undefined,
      });
      const ticketId = response.data.data.ticket.id;
      pushToast({ tone: 'success', message: 'Ticket created' });
      navigate(`/tickets/${ticketId}`);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>New Ticket</h2>
          <p className="subtitle">Create a ticket to alert the support team</p>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <label htmlFor="ticket-title" className="field-label">
          Title
        </label>
        <input
          id="ticket-title"
          type="text"
          value={title}
          maxLength={120}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
          required
        />
        <small className="hint">Aim for a short, descriptive subject (120 characters max).</small>

        <label htmlFor="ticket-description" className="field-label">
          Description
        </label>
        <textarea
          id="ticket-description"
          rows={6}
          value={description}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value)}
          required
        />
        <small className="hint">Provide context, steps to reproduce, and expected behavior.</small>

        <label htmlFor="ticket-priority" className="field-label">
          Priority
        </label>
        <select
          className="select-control"
          id="ticket-priority"
          value={priority}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => setPriority(event.target.value)}
        >
          {priorities.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label htmlFor="ticket-category" className="field-label">
          Category (optional)
        </label>
        <input
          id="ticket-category"
          type="text"
          value={category}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setCategory(event.target.value)}
          placeholder="e.g. Networking, Billing"
        />

        {canAssign && (
          <>
            <label htmlFor="ticket-assignee" className="field-label">
              Assign to
            </label>
            <select
              className="select-control"
              id="ticket-assignee"
              value={assigneeId}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setAssigneeId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {supportTeam.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName} · {member.role}
                </option>
              ))}
            </select>
          </>
        )}

        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create ticket'}
        </button>
      </form>
    </div>
  );
};

export default NewTicketPage;

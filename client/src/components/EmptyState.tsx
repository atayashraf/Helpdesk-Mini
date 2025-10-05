import { ReactNode } from 'react';

type EmptyStateProps = {
  icon?: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export const EmptyState = ({ icon = '📋', title, description, action }: EmptyStateProps) => (
  <div className="empty-state">
    <div className="empty-state-icon" role="img" aria-label="Empty state icon">
      {icon}
    </div>
    <h3>{title}</h3>
    <p>{description}</p>
    {action && <div>{action}</div>}
  </div>
);

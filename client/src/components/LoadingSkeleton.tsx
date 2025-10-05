export const TicketSkeleton = () => (
  <div className="skeleton-ticket">
    <div className="skeleton skeleton-line" />
    <div className="skeleton skeleton-line short" />
    <div className="skeleton-badges">
      <div className="skeleton skeleton-badge" />
      <div className="skeleton skeleton-badge" />
    </div>
  </div>
);

export const TicketListSkeleton = ({ count = 5 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <TicketSkeleton key={index} />
    ))}
  </>
);

export const ContentSkeleton = () => (
  <div className="card">
    <div className="skeleton skeleton-line" style={{ width: '30%', marginBottom: '1.5rem' }} />
    <div className="skeleton skeleton-line" />
    <div className="skeleton skeleton-line" />
    <div className="skeleton skeleton-line shorter" />
  </div>
);

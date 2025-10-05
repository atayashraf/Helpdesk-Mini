type CommentRow = {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
};

type CommentNode = CommentRow & {
  replies: CommentNode[];
};

export const buildCommentTree = (rows: CommentRow[]): CommentNode[] => {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const row of rows) {
    map.set(row.id, { ...row, replies: [] });
  }

  for (const row of rows) {
    const node = map.get(row.id)!;
    if (row.parent_comment_id && map.has(row.parent_comment_id)) {
      map.get(row.parent_comment_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
};

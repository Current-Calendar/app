export interface CommentItem {
  id: number;
  author: number;
  author_username: string;
  body: string;
  parent: number | null;
  root: number;
  replies_count: number;
  created_at: string;
  parent_preview: any;
}

export interface CommentsResponse {
  results: CommentItem[];
  next_cursor: string | null;
  has_more: boolean;
}
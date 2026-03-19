import apiClient from "./api-client";
import { CommentsResponse } from "@/types/comments";

export const getComments = async ({
  targetType,
  targetId,
  cursor,
}: {
  targetType: "EVENT" | "CALENDAR";
  targetId: number;
  cursor?: string | null;
}): Promise<CommentsResponse> => {
  let url = `/comments/?target_type=${targetType}&target_id=${targetId}`;
  if (cursor) url += `&cursor=${cursor}`;
  return apiClient.get<CommentsResponse>(url);
};

export const getReplies = async ({
  rootId,
  cursor,
}: {
  rootId: number;
  cursor?: string | null;
}): Promise<CommentsResponse> => {
  let url = `/comments/${rootId}/replies/`;
  if (cursor) url += `?cursor=${cursor}`;
  return apiClient.get<CommentsResponse>(url);
};

export const createComment = async ({
  targetType,
  targetId,
  body,
  parentId,
}: {
  targetType: "EVENT" | "CALENDAR";
  targetId: number;
  body: string;
  parentId?: number;
}) => {
  return apiClient.post("/comments/", {
    target_type: targetType,
    target_id: targetId,
    body,
    parent_id: parentId ?? null,
  });
};

export const deleteComment = async (commentId: number) => {
  return apiClient.delete(`/comments/${commentId}/delete/`);
};
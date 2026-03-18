import apiClient from "./api-client";
import { CommentsResponse } from "@/types/comments";

/**
 * 🔹 Obtener comentarios (roots)
 */
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

/**
 * 🔹 Obtener replies de un comentario root
 */
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

/**
 * 🔹 Crear comentario (root o reply)
 */
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

/**
 * 🔹 Borrar comentario
 */
export const deleteComment = async (commentId: number) => {
  return apiClient.delete(`/comments/${commentId}/delete/`);
};
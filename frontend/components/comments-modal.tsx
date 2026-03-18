import {
  View,
  Text,
  Modal,
  StyleSheet,
  Image,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import {
  getComments,
  getReplies,
  createComment,
  deleteComment,
} from "@/services/comments";
import { CommentItem } from "@/types/comments";
import apiClient from "@/services/api-client";

const BG = "#FFFFFF";
const TEXT = "#10464D";
const WHITE = "#FFFFFF";
const BORDER = "#EAEAEA";
const MUTED = "#7A7468";
const DANGER = "#C75146";

export default function CommentsModal({
  visible,
  onClose,
  event,
}: any) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);

  const [openReplies, setOpenReplies] = useState<Record<number, boolean>>({});
  const [repliesByRoot, setRepliesByRoot] = useState<Record<number, CommentItem[]>>({});
  const [loadingRepliesByRoot, setLoadingRepliesByRoot] = useState<Record<number, boolean>>({});

  const currentUserId = apiClient.user?.id ? Number(apiClient.user.id) : null;

  useEffect(() => {
    if (visible && event) {
      loadComments();
    }

    if (!visible) {
      setComments([]);
      setText("");
      setReplyTo(null);
      setLoading(false);
      setSending(false);
      setOpenMenuId(null);
      setDeleteModalVisible(false);
      setCommentToDelete(null);
      setOpenReplies({});
      setRepliesByRoot({});
      setLoadingRepliesByRoot({});
    }
  }, [visible, event]);

  const rootComments = useMemo(
    () => comments.filter((c) => c.parent == null),
    [comments]
  );

  const loadComments = async () => {
    if (!event?.id) return;

    try {
      setLoading(true);
      const res = await getComments({
        targetType: "EVENT",
        targetId: Number(event.id),
      });
      setComments(res.results || []);
    } catch (e) {
      console.log("Error cargando comentarios:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadRepliesForRoot = async (rootId: number) => {
    try {
      setLoadingRepliesByRoot((prev) => ({ ...prev, [rootId]: true }));
      const res = await getReplies({ rootId });
      setRepliesByRoot((prev) => ({
        ...prev,
        [rootId]: res.results || [],
      }));
    } catch (e) {
      console.log("Error cargando respuestas:", e);
    } finally {
      setLoadingRepliesByRoot((prev) => ({ ...prev, [rootId]: false }));
    }
  };

  const toggleReplies = async (rootId: number) => {
    const isOpen = openReplies[rootId];

    if (isOpen) {
      setOpenReplies((prev) => ({ ...prev, [rootId]: false }));
      return;
    }

    setOpenReplies((prev) => ({ ...prev, [rootId]: true }));

    if (!repliesByRoot[rootId]) {
      await loadRepliesForRoot(rootId);
    }
  };

  const handleReply = (comment: CommentItem) => {
    setReplyTo(comment);
    setOpenMenuId(null);

    const targetRootId = comment.parent == null ? comment.id : comment.root;
    setOpenReplies((prev) => ({ ...prev, [targetRootId]: true }));
  };

  const handleSubmit = async () => {
    if (!text.trim() || !event?.id || sending) return;

    try {
      setSending(true);

      await createComment({
        targetType: "EVENT",
        targetId: Number(event.id),
        body: text.trim(),
        parentId: replyTo?.id,
      });

      const repliedRootId =
        replyTo?.parent == null ? replyTo?.id : replyTo?.root;

      setText("");
      setReplyTo(null);
      setOpenMenuId(null);

      await loadComments();

      if (repliedRootId) {
        setOpenReplies((prev) => ({ ...prev, [repliedRootId]: true }));
        await loadRepliesForRoot(repliedRootId);
      }
    } catch (e: any) {
      console.log("Error creando comentario:", e);
      Alert.alert("Error", "No se pudo publicar el comentario.");
    } finally {
      setSending(false);
    }
  };

  const askDeleteComment = (commentId: number) => {
    setOpenMenuId(null);
    setCommentToDelete(commentId);
    setDeleteModalVisible(true);
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      const deletedComment =
        comments.find((c) => c.id === commentToDelete) ||
        Object.values(repliesByRoot).flat().find((c) => c.id === commentToDelete);

      await deleteComment(commentToDelete);

      setComments((prev) => {
        const filtered = prev.filter((c) => c.id !== commentToDelete);

        if (deletedComment && deletedComment.parent != null) {
          return filtered.map((c) =>
            c.id === deletedComment.root
              ? { ...c, replies_count: Math.max(0, c.replies_count - 1) }
              : c
          );
        }

        return filtered;
      });

      setRepliesByRoot((prev) => {
        const updated: Record<number, CommentItem[]> = {};
        Object.entries(prev).forEach(([rootId, replyList]) => {
          updated[Number(rootId)] = replyList.filter((c) => c.id !== commentToDelete);
        });
        return updated;
      });

      if (replyTo?.id === commentToDelete) {
        setReplyTo(null);
      }

      if (deletedComment?.parent != null) {
        await loadRepliesForRoot(deletedComment.root);
      }

      await loadComments();
    } catch (e: any) {
      console.log("Error eliminando comentario:", e);
      console.log("Status:", e?.status);
      console.log("Data:", e?.data);
      Alert.alert("Error", "No se pudo eliminar el comentario.");
    } finally {
      setDeleteModalVisible(false);
      setCommentToDelete(null);
    }
  };

  const renderReplyItem = (reply: CommentItem) => {
    const isMine =
      currentUserId !== null && Number(reply.author) === currentUserId;
    const isMenuOpen = openMenuId === reply.id;

    const isReply = reply.id !== reply.root;
    const showDeletedParent = isReply && !reply.parent_preview;

    return (
      <View key={reply.id} style={styles.replyItem}>
        <View style={styles.replyIndentLine} />

        <View style={styles.replyContent}>
          {reply.parent_preview ? (
            <View style={styles.parentPreviewBox}>
              <Text style={styles.parentPreviewText} numberOfLines={2}>
                <Text style={styles.parentPreviewUser}>
                  @{reply.parent_preview.author_username}{" "}
                </Text>
                {reply.parent_preview.body}
              </Text>
            </View>
          ) : showDeletedParent ? (
            <View style={styles.parentPreviewBox}>
              <Text style={styles.parentPreviewDeleted}>comentario eliminado</Text>
            </View>
          ) : null}

          <View style={styles.commentTopRow}>
            <View style={styles.commentTextWrap}>
              <Text style={styles.commentText}>
                <Text style={styles.username}>{reply.author_username} </Text>
                {reply.body}
              </Text>
            </View>

            <View style={styles.actionsWrap}>
              {isMine && (
                <Pressable
                  onPress={() => setOpenMenuId(isMenuOpen ? null : reply.id)}
                  hitSlop={8}
                  style={styles.menuButton}
                >
                  <Text style={styles.menuDots}>⋯</Text>
                </Pressable>
              )}

              {isMenuOpen && isMine && (
                <View style={styles.menu}>
                  <Pressable
                    onPress={() => askDeleteComment(reply.id)}
                    style={styles.menuItem}
                  >
                    <Text style={styles.menuDeleteText}>Eliminar comentario</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          <View style={styles.commentBottomRow}>
            <Pressable onPress={() => handleReply(reply)} hitSlop={4}>
              <Text style={styles.replyActionText}>Responder</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderComment = ({ item }: { item: CommentItem }) => {
    const isMine = currentUserId !== null && Number(item.author) === currentUserId;
    const isMenuOpen = openMenuId === item.id;
    const replies = repliesByRoot[item.id] || [];
    const repliesOpen = !!openReplies[item.id];
    const loadingReplies = !!loadingRepliesByRoot[item.id];

    return (
      <View style={styles.comment}>
        <View style={styles.commentTopRow}>
          <View style={styles.commentTextWrap}>
            <Text style={styles.commentText}>
              <Text style={styles.username}>{item.author_username} </Text>
              {item.body}
            </Text>
          </View>

          <View style={styles.actionsWrap}>
            {isMine && (
              <Pressable
                onPress={() => setOpenMenuId(isMenuOpen ? null : item.id)}
                hitSlop={8}
                style={styles.menuButton}
              >
                <Text style={styles.menuDots}>⋯</Text>
              </Pressable>
            )}

            {isMenuOpen && isMine && (
              <View style={styles.menu}>
                <Pressable
                  onPress={() => askDeleteComment(item.id)}
                  style={styles.menuItem}
                >
                  <Text style={styles.menuDeleteText}>Eliminar comentario</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        <View style={styles.commentBottomRow}>
          <Pressable onPress={() => handleReply(item)} hitSlop={4}>
            <Text style={styles.replyActionText}>Responder</Text>
          </Pressable>

          {item.replies_count > 0 && (
            <Pressable
              onPress={() => toggleReplies(item.id)}
              hitSlop={4}
              style={styles.viewRepliesButton}
            >
              <Text style={styles.viewRepliesText}>
                {repliesOpen
                  ? "Ocultar respuestas"
                  : `Ver ${
                      item.replies_count === 1 ? "respuesta" : "respuestas"
                    }`}
              </Text>
            </Pressable>
          )}
        </View>

        {repliesOpen && (
          <View style={styles.repliesContainer}>
            {loadingReplies ? (
              <View style={styles.repliesLoading}>
                <ActivityIndicator size="small" color={TEXT} />
              </View>
            ) : replies.length > 0 ? (
              replies.map(renderReplyItem)
            ) : (
              <Text style={styles.noRepliesText}>No hay respuestas todavía</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={() => setOpenMenuId(null)}>
          <Pressable style={styles.container} onPress={() => setOpenMenuId(null)}>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>

            <Image source={{ uri: event?.image }} style={styles.image} />

            <View style={styles.right}>
              <View style={styles.header}>
                <Text style={styles.title} numberOfLines={2}>
                  {event?.title}
                </Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.commentsArea}>
                {loading ? (
                  <Text style={styles.emptyText}>Cargando comentarios...</Text>
                ) : (
                  <FlatList
                    data={rootComments}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.commentsList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>No hay comentarios todavía</Text>
                    }
                    renderItem={renderComment}
                  />
                )}
              </View>

              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                {replyTo && (
                  <View style={styles.replyingRow}>
                    <Text style={styles.replying}>
                      Respondiendo a @{replyTo.author_username}
                    </Text>

                    <Pressable onPress={() => setReplyTo(null)}>
                      <Text style={styles.cancelReply}>✕</Text>
                    </Pressable>
                  </View>
                )}

                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Añade un comentario..."
                    placeholderTextColor={MUTED}
                    value={text}
                    onChangeText={setText}
                    editable={!sending}
                    multiline={false}
                  />

                  <Pressable onPress={handleSubmit} disabled={sending || !text.trim()}>
                    <Text
                      style={[
                        styles.send,
                        (sending || !text.trim()) && styles.sendDisabled,
                      ]}
                    >
                      {sending ? "..." : "Publicar"}
                    </Text>
                  </Pressable>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setCommentToDelete(null);
        }}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Eliminar comentario</Text>
            <Text style={styles.confirmText}>
              ¿Seguro que quieres eliminar este comentario?
            </Text>

            <View style={styles.confirmActions}>
              <Pressable
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setCommentToDelete(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.confirmButton, styles.deleteButton]}
                onPress={handleDeleteComment}
              >
                <Text style={styles.deleteButtonText}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  container: {
    width: "75%",
    height: "75%",
    backgroundColor: BG,
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
  },

  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 40,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    fontSize: 22,
    color: TEXT,
  },

  image: {
    width: "45%",
    height: "100%",
    backgroundColor: "#ddd",
  },

  right: {
    width: "55%",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    justifyContent: "space-between",
    backgroundColor: BG,
  },

  header: {
    paddingRight: 34,
    paddingBottom: 10,
    backgroundColor: BG,
  },

  title: {
    fontWeight: "700",
    fontSize: 16,
    color: "#111",
  },

  divider: {
    height: 0.5,
    backgroundColor: "rgba(0,0,0,0.15)",
    marginTop: 10,
  },

  commentsArea: {
    flex: 1,
    paddingTop: 10,
    backgroundColor: BG,
  },

  commentsList: {
    paddingBottom: 16,
  },

  emptyText: {
    color: MUTED,
    fontSize: 15,
  },

  comment: {
    marginBottom: 16,
    position: "relative",
  },

  commentTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },

  commentTextWrap: {
    flex: 1,
    paddingRight: 4,
  },

  commentText: {
    color: "#111",
    lineHeight: 20,
  },

  username: {
    fontWeight: "700",
    color: "#111",
  },

  actionsWrap: {
    position: "relative",
    alignItems: "flex-end",
  },

  menuButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },

  menuDots: {
    fontSize: 18,
    color: "#666",
    lineHeight: 18,
  },

  menu: {
    position: "absolute",
    top: 24,
    right: 0,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    minWidth: 155,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    zIndex: 30,
  },

  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  menuDeleteText: {
    color: DANGER,
    fontWeight: "600",
    fontSize: 14,
  },

  commentBottomRow: {
    marginTop: 5,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  replyActionText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "600",
  },

  viewRepliesButton: {
    alignSelf: "flex-start",
  },

  viewRepliesText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },

  repliesContainer: {
    marginTop: 10,
    marginLeft: 20,
    paddingLeft: 12,
  },

  repliesLoading: {
    paddingVertical: 8,
    alignItems: "flex-start",
  },

  noRepliesText: {
    color: MUTED,
    fontSize: 13,
  },

  replyItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  replyIndentLine: {
    width: 2,
    backgroundColor: "#D8D8D8",
    borderRadius: 999,
    marginRight: 10,
    alignSelf: "stretch",
  },

  replyContent: {
    flex: 1,
  },

  parentPreviewBox: {
    backgroundColor: "#F7F7F7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#EFEFEF",
  },

  parentPreviewText: {
    color: "#555",
    fontSize: 12,
    lineHeight: 17,
  },

  parentPreviewUser: {
    fontWeight: "700",
    color: "#444",
  },

  parentPreviewDeleted: {
    color: "#888",
    fontSize: 12,
    fontStyle: "italic",
  },

  replyingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  replying: {
    fontSize: 12,
    color: "#666",
  },

  cancelReply: {
    fontSize: 16,
    color: "#999",
    paddingHorizontal: 4,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
    minHeight: 54,
    backgroundColor: BG,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    paddingVertical: 8,
    paddingRight: 12,
    backgroundColor: BG,
  },

  send: {
    color: TEXT,
    fontWeight: "700",
    fontSize: 15,
    paddingHorizontal: 8,
  },

  sendDisabled: {
    opacity: 0.4,
  },

  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  confirmCard: {
    width: 360,
    maxWidth: "90%",
    backgroundColor: BG,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },

  confirmTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 10,
  },

  confirmText: {
    fontSize: 15,
    color: "#2E2E2E",
    lineHeight: 22,
    marginBottom: 20,
  },

  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },

  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 110,
    alignItems: "center",
  },

  cancelButton: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
  },

  cancelButtonText: {
    color: TEXT,
    fontWeight: "600",
  },

  deleteButton: {
    backgroundColor: DANGER,
  },

  deleteButtonText: {
    color: WHITE,
    fontWeight: "700",
  },
});
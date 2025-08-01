import { useState, useEffect, useCallback } from "react";
import { conversationAPI } from "../services/api";

/**
 * 특정 대화의 메시지 관리를 위한 커스텀 훅
 * 페이지네이션과 실시간 메시지 추가 지원
 */
export const useMessages = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);

  // 메시지 로드
  const loadMessages = useCallback(
    async (reset = false) => {
      if (!conversationId || loading) {
        console.log("useMessages - 메시지 로드 중단:", {
          conversationId,
          loading,
        });
        return;
      }

      console.log("useMessages - 메시지 로드 시작:", {
        conversationId,
        reset,
        cursor: reset ? null : nextCursor,
        currentMessagesCount: messages.length,
      });

      setLoading(true);
      setError(null);

      try {
        const cursor = reset ? null : nextCursor;
        const response = await conversationAPI.getMessages(
          conversationId,
          cursor
        );

        console.log("useMessages - API 응답:", {
          conversationId,
          messagesReceived: response.messages?.length || 0,
          hasMore: response.hasMore,
          nextCursor: response.nextCursor,
          reset,
        });

        if (reset) {
          setMessages(response.messages);
        } else {
          // 이전 메시지들을 앞에 추가 (페이지네이션)
          setMessages((prev) => [...response.messages, ...prev]);
        }

        setHasMore(response.hasMore);
        setNextCursor(response.nextCursor);
      } catch (err) {
        console.error("메시지 로드 실패:", err);
        console.error("실패한 conversationId:", conversationId);
        setError("메시지를 불러오는데 실패했습니다.");

        // API 실패시 빈 배열로 설정
        if (reset) {
          console.log("useMessages - API 실패, 빈 배열로 초기화");
          setMessages([]);
          setHasMore(false);
          setNextCursor(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [conversationId, loading, nextCursor, messages.length]
  );

  // 새 메시지 추가 (실시간)
  const addMessage = useCallback((message) => {
    const newMessage = {
      id: message.timestamp || new Date().toISOString(),
      role: message.role,
      content: message.content,
      tokenCount: message.tokenCount || 0,
      timestamp: message.timestamp || new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  }, []);

  // 메시지 업데이트 (스트리밍 중 내용 업데이트)
  const updateMessage = useCallback((messageId, updates) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
    );
  }, []);

  // 메시지 삭제
  const removeMessage = useCallback((messageId) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  // 이전 메시지 로드 (스크롤 최상단에서)
  const loadPreviousMessages = useCallback(() => {
    if (hasMore && !loading) {
      return loadMessages(false);
    }
    return Promise.resolve();
  }, [hasMore, loading, loadMessages]);

  // 메시지 초기화 (새 대화 시작시)
  const clearMessages = useCallback(() => {
    setMessages([]);
    setHasMore(true);
    setNextCursor(null);
    setError(null);
  }, []);

  // conversationId 변경시 메시지 로드
  useEffect(() => {
    console.log("🔍 [DEBUG] useMessages - conversationId 변경 감지:", {
      conversationId,
      conversationIdType: typeof conversationId,
      isConversationIdNull: conversationId === null,
      isConversationIdUndefined: conversationId === undefined,
      previousConversationId: conversationId, // 이전 값을 추적하기 어려우므로 현재 값만 표시
    });

    if (conversationId) {
      console.log(
        "🔍 [DEBUG] useMessages - 메시지 클리어 및 로드 시작:",
        conversationId
      );
      clearMessages();
      loadMessages(true);
    } else {
      console.log(
        "🔍 [DEBUG] useMessages - conversationId가 null/undefined, 메시지 클리어"
      );
      clearMessages();
    }
  }, [conversationId]);

  return {
    messages,
    loading,
    error,
    hasMore,
    addMessage,
    updateMessage,
    removeMessage,
    loadPreviousMessages,
    clearMessages,
    refresh: () => loadMessages(true),
  };
};

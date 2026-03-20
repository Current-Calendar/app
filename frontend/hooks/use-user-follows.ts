import { useEffect, useState, useCallback } from 'react';
import apiClient, { ApiError } from '@/services/api-client';

export type FollowUser = {
  id: number;
  username: string;
  photo?: string | null;
  bio?: string | null;
  is_following?: boolean;
  total_followers?: number;
  total_following?: number;
};

type FollowListResponse = {
  count: number;
  results: FollowUser[];
};

export const useUserFollows = (userId?: number, enabled = true) => {
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLists = useCallback(async () => {
    if (!userId || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [followersResp, followingResp] = await Promise.all([
        apiClient.get<FollowListResponse>(`/users/${userId}/followers/`),
        apiClient.get<FollowListResponse>(`/users/${userId}/following/`),
      ]);
      setFollowers(followersResp?.results ?? []);
      setFollowing(followingResp?.results ?? []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('User not found.');
      } else {
        setError('Could not load followers. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  return {
    followers,
    following,
    loading,
    error,
    reload: fetchLists,
  };
};

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/services/api-client';

const GRAPHQL_URL = `${process.env.EXPO_PUBLIC_API_BASE}/graphql/`;

function graphqlHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = apiClient.getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export type ProfileCalendarData = {
  id: string;
  name: string;
  description?: string;
  cover?: string;
  privacy: string;
  likesCount: number;
  likedByMe: boolean;
};

export type ProfileUser = {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  pronouns?: string;
  bio?: string;
  link?: string;
  photo?: string;
  plan?: string;
};

export type ProfileQueryResult = {
  user: ProfileUser;
  totalFollowers: number;
  totalFollowing: number;
  isFollowing: boolean;
  publicCalendars: ProfileCalendarData[];
  privateCalendars: ProfileCalendarData[];
  followingCalendars: ProfileCalendarData[];
};

const USER_PROFILE_QUERY = `
  query UserProfile($username: String!) {
    userProfile(username: $username) {
      user {
        id
        username
        firstName
        lastName
        pronouns
        bio
        link
        photo
        plan
      }
      totalFollowers
      totalFollowing
      isFollowing
      publicCalendars {
        id
        name
        description
        cover
        privacy
        likesCount
        likedByMe
      }
      privateCalendars {
        id
        name
        description
        cover
        privacy
        likesCount
        likedByMe
      }
      followingCalendars {
        id
        name
        description
        cover
        privacy
        likesCount
        likedByMe
      }
    }
  }
`;

type UseProfileQueryReturn = {
  data: ProfileQueryResult | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useProfileQuery(username: string | undefined | null): UseProfileQueryReturn {
  const [data, setData] = useState<ProfileQueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!username) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: graphqlHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        query: USER_PROFILE_QUERY,
        variables: { username },
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (json.errors?.length) {
          setError(json.errors[0].message ?? 'GraphQL error');
          return;
        }
        const profile = json.data?.userProfile ?? null;
        setData(profile);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[useProfileQuery]', err);
          setError("We couldn't load this profile. Please check your connection and try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username, reloadKey]);

  return { data, loading, error, reload };
}

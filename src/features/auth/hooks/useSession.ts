import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useEffect } from 'react';

import { queryKeys } from '../../../utils/queryKeys';
import type { AppError } from '../../../types/appError';
import { authApi } from '../api';
import { useSessionStore } from '../store/sessionStore';
import type { MeResponse } from '../types';

/**
 * `GET /auth/me` — the canonical, revalidated session.
 *
 * The session store holds a cached user so the UI can render instantly on cold
 * start; this hook is what keeps that cache honest. It is only enabled while a
 * session is considered authenticated, so a signed-out app never fires it.
 *
 * `data` is mirrored back into the store on success so non-React consumers (the
 * push service, the axios handler) see fresh permissions without subscribing to
 * React Query.
 */
export function useSession(): UseQueryResult<MeResponse, AppError> {
    const status = useSessionStore(state => state.status);
    const setUser = useSessionStore(state => state.setUser);

    const query = useQuery<MeResponse, AppError>({
        queryKey: queryKeys.session.me(),
        queryFn: () => authApi.me(),
        enabled: status === 'authenticated',
        // The user record changes rarely and every screen reads its permissions.
        // Re-fetching on window focus is enough; this also avoids a request storm
        // when a user bounces between tabs.
        staleTime: 5 * 60 * 1000,
    });

    const { data } = query;

    useEffect(() => {
        if (data) {
            void setUser(data);
        }
    }, [data, setUser]);

    return query;
}

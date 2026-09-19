import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { PaginatedData } from '../../../types/api';
import type { AppError } from '../../../types/appError';
import { queryKeys } from '../../../utils/queryKeys';
import { notificationsApi } from '../api';
import type { AppNotification, NotificationListParams } from '../types';

/** `GET /notifications`. */
export function useNotifications(
    params: NotificationListParams = {},
): UseQueryResult<PaginatedData<AppNotification>, AppError> {
    return useQuery<PaginatedData<AppNotification>, AppError>({
        queryKey: queryKeys.notifications.list(params),
        queryFn: () => notificationsApi.list(params),
        // Notifications go stale quickly; the badge and list should agree.
        staleTime: 15 * 1000,
    });
}

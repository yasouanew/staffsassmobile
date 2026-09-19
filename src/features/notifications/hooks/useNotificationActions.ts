import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import type { AppError } from '../../../types/appError';
import { queryKeys } from '../../../utils/queryKeys';
import { logger } from '../../../utils/logger';
import { notificationsApi } from '../api';
import { useNotificationInboxStore } from '../store';

/**
 * Mark-as-read actions.
 *
 * ## Local first, server second
 *
 * The local inbox is written **before** the request is awaited, and the request is
 * then attempted with its failure deliberately swallowed. Two reasons:
 *
 * 1. Offline, the tap must still work. A worker who reads a shift change in a dead
 *    spot cannot be shown a red "retry" banner; the row is read, and the server finds
 *    out when connectivity returns.
 * 2. Tapping a notification you are looking at and having it stay bold because a
 *    request is slow is the single most common complaint about notification lists.
 *
 * The server remains authoritative in the other direction — see
 * [`mergeServerPage`](../../notifications/utils/inboxMerge.ts:1), which refuses to
 * revert a local read back to unread.
 */

/** True when the failure is a connectivity problem rather than a rejected write. */
function isConnectivityError(error: unknown): boolean {
    const status = (error as { status?: number } | null)?.status;

    // No status at all means the request never got a response: offline, DNS, timeout.
    return status === undefined || status === 0 || status === 408 || status >= 500;
}

export function useMarkNotificationRead(): UseMutationResult<void, AppError, string> {
    const queryClient = useQueryClient();
    const markRead = useNotificationInboxStore(state => state.markRead);

    return useMutation<void, AppError, string>({
        mutationFn: async id => {
            await markRead(id);

            try {
                await notificationsApi.markAsRead(id);
            } catch (error) {
                if (!isConnectivityError(error)) {
                    // A 403/404 is a real answer from the server: the local read state
                    // is wrong and must be re-synced rather than trusted.
                    throw error;
                }

                logger.info('[inbox] Mark-read queued locally; server unreachable');
            }
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        },
    });
}

export function useMarkAllNotificationsRead(): UseMutationResult<void, AppError, void> {
    const queryClient = useQueryClient();
    const markAllRead = useNotificationInboxStore(state => state.markAllRead);

    return useMutation<void, AppError, void>({
        mutationFn: async () => {
            await markAllRead();

            try {
                await notificationsApi.markAllAsRead();
            } catch (error) {
                if (!isConnectivityError(error)) {
                    throw error;
                }

                logger.info('[inbox] Mark-all-read queued locally; server unreachable');
            }
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        },
    });
}

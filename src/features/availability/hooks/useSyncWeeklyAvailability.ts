import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import type { AppError } from '../../../types/appError';
import { queryKeys } from '../../../utils/queryKeys';
import { availabilityApi } from '../api';
import type { Availability, SyncWeeklyAvailabilityPayload } from '../types';

type SyncArgs = { employeeId: number; payload: SyncWeeklyAvailabilityPayload };

/**
 * `PUT /employees/{employee}/availabilities/sync` — RECOMMENDED mobile save.
 * Replaces the whole week transactionally; returns the full week collection.
 */
export function useSyncWeeklyAvailability(): UseMutationResult<
    Availability[],
    AppError,
    SyncArgs
> {
    const queryClient = useQueryClient();

    return useMutation<Availability[], AppError, SyncArgs>({
        mutationFn: ({ employeeId, payload }) => availabilityApi.sync(employeeId, payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.availability.all });
        },
    });
}

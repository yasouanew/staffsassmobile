import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import type { AppError } from '../../../types/appError';
import { queryKeys } from '../../../utils/queryKeys';
import { leaveApi } from '../api';
import type { CreateLeaveRequestPayload, LeaveRequest } from '../types';

/**
 * `POST /leave-requests`.
 *
 * On success the whole leave-request list is invalidated rather than patched: the
 * server recomputes `total_days` and the request may not appear in the currently
 * filtered list (e.g. filtering by `pending` while a type auto-approves). Letting
 * the list refetch keeps the client out of the business of predicting the result.
 */
export function useCreateLeaveRequest(): UseMutationResult<
    LeaveRequest,
    AppError,
    CreateLeaveRequestPayload
> {
    const queryClient = useQueryClient();

    return useMutation<LeaveRequest, AppError, CreateLeaveRequestPayload>({
        mutationFn: payload => leaveApi.create(payload),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.leave.all });
        },
    });
}

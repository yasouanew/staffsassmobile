import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import type { AppError } from '../../../types/appError';
import { authApi } from '../../auth/api';
import type { MessageOnlyResponse } from '../../auth/types';

/**
 * `POST /auth/email/resend`.
 *
 * Returns a success message whether the address was already verified or a fresh
 * email was sent, so the UI should present the response message rather than assume
 * a new mail went out.
 */
export function useResendVerification(): UseMutationResult<MessageOnlyResponse, AppError, void> {
    return useMutation<MessageOnlyResponse, AppError, void>({
        mutationFn: () => authApi.resendVerificationEmail(),
    });
}

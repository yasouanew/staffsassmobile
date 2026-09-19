import { axiosInstance, normalizeError } from '../../../api/client';
import type { DevicePlatform } from '../../../types/api';
import type { AppError } from '../../../types/appError';

/**
 * Push token registration (spec Screen 11, APIs 5–6).
 *
 * These two calls deliberately bypass the typed `api.*` helpers and use the raw
 * `axiosInstance`, for one reason: unregistering sends a **JSON body on DELETE**,
 * which the shared helpers do not model (they treat DELETE as body-less). Going
 * through `axiosInstance` also means a failed unregister still benefits from the
 * shared interceptors — in particular the 401 handling — while keeping the helper
 * contract clean for every other endpoint.
 */

export type RegisterDeviceTokenPayload = {
    token: string;
    platform: DevicePlatform;
    device_name?: string;
    app_version?: string;
    os_version?: string;
};

/** The backend never echoes the raw token back — only safe metadata. */
export type DeviceTokenResource = {
    id: number;
    device_name: string | null;
    platform: string;
    is_active: boolean;
    last_used_at: string | null;
};

export const deviceTokenApi = {
    /**
     * `POST /device-tokens`.
     *
     * Called at three moments: right after login, on an FCM token refresh, and when
     * the user re-enables push in Settings. The backend upserts, so repeat calls are
     * safe and no client-side de-duplication is needed.
     */
    async register(payload: RegisterDeviceTokenPayload): Promise<DeviceTokenResource | undefined> {
        try {
            const response = await axiosInstance.post<{ data?: DeviceTokenResource }>(
                '/device-tokens',
                payload,
            );

            return response.data?.data;
        } catch (error) {
            throw normalizeError(error) as AppError;
        }
    },

    /** `DELETE /device-tokens` with `{ token }` in the body. */
    async unregister(token: string): Promise<void> {
        try {
            await axiosInstance.delete('/device-tokens', { data: { token } });
        } catch (error) {
            throw normalizeError(error) as AppError;
        }
    },
};

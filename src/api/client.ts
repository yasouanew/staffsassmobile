import axios, {
    AxiosError,
    type AxiosInstance,
    type AxiosRequestConfig,
    type AxiosResponse,
    type InternalAxiosRequestConfig,
} from 'axios';

import { env } from '../config/env';
import type { ApiErrorResponse, ApiSuccess } from '../types/api';
import type { AppError } from '../types/appError';
import { createTransportError, defaultMessageForKind, kindFromStatus } from '../utils/errors';
import { logger } from '../utils/logger';
import { buildAuthorizationHeader } from './tokenStore';

/**
 * The single configured axios client.
 *
 * Every HTTP call in the app goes through this instance — screen components never
 * import axios. Request/response behaviour is centralised here:
 *
 * - base URL, timeout and common headers come from [`env`](src/config/env.ts:1)
 * - the Sanctum bearer token is attached per request (read synchronously from
 *   [`tokenStore`](src/api/tokenStore.ts:1), so no async work is needed)
 * - Laravel's success envelope is unwrapped so callers receive `data` directly
 * - every failure is normalised into an [`AppError`](src/types/appError.ts:1)
 *
 * A caller registered via [`setUnauthorizedHandler`](src/api/client.ts:1) is
 * notified on 401 so the session store can clear local state and let the navigation
 * tree fall back to the Auth stack. The API layer itself never navigates.
 */

/** Laravel envelope keys that are stripped before returning data to callers. */
type RawEnvelope = ApiSuccess<unknown> & { data?: unknown };

let unauthorizedHandler: (() => void) | null = null;

/**
 * Registers the callback invoked on a 401. Set once by the session store during
 * store creation; kept as a setter rather than an import to keep the dependency
 * direction one-way (`store → api`).
 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
    unauthorizedHandler = handler;
}

const axiosInstance: AxiosInstance = axios.create({
    baseURL: env.apiBaseUrl,
    timeout: env.apiTimeoutMs,
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        // Lets the backend distinguish native traffic (used for `device_name` fallback
        // and platform analytics). The token itself is never used for authorization.
        'X-Requested-With': 'XMLHttpRequest',
    },
});

/**
 * Request interceptor — attaches credentials.
 *
 * The header is omitted entirely when there is no token rather than sent empty, so
 * public endpoints (`auth/login`, `auth/forgot-password`) behave exactly as they do
 * from a browser.
 */
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const authorization = buildAuthorizationHeader();

    if (authorization !== null) {
        config.headers.set('Authorization', authorization);
    }

    if (env.debug) {
        logger.debug(`→ ${config.method?.toUpperCase() ?? 'GET'} ${config.url ?? ''}`);
    }

    return config;
});

/**
 * Response interceptor.
 *
 * On success it unwraps `{ success, message, data }` → `data`. Endpoints that
 * return no payload (logout, mark-all-read, delete) resolve to `undefined`.
 *
 * On failure it converts the error into an `AppError` and rejects with it, so the
 * `catch` blocks and TanStack Query error handlers only ever see `AppError`.
 */
axiosInstance.interceptors.response.use(
    (response: AxiosResponse<RawEnvelope>) => {
        const body = response.data;

        if (body !== null && typeof body === 'object' && 'success' in body) {
            response.data = body.data as RawEnvelope;

            return response;
        }

        // A non-enveloped body (e.g. a proxy or gateway page) is passed through
        // untouched so callers can still inspect it; the typed API methods below
        // declare what they expect.
        return response;
    },
    (error: unknown) => Promise.reject(normalizeError(error)),
);

/** Converts anything axios can throw into an `AppError`. Exported for tests. */
export function normalizeError(error: unknown): AppError {
    if (axios.isCancel(error)) {
        return createTransportError('cancelled', error);
    }

    if (!axios.isAxiosError(error)) {
        return createTransportError('unknown', error);
    }

    const axiosError = error as AxiosError<ApiErrorResponse>;

    // No response at all: the request never completed.
    if (!axiosError.response) {
        const isTimeout = axiosError.code === AxiosError.ECONNABORTED || axiosError.code === AxiosError.ETIMEDOUT;

        const transportError = createTransportError(isTimeout ? 'timeout' : 'network', error);

        if (!isTimeout && axiosError.code === 'ERR_NETWORK') {
            return transportError;
        }

        return transportError;
    }

    const { status, data } = axiosError.response;
    const kind = kindFromStatus(status);

    // A locked company surfaces as 403 from the `company.access` middleware. The
    // message is preserved verbatim so `isCompanyAccessLocked` can detect it and the
    // UI can render the paywall copy the backend supplied.
    const serverMessage = typeof data?.message === 'string' && data.message.length > 0 ? data.message : undefined;

    const appError: AppError = {
        kind,
        status,
        message: serverMessage ?? defaultMessageForKind(kind),
        ...(data?.errors ? { fieldErrors: data.errors } : {}),
        cause: error,
    };

    if (env.debug) {
        logger.warn(`← ${status} ${axiosError.config?.url ?? ''}: ${appError.message}`);
    }

    // Session ended: tell the app to drop local auth state. Done after the error is
    // built so the caller still receives the original message.
    if (kind === 'unauthorized' && unauthorizedHandler !== null) {
        unauthorizedHandler();
    }

    return appError;
}

/**
 * Typed request helpers.
 *
 * These are the only functions feature API services use. The `TData` parameter is
 * the **unwrapped** payload — i.e. what the backend puts inside `data`, not the
 * envelope. For a paginated endpoint that means
 * `PaginatedData<Shift>` (`{ data: Shift[], meta }`), and for
 * `GET /auth/me` it means `User`.
 */
export const api = {
    async get<TData>(url: string, config?: AxiosRequestConfig): Promise<TData> {
        const response = await axiosInstance.get<TData>(url, config);

        return response.data;
    },

    async post<TData, TBody = unknown>(url: string, body?: TBody, config?: AxiosRequestConfig): Promise<TData> {
        const response = await axiosInstance.post<TData>(url, body, config);

        return response.data;
    },

    async put<TData, TBody = unknown>(url: string, body?: TBody, config?: AxiosRequestConfig): Promise<TData> {
        const response = await axiosInstance.put<TData>(url, body, config);

        return response.data;
    },

    async patch<TData, TBody = unknown>(url: string, body?: TBody, config?: AxiosRequestConfig): Promise<TData> {
        const response = await axiosInstance.patch<TData>(url, body, config);

        return response.data;
    },

    async delete<TData>(url: string, config?: AxiosRequestConfig): Promise<TData> {
        const response = await axiosInstance.delete<TData>(url, config);

        return response.data;
    },
};

/**
 * Multipart variant used by leave submission.
 *
 * `Content-Type` is intentionally left unset: the platform must generate the
 * boundary, so setting the header manually produces an unparseable body. Content is
 * built as `FormData` by the calling feature to keep this client transport-only.
 */
export async function postMultipart<TData>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig,
): Promise<TData> {
    const response = await axiosInstance.post<TData>(url, formData, {
        ...config,
        headers: {
            ...config?.headers,
            'Content-Type': 'multipart/form-data',
        },
    });

    return response.data;
}

export { axiosInstance };

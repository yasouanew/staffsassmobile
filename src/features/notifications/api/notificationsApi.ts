import { api } from '../../../api/client';
import type {
    NotificationListParams,
    NotificationListResponse,
    UnreadCountResponse,
} from '../types';

/**
 * Notification API service.
 *
 * Notifications are always scoped to the authenticated user server-side, so no
 * `employee_id` is involved here.
 */
export const notificationsApi = {
    /**
     * `GET /notifications?filter=unread`.
     *
     * The controller returns a custom wrapper (`data.notifications` + `data.unread_count`
     * + `data.meta`) rather than a Laravel paginator, so the rows are read from the
     * `notifications` key. See spec §6 API 1.
     */
    async list(params: NotificationListParams = {}): Promise<NotificationListResponse> {
        return api.get<NotificationListResponse>('/notifications', { params });
    },

    /** `GET /notifications/unread-count` — drives the tab badge. */
    async unreadCount(): Promise<UnreadCountResponse> {
        return api.get<UnreadCountResponse>('/notifications/unread-count');
    },

    /** `POST /notifications/{id}/read` — idempotent. */
    async markAsRead(id: string): Promise<void> {
        await api.post<void>(`/notifications/${id}/read`);
    },

    /** `POST /notifications/read-all`. */
    async markAllAsRead(): Promise<void> {
        await api.post<void>('/notifications/read-all');
    },
};

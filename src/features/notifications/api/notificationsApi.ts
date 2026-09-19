import { api } from '../../../api/client';
import type { PaginatedData } from '../../../types/api';
import type {
    AppNotification,
    NotificationListParams,
    UnreadCountResponse,
} from '../types';

/**
 * Notification API service.
 *
 * Notifications are always scoped to the authenticated user server-side, so no
 * `employee_id` is involved here.
 */
export const notificationsApi = {
    /** `GET /notifications?filter=unread` — paginated. */
    async list(params: NotificationListParams = {}): Promise<PaginatedData<AppNotification>> {
        return api.get<PaginatedData<AppNotification>>('/notifications', { params });
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

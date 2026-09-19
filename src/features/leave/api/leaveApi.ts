import { api, postMultipart } from '../../../api/client';
import type { PaginatedData } from '../../../types/api';
import type {
    CreateLeaveRequestPayload,
    LeaveRequest,
    LeaveRequestListParams,
    LeaveType,
    LeaveTypeListParams,
} from '../types';

/**
 * Leave API service — spec Screens 8–10 §6.
 *
 * `GET /leave-requests` is auto-scoped server-side, so `employee_id` is never sent.
 * Contrast with [`shiftsApi`](src/features/shifts/api/shiftsApi.ts:1) and
 * [`rosterApi`](src/features/roster/api/rosterApi.ts:1), which require it.
 */
export const leaveApi = {
    /**
     * `GET /leave-requests` — **auto-scoped** to the authenticated employee.
     * Requires `leave_request.view`. Query: `status`, `leave_type_id`,
     * `date_from`, `date_to`, `per_page`. Client MUST NOT send `employee_id`.
     */
    async list(params: LeaveRequestListParams = {}): Promise<PaginatedData<LeaveRequest>> {
        const { status, leave_type_id, date_from, date_to, page, per_page } = params;

        return api.get<PaginatedData<LeaveRequest>>('/leave-requests', {
            params: {
                ...(status !== undefined ? { status } : {}),
                ...(leave_type_id !== undefined ? { leave_type_id } : {}),
                ...(date_from !== undefined ? { date_from } : {}),
                ...(date_to !== undefined ? { date_to } : {}),
                ...(page !== undefined ? { page } : {}),
                ...(per_page !== undefined ? { per_page } : {}),
            },
        });
    },

    /** `GET /leave-requests/{id}` — the server enforces ownership (403 other employee, 404 unknown). */
    async detail(id: number): Promise<LeaveRequest> {
        return api.get<LeaveRequest>(`/leave-requests/${id}`);
    },

    /**
     * `POST /leave-requests` — requires `leave_request.create`.
     *
     * Content-Type: `multipart/form-data` when attachments present, else JSON.
     * `company_id`/`employee_id` are omitted (server injects). `total_days` is a
     * hint only — the server recalculates via `LeaveRequestService`.
     */
    async create(payload: CreateLeaveRequestPayload): Promise<LeaveRequest> {
        if (payload.attachments !== undefined && payload.attachments.length > 0) {
            const formData = new FormData();

            formData.append('leave_type_id', String(payload.leave_type_id));
            formData.append('start_date', payload.start_date);
            formData.append('end_date', payload.end_date);

            if (payload.start_session !== undefined) {
                formData.append('start_session', payload.start_session);
            }

            if (payload.end_session !== undefined) {
                formData.append('end_session', payload.end_session);
            }

            if (payload.total_days !== undefined) {
                formData.append('total_days', String(payload.total_days));
            }

            if (payload.reason !== undefined && payload.reason.length > 0) {
                formData.append('reason', payload.reason);
            }

            payload.attachments.forEach(attachment => {
                formData.append('attachments[]', {
                    uri: attachment.uri,
                    name: attachment.name,
                    type: attachment.mimeType,
                } as unknown as Blob);
            });

            return postMultipart<LeaveRequest>('/leave-requests', formData);
        }

        const jsonBody = { ...payload };
        delete jsonBody.attachments;

        return api.post<LeaveRequest, typeof jsonBody>('/leave-requests', jsonBody);
    },

    /**
     * `GET /leave-types` — for the picker.
     *
     * **Backend gap (G2):** this endpoint requires `leave_type.view` which the
     * employee role does not hold, so it currently returns 403 for employees.
     * Callers must handle 403 by showing the "types unavailable — contact admin"
     * fallback with retry, not a fatal error (spec Screen 9 §5).
     */
    async types(params: LeaveTypeListParams = {}): Promise<PaginatedData<LeaveType> | LeaveType[]> {
        return api.get<PaginatedData<LeaveType> | LeaveType[]>('/leave-types', { params });
    },
};

// NOTE (G6): there is deliberately no `cancel` method. The backend exposes no
// withdraw endpoint for leave requests, so the UI cannot promise one. Adding a
// method here to call an invented route would be the exact kind of guessed
// behaviour the specification forbids.
// NOTE: `approve` / `reject` endpoints exist but are forbidden for employees by
// design — mobile MUST NOT call them (spec Screen 10 §6).

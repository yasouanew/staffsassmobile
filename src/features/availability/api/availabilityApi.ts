import { api } from '../../../api/client';
import type {
    Availability,
    CreateAvailabilityPayload,
    SyncWeeklyAvailabilityPayload,
    UpdateAvailabilityPayload,
} from '../types';

/**
 * Availability API — spec Screen 7 §6.
 *
 * All routes live under `/employees/{employee}/availabilities` where `employee`
 * is `employees.id` (NOT `users.id`) — resolve via `me.employee_id`.
 *
 * - List is NOT paginated (plain collection) ordered `day_of_week,start_time`.
 * - Sync (`PUT …/sync`) is RECOMMENDED for mobile save — replaces ALL rows
 *   transactionally.
 * - Show/Update/Delete operate on a single slot; 404 when the slot belongs to
 *   another employee.
 *
 * BACKEND GAP (BLOCKING): `index` authorizes `employee.view` and
 * `store/sync/update/destroy` authorize `employee.update` via `EmployeePolicy`,
 * which the employee role does NOT hold — real calls 403 until the backend
 * grants scoped own-record access. Callers must surface 403 distinctly.
 */
function base(employeeId: number): string {
    return `/employees/${employeeId}/availabilities`;
}

export const availabilityApi = {
    /** `GET /employees/{employee}/availabilities` — plain collection, not paginated. */
    async list(employeeId: number): Promise<Availability[]> {
        return api.get<Availability[]>(base(employeeId));
    },

    /** `POST /employees/{employee}/availabilities` — create one slot. */
    async create(employeeId: number, payload: CreateAvailabilityPayload): Promise<Availability> {
        return api.post<Availability, CreateAvailabilityPayload>(base(employeeId), payload);
    },

    /**
     * `PUT /employees/{employee}/availabilities/sync` — RECOMMENDED mobile save.
     * Replaces the whole week transactionally; returns the full week collection.
     */
    async sync(employeeId: number, payload: SyncWeeklyAvailabilityPayload): Promise<Availability[]> {
        return api.put<Availability[], SyncWeeklyAvailabilityPayload>(`${base(employeeId)}/sync`, payload);
    },

    /** `GET /employees/{employee}/availabilities/{availability}` — single slot. */
    async show(employeeId: number, availabilityId: number): Promise<Availability> {
        return api.get<Availability>(`${base(employeeId)}/${availabilityId}`);
    },

    /** `PUT /employees/{employee}/availabilities/{availability}` — partial update. */
    async update(
        employeeId: number,
        availabilityId: number,
        payload: UpdateAvailabilityPayload,
    ): Promise<Availability> {
        return api.put<Availability, UpdateAvailabilityPayload>(
            `${base(employeeId)}/${availabilityId}`,
            payload,
        );
    },

    /** `DELETE /employees/{employee}/availabilities/{availability}`. */
    async remove(employeeId: number, availabilityId: number): Promise<void> {
        await api.delete<void>(`${base(employeeId)}/${availabilityId}`);
    },
};

import { api } from '../../../api/client';
import type { PaginatedData } from '../../../types/api';
import type { Shift, ShiftListParams } from '../types';

/**
 * Shift API service.
 *
 * Every method requires `employee_id` because the backend does not scope shifts to
 * the authenticated employee (spec §0.5, G-series note). The caller supplies it from
 * the session (`AuthUser.employee_id`); this module never guesses a default, since
 * silently omitting it returns another branch's data or a 403 depending on the
 * middleware chain.
 */
export const shiftsApi = {
    /** `GET /shifts?employee_id=&date_from=&date_to=` — paginated (spec Screen 4 API 2). */
    async list(params: ShiftListParams): Promise<PaginatedData<Shift>> {
        return api.get<PaginatedData<Shift>>('/shifts', { params });
    },

    /** `GET /shifts/{id}` — requires `shift.view`. */
    async detail(id: number): Promise<Shift> {
        return api.get<Shift>(`/shifts/${id}`);
    },
};

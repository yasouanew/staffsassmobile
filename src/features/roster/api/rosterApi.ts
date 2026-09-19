import { api } from '../../../api/client';
import type { PaginatedData } from '../../../types/api';
import type { Roster, RosterListParams } from '../types';

/**
 * Roster API service.
 *
 * As with shifts, `employee_id` must be supplied explicitly — the endpoint is not
 * auto-scoped to the token (spec §0.5). "My Roster" therefore always passes the
 * signed-in employee's id from the session.
 */
export const rosterApi = {
    /** `GET /rosters?employee_id=&date_from=&date_to=` — paginated; requires `roster.view`. */
    async list(params: RosterListParams): Promise<PaginatedData<Roster>> {
        return api.get<PaginatedData<Roster>>('/rosters', { params });
    },

    /** `GET /rosters/{id}` — includes the roster's shifts. */
    async detail(id: number): Promise<Roster> {
        return api.get<Roster>(`/rosters/${id}`);
    },
};

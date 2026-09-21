import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { AppError } from '../../../types/appError';
import { queryKeys } from '../../../utils/queryKeys';
import { addDays, startOfWeek, todayApiDate, weekDates } from '../../../utils/date';
import { useShifts } from '../../shifts/hooks';
import type { Shift } from '../../shifts/types';
import { useMyRoster } from './useMyRoster';

/**
 * My Roster week state (spec Screen 5).
 *
 * Primary path is `GET /shifts?employee_id=<own>&date_from=<weekStart>&date_to=<weekEnd>&per_page=50`
 * (spec Screen 5 API 1). The supplementary `GET /rosters?status=published&per_page=10`
 * (API 2) only supplies week chrome — shift times always come from API 1.
 *
 * Week logic is client-side: no `my-roster` endpoint exists, and the employee role
 * cannot read `company_settings.week_start_day`, so Monday is the documented default
 * (spec Screen 5 §4-5, [`startOfWeek`](src/utils/date.ts:188)).
 *
 * Draft rosters are filtered client-side because `RosterPolicy@view` does NOT hide
 * drafts from employees — only `status=published` weeks are shown.
 */

export type RosterDayGroup = {
    /** `Y-m-d`. */
    date: string;
    shifts: Shift[];
};

export type MyRosterWeek = {
    /** Currently selected day (`Y-m-d`) — drives the week window. */
    selectedDate: string;
    selectDate: (date: string) => void;
    goToToday: () => void;
    goToPreviousWeek: () => void;
    goToNextWeek: () => void;
    /** Monday of the selected week (`Y-m-d`). */
    weekStart: string;
    /** Sunday of the selected week (`Y-m-d`). */
    weekEnd: string;
    /** Seven `Y-m-d` values in display order. */
    days: string[];
    /** Shifts grouped by date, sorted by date then start time. */
    groups: RosterDayGroup[];
    /** Total shifts in the week. */
    totalShifts: number;
    /** Published roster weeks for header chrome (already filtered). */
    publishedRosters: import('../types').Roster[];
    employeeId: number | null;
    isLoading: boolean;
    isError: boolean;
    error: AppError;
    isRefreshing: boolean;
    refresh: () => void;
};

export function useMyRosterWeek(initialDate?: string): MyRosterWeek {
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState(() => initialDate ?? todayApiDate());
    /**
     * The first week ever shown in this screen instance.
     *
     * The full-screen skeleton is a first-paint concept only: it should cover the
     * cold `isPending` window on mount, never a week the user navigated to. Using
     * the week itself as the identity for that distinction (rather than a boolean
     * flag) means the very first fetch after the screen opens is the one that
     * gets the skeleton, while every subsequent arrow press is treated as a
     * transition and keeps the chrome on screen.
     */
    const [firstWeek] = useState(() => startOfWeek(initialDate ?? todayApiDate(), 1));

    const weekStart = startOfWeek(selectedDate, 1);
    const weekEnd = addDays(weekStart, 6);
    const days = weekDates(selectedDate, 1);

    const shiftsQuery = useShifts({ date_from: weekStart, date_to: weekEnd, per_page: 50 });
    const rostersQuery = useMyRoster({ status: 'published', per_page: 10 });

    const groups = useMemo<RosterDayGroup[]>(() => {
        const all = shiftsQuery.data?.data ?? [];
        const sorted = [...all].sort((a, b) => {
            const byDate = a.date.localeCompare(b.date);

            return byDate !== 0 ? byDate : a.start_time.localeCompare(b.start_time);
        });

        const byDate = new Map<string, Shift[]>();

        sorted.forEach(shift => {
            const list = byDate.get(shift.date) ?? [];

            list.push(shift);
            byDate.set(shift.date, list);
        });

        return [...byDate.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, dayShifts]) => ({ date, shifts: dayShifts }));
    }, [shiftsQuery.data]);

    const publishedRosters = useMemo(() => {
        const all = rostersQuery.data?.data ?? [];

        return all.filter(roster => roster.status === 'published');
    }, [rostersQuery.data]);

    const totalShifts = useMemo(
        () => groups.reduce((total, group) => total + group.shifts.length, 0),
        [groups],
    );

    const employeeId = shiftsQuery.employeeId;

    /**
     * Cached mean "show the data now", not "show a skeleton".
     *
     * A fresh week's key has no cache entry, so `isPending` is momentarily true
     * for the entire time an arrow-press fetch is in flight. Feeding that into
     * `isLoading` (as this hook previously did) handed the screen a full swap to
     * the skeleton branch — and with it the loss of the `SectionList` and its
     * scroll position — every time the user stepped one week across. Treating a
     * key that already holds data as loaded keeps the previous week's cards in
     * place while the new week arrives; `isRefreshing` is what tells the screen a
     * transition is happening so it can show the in-place `SkeletonRosterGroup`
     * instead. Only a genuinely empty, never-fetched week is "loading".
     */
    const isShowingFirstWeek = weekStart === firstWeek;
    const isLoading =
        employeeId !== null &&
        (shiftsQuery.isPending || rostersQuery.isPending) &&
        (isShowingFirstWeek || !shiftsQuery.isFetching);

    const refresh = (): void => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.session.me() });
        void shiftsQuery.refetch();
        void rostersQuery.refetch();
    };

    return {
        selectedDate,
        selectDate: setSelectedDate,
        goToToday: () => setSelectedDate(todayApiDate()),
        goToPreviousWeek: () => setSelectedDate(previous => addDays(previous, -7)),
        goToNextWeek: () => setSelectedDate(previous => addDays(previous, 7)),
        weekStart,
        weekEnd,
        days,
        groups,
        totalShifts,
        publishedRosters,
        employeeId,
        isLoading,
        isError: shiftsQuery.isError,
        error: shiftsQuery.error as AppError,
        /**
         * Also true during a week change, not only on pull-to-refresh: the screen
         * uses this flag to decide between the in-place placeholder and the
         * "no shifts this week" empty state, and a week that is still arriving
         * must not be reported as empty.
         */
        isRefreshing: shiftsQuery.isFetching || rostersQuery.isRefetching,
        refresh,
    };
}

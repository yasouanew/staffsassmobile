import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { queryKeys } from '../../../../utils/queryKeys';
import { addDays, startOfWeek } from '../../../../utils/date';
import type { Shift } from '../../../shifts/types';
import type { Roster } from '../../types';
import { useMyRosterWeek } from '../useMyRosterWeek';

const mockUseShifts = jest.fn();
const mockUseMyRoster = jest.fn();
const mockInvalidateQueries = jest.fn();

jest.mock('../../../shifts/hooks', () => ({
    useShifts: (...args: unknown[]) => mockUseShifts(...args),
}));

jest.mock('../useMyRoster', () => ({
    useMyRoster: (...args: unknown[]) => mockUseMyRoster(...args),
}));

jest.mock('@tanstack/react-query', () => {
    const actual = jest.requireActual('@tanstack/react-query');

    return {
        ...actual,
        useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
    };
});

function makeShift(overrides: Partial<Shift> = {}): Shift {
    return {
        id: 1,
        company_id: 1,
        branch_id: 5,
        branch: { id: 5, name: 'CBD' },
        roster_id: 20,
        employee_id: 9,
        employee: { id: 9, first_name: 'Ava', last_name: 'S', full_name: 'Ava S' },
        position_id: null,
        department_id: null,
        date: '2026-09-15',
        start_time: '09:00',
        end_time: '17:00',
        break_minutes: null,
        paid_break: null,
        status: 'scheduled',
        notes: null,
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
        ...overrides,
    };
}

function makeRoster(overrides: Partial<Roster> = {}): Roster {
    return {
        id: 20,
        company_id: 1,
        branch_id: null,
        employee_id: 9,
        employee: null,
        week_start: '2026-09-14',
        week_end: '2026-09-20',
        status: 'published',
        notes: null,
        published_at: '2026-09-12T09:00:00+10:00',
        created_at: '2026-09-10T10:00:00+10:00',
        updated_at: '2026-09-12T09:00:00+10:00',
        ...overrides,
    };
}

function paginated<T>(items: T[]) {
    return {
        data: items,
        meta: { current_page: 1, last_page: 1, per_page: 50, total: items.length },
    };
}

type Harness = { current: ReturnType<typeof useMyRosterWeek> | null };

function renderWeek(initialDate?: string): Harness {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const harness: Harness = { current: null };
    function Probe(): null {
        harness.current = useMyRosterWeek(initialDate);
        return null;
    }
    ReactTestRenderer.act(() => {
        ReactTestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        );
    });

    return harness;
}

describe('useMyRosterWeek', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseMyRoster.mockReturnValue({
            data: paginated([]),
            isPending: false,
            isError: false,
            error: null,
            isRefetching: false,
            refetch: jest.fn(),
            employeeId: 9,
        });
    });

    it('queries the Mon–Sun week window with date_from/date_to and per_page=50', () => {
        mockUseShifts.mockReturnValue({
            data: paginated([]),
            isPending: false,
            isError: false,
            error: null,
            isRefetching: false,
            refetch: jest.fn(),
            employeeId: 9,
        });

        renderWeek('2026-09-15');

        const expectedStart = startOfWeek('2026-09-15', 1);
        expect(mockUseShifts).toHaveBeenCalledWith({
            date_from: expectedStart,
            date_to: addDays(expectedStart, 6),
            per_page: 50,
        });
        const sent = mockUseShifts.mock.calls[0]?.[0] as Record<string, unknown>;
        expect(sent).not.toHaveProperty('from');
        expect(sent).not.toHaveProperty('to');
    });

    it('requests published roster chrome separately (shift times come from shifts)', () => {
        mockUseShifts.mockReturnValue({
            data: paginated([]),
            isPending: false,
            isError: false,
            error: null,
            isRefetching: false,
            refetch: jest.fn(),
            employeeId: 9,
        });

        renderWeek('2026-09-15');

        expect(mockUseMyRoster).toHaveBeenCalledWith({ status: 'published', per_page: 10 });
    });

    it('groups shifts by date sorted by date then start_time', () => {
        const b = makeShift({ id: 2, date: '2026-09-16', start_time: '14:00' });
        const aLate = makeShift({ id: 3, date: '2026-09-15', start_time: '14:00' });
        const aEarly = makeShift({ id: 1, date: '2026-09-15', start_time: '09:00' });
        mockUseShifts.mockReturnValue({
            data: paginated([b, aLate, aEarly]),
            isPending: false,
            isError: false,
            error: null,
            isRefetching: false,
            refetch: jest.fn(),
            employeeId: 9,
        });

        const harness = renderWeek('2026-09-15');

        expect(harness.current?.groups.map(g => g.date)).toEqual(['2026-09-15', '2026-09-16']);
        expect(harness.current?.groups[0]?.shifts.map(s => s.id)).toEqual([1, 3]);
        expect(harness.current?.totalShifts).toBe(3);
    });

    it('filters roster chrome to published only (backend does not hide drafts)', () => {
        mockUseShifts.mockReturnValue({
            data: paginated([]),
            isPending: false,
            isError: false,
            error: null,
            isRefetching: false,
            refetch: jest.fn(),
            employeeId: 9,
        });
        const draft = makeRoster({ id: 21, status: 'draft' });
        const published = makeRoster({ id: 20, status: 'published' });
        mockUseMyRoster.mockReturnValue({
            data: paginated([draft, published]),
            isPending: false,
            isError: false,
            error: null,
            isRefetching: false,
            refetch: jest.fn(),
            employeeId: 9,
        });

        const harness = renderWeek('2026-09-15');

        expect(harness.current?.publishedRosters.map(r => r.id)).toEqual([20]);
    });

    it('navigates weeks in 7-day steps and back to today', () => {
        mockUseShifts.mockReturnValue({
            data: paginated([]),
            isPending: false,
            isError: false,
            error: null,
            isRefetching: false,
            refetch: jest.fn(),
            employeeId: 9,
        });

        const harness = renderWeek('2026-09-15');
        const initial = harness.current?.selectedDate;

        ReactTestRenderer.act(() => {
            harness.current?.goToNextWeek();
        });
        expect(harness.current?.selectedDate).toBe(addDays(initial as string, 7));

        ReactTestRenderer.act(() => {
            harness.current?.goToPreviousWeek();
        });
        expect(harness.current?.selectedDate).toBe(initial);
    });

    it('refresh revalidates me plus both week sources', () => {
        const shiftsRefetch = jest.fn();
        const rostersRefetch = jest.fn();
        mockUseShifts.mockReturnValue({
            data: paginated([]),
            isPending: false,
            isError: false,
            error: null,
            isRefetching: false,
            refetch: shiftsRefetch,
            employeeId: 9,
        });
        mockUseMyRoster.mockReturnValue({
            data: paginated([]),
            isPending: false,
            isError: false,
            error: null,
            isRefetching: false,
            refetch: rostersRefetch,
            employeeId: 9,
        });

        const harness = renderWeek('2026-09-15');
        ReactTestRenderer.act(() => {
            harness.current?.refresh();
        });

        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: queryKeys.session.me(),
        });
        expect(shiftsRefetch).toHaveBeenCalled();
        expect(rostersRefetch).toHaveBeenCalled();
    });
});

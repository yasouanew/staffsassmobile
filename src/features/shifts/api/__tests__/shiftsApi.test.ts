import { api } from '../../../../api/client';
import { shiftsApi } from '../shiftsApi';

jest.mock('../../../../api/client', () => ({
    api: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
    },
}));

const mockedApi = api as jest.Mocked<typeof api>;

/**
 * Pins the Home wire contract (spec Screen 4 API 2):
 * `GET /shifts?employee_id=&date_from=&date_to=`. The old `from`/`to` names
 * were silently ignored by the backend, returning unfiltered company data.
 */
describe('shiftsApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('lists today shifts with date_from/date_to, never from/to', async () => {
        mockedApi.get.mockResolvedValueOnce({ data: [] } as never);

        await shiftsApi.list({
            employee_id: 9,
            date_from: '2026-09-15',
            date_to: '2026-09-15',
            per_page: 10,
        });

        expect(mockedApi.get).toHaveBeenCalledWith('/shifts', {
            params: {
                employee_id: 9,
                date_from: '2026-09-15',
                date_to: '2026-09-15',
                per_page: 10,
            },
        });
        const sent = (mockedApi.get.mock.calls[0]?.[1] as { params: Record<string, unknown> }).params;
        expect(sent).not.toHaveProperty('from');
        expect(sent).not.toHaveProperty('to');
    });

    it('fetches a single shift by id for the detail screen', async () => {
        mockedApi.get.mockResolvedValueOnce({ id: 101 } as never);

        await shiftsApi.detail(101);

        expect(mockedApi.get).toHaveBeenCalledWith('/shifts/101');
    });
});

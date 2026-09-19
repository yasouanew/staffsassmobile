import { api } from '../../../../api/client';
import { availabilityApi } from '../availabilityApi';

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
 * Pins the Availability wire contract (spec Screen 7 §6):
 * - every route nests under `/employees/{employee}/availabilities`
 * - `employee` is `employees.id` from `me.employee_id`, never `users.id`
 * - list is a plain collection (no pagination params)
 * - sync is `PUT …/sync` and is the recommended mobile save
 */
describe('availabilityApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('lists availability as a plain collection under the employee scope', async () => {
        mockedApi.get.mockResolvedValueOnce([] as never);

        await availabilityApi.list(9);

        expect(mockedApi.get).toHaveBeenCalledWith('/employees/9/availabilities');
    });

    it('creates a slot under the employee scope', async () => {
        mockedApi.post.mockResolvedValueOnce({ id: 1 } as never);

        await availabilityApi.create(9, {
            day_of_week: 1,
            start_time: '09:00',
            end_time: '17:00',
            is_available: true,
        });

        expect(mockedApi.post).toHaveBeenCalledWith('/employees/9/availabilities', {
            day_of_week: 1,
            start_time: '09:00',
            end_time: '17:00',
            is_available: true,
        });
    });

    it('syncs the whole week via PUT …/sync (recommended mobile save)', async () => {
        mockedApi.put.mockResolvedValueOnce([] as never);

        await availabilityApi.sync(9, {
            availabilities: [
                { day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
                { day_of_week: 3, is_available: false },
            ],
        });

        expect(mockedApi.put).toHaveBeenCalledWith('/employees/9/availabilities/sync', {
            availabilities: [
                { day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
                { day_of_week: 3, is_available: false },
            ],
        });
    });

    it('shows a single slot by id', async () => {
        mockedApi.get.mockResolvedValueOnce({ id: 1 } as never);

        await availabilityApi.show(9, 1);

        expect(mockedApi.get).toHaveBeenCalledWith('/employees/9/availabilities/1');
    });

    it('updates a single slot with a partial body', async () => {
        mockedApi.put.mockResolvedValueOnce({ id: 1 } as never);

        await availabilityApi.update(9, 1, { end_time: '18:00' });

        expect(mockedApi.put).toHaveBeenCalledWith('/employees/9/availabilities/1', {
            end_time: '18:00',
        });
    });

    it('deletes a single slot by id', async () => {
        mockedApi.delete.mockResolvedValueOnce(undefined as never);

        await availabilityApi.remove(9, 1);

        expect(mockedApi.delete).toHaveBeenCalledWith('/employees/9/availabilities/1');
    });
});

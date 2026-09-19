import { api, postMultipart } from '../../../../api/client';
import { leaveApi } from '../leaveApi';

jest.mock('../../../../api/client', () => ({
    api: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
    },
    postMultipart: jest.fn(),
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedPostMultipart = postMultipart as jest.MockedFunction<typeof postMultipart>;

/**
 * Pins the Leave wire contract (spec Screens 8–10 §6):
 * - `GET /leave-requests` is auto-scoped server-side: client MUST NOT send `employee_id`
 * - `POST /leave-requests` is multipart when attachments present, else JSON
 * - `GET /leave-types` is the picker source (G2: 403 for employees)
 * - `GET /leave-requests/{id}` detail; no approve/reject/cancel routes exist for mobile
 */
describe('leaveApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('lists own requests auto-scoped without employee_id', async () => {
        mockedApi.get.mockResolvedValueOnce({ data: [] } as never);

        await leaveApi.list({ status: 'pending', per_page: 20 });

        expect(mockedApi.get).toHaveBeenCalledWith('/leave-requests', {
            params: { status: 'pending', per_page: 20 },
        });
        const params = (mockedApi.get.mock.calls[0]?.[1] as { params: Record<string, unknown> })
            ?.params;
        expect(params).not.toHaveProperty('employee_id');
        expect(params).not.toHaveProperty('company_id');
    });

    it('passes date_from/date_to and leave_type_id filters through', async () => {
        mockedApi.get.mockResolvedValueOnce({ data: [] } as never);

        await leaveApi.list({
            leave_type_id: 3,
            date_from: '2026-09-01',
            date_to: '2026-09-30',
            page: 2,
        });

        expect(mockedApi.get).toHaveBeenCalledWith('/leave-requests', {
            params: {
                leave_type_id: 3,
                date_from: '2026-09-01',
                date_to: '2026-09-30',
                page: 2,
            },
        });
    });

    it('fetches a single request by id for the detail screen', async () => {
        mockedApi.get.mockResolvedValueOnce({ id: 7 } as never);

        await leaveApi.detail(7);

        expect(mockedApi.get).toHaveBeenCalledWith('/leave-requests/7');
    });

    it('creates without attachments as JSON (no multipart, no employee_id)', async () => {
        mockedApi.post.mockResolvedValueOnce({ id: 1 } as never);

        await leaveApi.create({
            leave_type_id: 2,
            start_date: '2026-09-20',
            end_date: '2026-09-22',
            start_session: 'full_day',
            end_session: 'full_day',
            total_days: 3,
            reason: 'Family trip',
        });

        expect(mockedPostMultipart).not.toHaveBeenCalled();
        expect(mockedApi.post).toHaveBeenCalledWith('/leave-requests', {
            leave_type_id: 2,
            start_date: '2026-09-20',
            end_date: '2026-09-22',
            start_session: 'full_day',
            end_session: 'full_day',
            total_days: 3,
            reason: 'Family trip',
        });
    });

    it('creates with attachments as multipart with attachments[] files', async () => {
        mockedPostMultipart.mockResolvedValueOnce({ id: 2 } as never);

        await leaveApi.create({
            leave_type_id: 2,
            start_date: '2026-09-20',
            end_date: '2026-09-20',
            attachments: [
                { uri: 'file:///tmp/a.pdf', name: 'a.pdf', mimeType: 'application/pdf' },
            ],
        });

        expect(mockedPostMultipart).toHaveBeenCalledTimes(1);
        expect(mockedApi.post).not.toHaveBeenCalled();
        const [url, formData] = mockedPostMultipart.mock.calls[0] as unknown as [
            string,
            FormData,
        ];
        expect(url).toBe('/leave-requests');
        expect(formData).toBeInstanceOf(FormData);
    });

    it('queries leave-types for the picker with status=active passthrough', async () => {
        mockedApi.get.mockResolvedValueOnce({ data: [] } as never);

        await leaveApi.types({ status: 'active', per_page: 100 });

        expect(mockedApi.get).toHaveBeenCalledWith('/leave-types', {
            params: { status: 'active', per_page: 100 },
        });
    });
});

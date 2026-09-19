import ReactTestRenderer from 'react-test-renderer';

import { ShiftCard } from '../ShiftCard';
import type { Shift } from '../../../shifts/types';

function makeShift(overrides: Partial<Shift> = {}): Shift {
    return {
        id: 101,
        company_id: 1,
        branch_id: 5,
        branch: { id: 5, name: 'CBD Store' },
        roster_id: 20,
        employee_id: 9,
        employee: { id: 9, first_name: 'Ava', last_name: 'Smith', full_name: 'Ava Smith' },
        position_id: 3,
        position: { id: 3, name: 'Cashier' },
        department_id: 4,
        department: { id: 4, name: 'Front' },
        date: '2026-09-16',
        start_time: '09:00',
        end_time: '17:00',
        break_minutes: 30,
        paid_break: false,
        status: 'scheduled',
        notes: 'Close the till at the end.',
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
        ...overrides,
    };
}

function renderedText(shift: Shift, props: { onPress?: () => void; showDate?: boolean } = {}): string {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(<ShiftCard shift={shift} {...props} />);
    });
    if (!renderer) {
        throw new Error('Failed to render ShiftCard');
    }
    return JSON.stringify(renderer.toJSON());
}

/**
 * Guards the spec Screen 4 card contract: position, department, branch and a
 * notes snippet must render, and a missing eager load must fall back to plain
 * text — never the string "undefined".
 */
describe('ShiftCard', () => {
    it('renders position, department, branch and the notes snippet', () => {
        const text = renderedText(makeShift());

        expect(text).toContain('Cashier');
        expect(text).toContain('Front');
        expect(text).toContain('CBD Store');
        expect(text).toContain('Close the till');
        expect(text).not.toContain('undefined');
    });

    it('hides the date line on Home Today where the section already says Today', () => {
        const withDate = renderedText(makeShift(), { showDate: true });
        const withoutDate = renderedText(makeShift(), { showDate: false });

        // formatDate('2026-09-16') renders a weekday form such as "Wed 16 Sep 2026".
        expect(withDate).toContain('16 Sep 2026');
        expect(withoutDate).not.toContain('16 Sep 2026');
    });

    it('falls back to plain text when relations are missing, never "undefined"', () => {
        const text = renderedText(
            makeShift({
                branch: null,
                position: null,
                department: null,
                notes: '   ',
            }),
        );

        expect(text).toContain('Unassigned branch');
        expect(text).not.toContain('undefined');
        expect(text).not.toContain('Close the till');
    });

    it('exposes an accessible label with date, times and status for screen readers', () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
        ReactTestRenderer.act(() => {
            renderer = ReactTestRenderer.create(
                <ShiftCard shift={makeShift()} onPress={() => undefined} />,
            );
        });
        const pressable = renderer?.root.findByProps({ accessibilityRole: 'button' });
        const label = String(pressable?.props.accessibilityLabel ?? '');

        // formatTime renders 12h display ("9:00 AM"), so assert on that form.
        expect(label).toContain('9:00 AM');
        expect(label).toContain('5:00 PM');
        expect(label).toContain('scheduled');
    });
});

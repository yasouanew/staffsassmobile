/**
 * Date/time helpers matching the backend contract in spec §0.4.
 *
 * The backend is the authority on time and always emits:
 * - calendar dates as `Y-m-d` (`shifts.date`, `rosters.week_start`, `leave.start_date`)
 * - clock times as `H:i` (`shifts.start_time` → `"09:00"`)
 * - timestamps as ISO-8601 with offset (`created_at`, `published_at`)
 *
 * There is no server-side "today" endpoint and no per-user timezone conversion
 * (company `timezone` is a display hint only), so date math lives here and is kept
 * free of any timezone library: everything is derived from the device clock and
 * formatted with zero-padding so the strings sent to the API are always `Y-m-d`.
 *
 * `Date`-based parsing of a `Y-m-d` string is avoided throughout — the platform
 * parses bare date strings as UTC midnight, which shifts the day for any user east
 * or west of UTC.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAY_LONG = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
] as const;

const MONTH_SHORT = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
] as const;

const MONTH_LONG = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
] as const;

function pad(value: number): string {
    return value < 10 ? `0${value}` : String(value);
}

/**
 * `employees.day_of_week` / `employee_availabilities.day_of_week` use `0 = Sunday`
 * through `6 = Saturday` (see `app/Models/EmployeeAvailability.php`), which matches
 * JavaScript's `Date.getDay()`. This is deliberately distinct from the roster week
 * index used for display, which starts on Monday (spec Screen 5 — employees cannot
 * read `company_settings.week_start_day`, so Monday is the default).
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Formats a `Date` as the backend's `Y-m-d` date format. */
export function toApiDate(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a `Y-m-d` string into a local-midnight `Date` (never UTC-shifted). */
export function parseApiDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);

    if (year === undefined || month === undefined || day === undefined) {
        throw new Error(`Invalid API date: "${value}". Expected Y-m-d.`);
    }

    return new Date(year, month - 1, day);
}

/** Today according to the device clock, formatted as `Y-m-d`. */
export function todayApiDate(): string {
    return toApiDate(new Date());
}

/** Normalises a clock time from the API (`"09:00"` or `"09:00:00"`) to `H:i`. */
export function toApiTime(value: string): string {
    const [hours, minutes] = value.split(':');

    if (hours === undefined || minutes === undefined) {
        throw new Error(`Invalid API time: "${value}". Expected H:i.`);
    }

    return `${pad(Number(hours))}:${pad(Number(minutes))}`;
}

/** Formats `"09:00"` as `"9:00 AM"` for display. Returns `"—"` when null. */
export function formatTime(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const [rawHours, rawMinutes] = value.split(':');
    const hours = Number(rawHours);
    const minutes = Number(rawMinutes);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return value;
    }

    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;

    return `${displayHours}:${pad(minutes)} ${suffix}`;
}

/** Formats a `Y-m-d` value as `"Mon 15 Sep 2026"`. Returns `"—"` when null. */
export function formatDate(value?: string | null, options?: { withWeekday?: boolean; long?: boolean }): string {
    if (!value) {
        return '—';
    }

    const date = parseApiDate(value);
    const weekday = options?.withWeekday === false ? null : WEEKDAY_SHORT[date.getDay()];
    const month = options?.long ? MONTH_LONG[date.getMonth()] : MONTH_SHORT[date.getMonth()];
    const parts = [weekday, String(date.getDate()), month, String(date.getFullYear())].filter(
        (part): part is string => Boolean(part),
    );

    return parts.join(' ');
}

/** Formats a `Y-m-d` value as `"15 Sep"` — used in compact week strips. */
export function formatDayMonth(value: string): string {
    const date = parseApiDate(value);

    return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

/** Short weekday name for a `Y-m-d` value, e.g. `"Mon"`. */
export function getWeekdayShort(value: string): string {
    return WEEKDAY_SHORT[parseApiDate(value).getDay()] ?? '';
}

/** Long weekday name for an employee week index (`0 = Sunday`). */
export function getDayName(dayOfWeek: DayOfWeek): string {
    return WEEKDAY_LONG[dayOfWeek] ?? '';
}

/** Adds days to a `Y-m-d` value, returning `Y-m-d`. */
export function addDays(value: string, days: number): string {
    const date = parseApiDate(value);

    date.setDate(date.getDate() + days);

    return toApiDate(date);
}

/** Whole days between two `Y-m-d` values (inclusive of `end`). */
export function daysBetween(start: string, end: string): number {
    const startDate = parseApiDate(start).getTime();
    const endDate = parseApiDate(end).getTime();

    return Math.round((endDate - startDate) / MS_PER_DAY) + 1;
}

/** Day index of a `Y-m-d` value using the backend's `0 = Sunday` convention. */
export function getDayOfWeek(value: string): DayOfWeek {
    return parseApiDate(value).getDay() as DayOfWeek;
}

/**
 * Monday of the week containing `value`.
 *
 * The employee role cannot read `company_settings.week_start_day` (spec §0.4/Screen 5),
 * so the mobile roster uses Monday as a documented default.
 */
export function startOfWeek(value: string, weekStartsOn: DayOfWeek = 1): string {
    const current = getDayOfWeek(value);
    const offset = (current - weekStartsOn + 7) % 7;

    return addDays(value, -offset);
}

/** The seven `Y-m-d` values of the week containing `value`, in display order. */
export function weekDates(value: string, weekStartsOn: DayOfWeek = 1): string[] {
    const start = startOfWeek(value, weekStartsOn);

    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** `true` when the two `Y-m-d` values are the same calendar day. */
export function isSameApiDate(a: string, b: string): boolean {
    return a === b;
}

/** Formats an ISO-8601 timestamp as a relative string, e.g. `"2h ago"`. */
export function formatRelative(isoTimestamp: string): string {
    const timestamp = new Date(isoTimestamp).getTime();

    if (!Number.isFinite(timestamp)) {
        return '';
    }

    const diffSeconds = Math.round((Date.now() - timestamp) / 1000);

    if (diffSeconds < 60) {
        return 'Just now';
    }

    const diffMinutes = Math.round(diffSeconds / 60);

    if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);

    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }

    const diffDays = Math.round(diffHours / 24);

    if (diffDays < 7) {
        return `${diffDays}d ago`;
    }

    return formatDate(toApiDate(new Date(timestamp)));
}

/**
 * Duration of a shift in minutes: `end - start - break_minutes`.
 *
 * `break_minutes` is nullable and `paid_break` records whether the break is paid;
 * when the break is paid it does not reduce worked time, so it is only subtracted
 * for unpaid breaks (spec Screen 6).
 */
export function shiftDurationMinutes(
    startTime: string,
    endTime: string,
    breakMinutes?: number | null,
    paidBreak?: boolean | null,
): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    if (
        startHours === undefined ||
        startMinutes === undefined ||
        endHours === undefined ||
        endMinutes === undefined
    ) {
        return 0;
    }

    let minutes = endHours * 60 + endMinutes - (startHours * 60 + startMinutes);

    // Shifts crossing midnight (e.g. 22:00 → 06:00) are valid roster entries.
    if (minutes < 0) {
        minutes += 24 * 60;
    }

    if (!paidBreak && typeof breakMinutes === 'number' && breakMinutes > 0) {
        minutes -= breakMinutes;
    }

    return Math.max(minutes, 0);
}

/** Formats a minute count as `"8h 30m"`. */
export function formatDuration(minutes: number): string {
    if (minutes <= 0) {
        return '0h';
    }

    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;

    if (hours === 0) {
        return `${remainder}m`;
    }

    if (remainder === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${remainder}m`;
}

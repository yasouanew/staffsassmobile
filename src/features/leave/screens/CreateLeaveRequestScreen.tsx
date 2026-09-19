import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '../../../components/AppButton';
import { AppCard, Divider } from '../../../components/AppCard';
import { AppHeader } from '../../../components/AppHeader';
import { AppText } from '../../../components/AppText';
import { AppTextInput } from '../../../components/AppTextInput';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { LeaveStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import type { LeaveSession } from '../../../types/api';
import { isAppError } from '../../../types/appError';
import { toFieldErrorMap } from '../../../utils/errors';
import { useCreateLeaveRequest, useLeaveTypes } from '../hooks';
import type { LeaveAttachmentInput, LeaveType } from '../types';
import { previewTotalDays, validateAttachment } from '../utils/leaveRequest';
import {
    LEAVE_ATTACHMENT_MAX_COUNT,
    createLeaveRequestSchema,
    leaveSessions,
    type CreateLeaveRequestFormValues,
} from '../validation';

type Props = NativeStackScreenProps<LeaveStackParamList, 'CreateLeaveRequest'>;

const SESSION_LABELS: Record<LeaveSession, string> = {
    full_day: 'Full day',
    first_half: 'First half',
    second_half: 'Second half',
};

/** Today as `Y-m-d`, used only to prefill the date fields. */
function today(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Request Leave (spec Screen 9).
 *
 * - `leave_type_id/start_date/end_date` required; `start_session/end_session`
 *   nullable slots; `total_days` hint (server recalculates); `reason` max 1000;
 *   `attachments` max 5 (`pdf,jpg,jpeg,png,doc,docx`, 5MB each) sent as
 *   `multipart/form-data` when present, else JSON.
 * - `company_id`/`employee_id` are never sent — the backend injects them (§0.5).
 * - G2: `GET /leave-types` 403 → "types unavailable — contact admin" fallback + retry.
 * - G6: no cancel/withdraw endpoint — no cancel UI is built.
 * - Success → Leave Details with the new id; error → stay with field errors.
 * - Cancel/back → dirty guard.
 */
export function CreateLeaveRequestScreen({ navigation }: Props): React.JSX.Element {
    const theme = useTheme();
    const leaveTypes = useLeaveTypes();
    const createRequest = useCreateLeaveRequest();
    const [attachments, setAttachments] = useState<LeaveAttachmentInput[]>([]);
    const [attachmentError, setAttachmentError] = useState<string | null>(null);
    const [pendingFileName, setPendingFileName] = useState('');

    const {
        control,
        handleSubmit,
        setValue,
        setError,
        watch,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<CreateLeaveRequestFormValues>({
        resolver: zodResolver(createLeaveRequestSchema),
        defaultValues: {
            leave_type_id: 0,
            start_date: today(),
            end_date: today(),
            start_session: 'full_day',
            end_session: 'full_day',
            total_days: undefined,
            reason: '',
        },
    });

    const selectedTypeId = watch('leave_type_id');
    const startSession = watch('start_session');
    const endSession = watch('end_session');
    const startDate = watch('start_date');
    const endDate = watch('end_date');

    // Dirty guard — a half-filled request is not worth losing to an accidental back.
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', event => {
            if (!isDirty && attachments.length === 0) {
                return;
            }

            if (createRequest.isSuccess) {
                return;
            }

            event.preventDefault();
            Alert.alert(
                'Discard request?',
                'You have unsaved changes. Discard this leave request?',
                [
                    { text: 'Keep editing', style: 'cancel' },
                    {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => navigation.dispatch(event.data.action),
                    },
                ],
            );
        });

        return unsubscribe;
    }, [navigation, isDirty, attachments.length, createRequest.isSuccess]);

    const selectedType = useMemo(
        () => leaveTypes.leaveTypes.find((type: LeaveType) => type.id === selectedTypeId),
        [leaveTypes.leaveTypes, selectedTypeId],
    );

    /**
     * Only offer session slots the chosen type supports: `allow_half_day` is the
     * server's own signal, so honouring it client-side prevents a round-trip that is
     * guaranteed to fail. Falls back to allowing all slots when no type is selected.
     */
    const allowsHalfDay = selectedType ? selectedType.allow_half_day : true;
    const availableSessions = useMemo<readonly LeaveSession[]>(
        () => (allowsHalfDay ? leaveSessions : (['full_day'] as const)),
        [allowsHalfDay],
    );

    // Keep sessions valid when the type changes (e.g. Annual allows halves, Sick may not).
    useEffect(() => {
        if (!allowsHalfDay) {
            setValue('start_session', 'full_day', { shouldValidate: true });
            setValue('end_session', 'full_day', { shouldValidate: true });
        }
    }, [allowsHalfDay, setValue]);

    const totalPreview = previewTotalDays(
        startDate,
        endDate,
        startSession ?? 'full_day',
        endSession ?? 'full_day',
    );
    const previewValid =
        /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
        /^\d{4}-\d{2}-\d{2}$/.test(endDate) &&
        endDate >= startDate;

    const handleAddAttachment = (): void => {
        const name = pendingFileName.trim();

        if (!name) {
            setAttachmentError('Enter a file name to attach (e.g. certificate.pdf).');
            return;
        }

        if (attachments.length >= LEAVE_ATTACHMENT_MAX_COUNT) {
            setAttachmentError(`You can attach up to ${LEAVE_ATTACHMENT_MAX_COUNT} files.`);
            return;
        }

        const validation = validateAttachment(name);

        if (validation) {
            setAttachmentError(validation);
            return;
        }

        const extension = name.split('.').pop()?.toLowerCase() ?? '';
        const mimeType =
            extension === 'pdf'
                ? 'application/pdf'
                : extension === 'doc' || extension === 'docx'
                    ? 'application/msword'
                    : `image/${extension === 'jpg' ? 'jpeg' : extension}`;

        setAttachments(previous => [
            ...previous,
            { uri: `file://${name}`, name, mimeType },
        ]);
        setPendingFileName('');
        setAttachmentError(null);
    };

    const handleRemoveAttachment = (name: string): void => {
        setAttachments(previous => previous.filter(item => item.name !== name));
    };

    const onSubmit = handleSubmit(async values => {
        if (values.leave_type_id <= 0) {
            setError('leave_type_id', { type: 'validate', message: 'Choose a leave type.' });
            return;
        }

        try {
            const created = await createRequest.mutateAsync({
                leave_type_id: values.leave_type_id,
                start_date: values.start_date,
                end_date: values.end_date,
                start_session: values.start_session ?? undefined,
                end_session: values.end_session ?? undefined,
                total_days: values.total_days ?? totalPreview,
                reason: values.reason?.trim() ? values.reason.trim() : undefined,
                attachments: attachments.length > 0 ? attachments : undefined,
            });

            navigation.replace('LeaveDetail', { leaveRequestId: created.id });
        } catch (error) {
            if (!isAppError(error)) {
                setError('root', {
                    type: 'server',
                    message: 'We could not submit this request. Check the details and try again.',
                });
                return;
            }

            const fieldErrors = toFieldErrorMap(error);

            if (Object.keys(fieldErrors).length === 0) {
                setError('root', { type: 'server', message: error.message });
                return;
            }

            (Object.keys(fieldErrors) as (keyof CreateLeaveRequestFormValues)[]).forEach(key => {
                setError(key, { type: 'server', message: fieldErrors[key] });
            });
        }
    });

    const typesBlocked = leaveTypes.isUnsupported || (!leaveTypes.isLoading && leaveTypes.leaveTypes.length === 0);
    const isBlocked = leaveTypes.isLoading || typesBlocked;

    return (
        <ScreenContainer hasHeader>
            <AppHeader
                title="Request leave"
                subtitle="Submit a request for approval."
                onBack={() => navigation.goBack()}
            />

            <ScrollView
                contentContainerStyle={[styles.content, { gap: theme.spacing.md }]}
                keyboardShouldPersistTaps="handled"
                testID="create-leave-scroll">
                {leaveTypes.isLoading ? (
                    <AppCard testID="leave-types-loading">
                        <AppText variant="caption" color="textSecondary">
                            Loading leave types…
                        </AppText>
                    </AppCard>
                ) : null}

                {leaveTypes.isUnsupported ? (
                    <AppCard
                        testID="leave-types-gap-banner"
                        style={{ backgroundColor: theme.colors.warningSoft }}>
                        <View style={{ gap: theme.spacing.xs }}>
                            <AppText variant="bodyStrong" color="warningStrong">
                                Leave types unavailable — contact admin
                            </AppText>
                            <AppText variant="caption" color="warningStrong">
                                Your role cannot load leave types right now (missing
                                permission). A request needs a type, so submission is
                                paused until this is fixed.
                            </AppText>
                            <AppButton
                                label="Retry"
                                variant="secondary"
                                size="sm"
                                fullWidth={false}
                                onPress={leaveTypes.retry}
                                testID="leave-types-retry"
                            />
                        </View>
                    </AppCard>
                ) : null}

                {leaveTypes.isError && leaveTypes.error ? (
                    <AppCard testID="leave-types-error">
                        <View style={{ gap: theme.spacing.sm }}>
                            <AppText variant="caption" color="danger">
                                {leaveTypes.error.message}
                            </AppText>
                            <AppButton
                                label="Retry"
                                variant="secondary"
                                size="sm"
                                fullWidth={false}
                                onPress={leaveTypes.retry}
                                testID="leave-types-retry-error"
                            />
                        </View>
                    </AppCard>
                ) : null}

                <View style={{ gap: theme.spacing.sm }} testID="leave-type-picker">
                    <AppText variant="caption" color="textSecondary">
                        Leave type *
                    </AppText>

                    {typesBlocked && !leaveTypes.isLoading ? (
                        <AppText variant="caption" color="textMuted">
                            Leave types are unavailable right now, so a request cannot be
                            submitted. Please retry, or contact your administrator if this
                            continues.
                        </AppText>
                    ) : (
                        <View style={[styles.chips, { gap: theme.spacing.xs }]}>
                            {leaveTypes.leaveTypes.map((type: LeaveType) => {
                                const isSelected = type.id === selectedTypeId;

                                return (
                                    <Pressable
                                        key={type.id}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: isSelected }}
                                        testID={`leave-type-${type.id}`}
                                        onPress={() =>
                                            setValue('leave_type_id', type.id, {
                                                shouldValidate: true,
                                                shouldDirty: true,
                                            })
                                        }
                                        style={[
                                            styles.chip,
                                            {
                                                paddingVertical: theme.spacing.xs,
                                                paddingHorizontal: theme.spacing.sm,
                                                borderRadius: theme.radius.full,
                                                backgroundColor: isSelected
                                                    ? theme.colors.primary
                                                    : theme.colors.surfaceMuted,
                                            },
                                        ]}>
                                        <AppText
                                            variant="caption"
                                            color={isSelected ? 'onPrimary' : 'textSecondary'}>
                                            {type.name}
                                        </AppText>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}

                    {selectedType ? (
                        <AppText variant="caption" color="textMuted" testID="leave-type-meta">
                            {selectedType.code ?? 'Leave'}
                            {selectedType.is_paid ? ' · Paid' : ' · Unpaid'}
                            {selectedType.allow_half_day ? ' · Half days allowed' : ' · Full days only'}
                        </AppText>
                    ) : null}

                    {errors.leave_type_id ? (
                        <AppText variant="caption" color="danger" testID="leave-error-type">
                            {errors.leave_type_id.message}
                        </AppText>
                    ) : null}
                </View>

                <AppCard>
                    <View style={{ gap: theme.spacing.md }}>
                        <Controller
                            control={control}
                            name="start_date"
                            render={({ field }) => (
                                <AppTextInput
                                    label="Start date"
                                    required
                                    placeholder="YYYY-MM-DD"
                                    autoCapitalize="none"
                                    testID="leave-start-date"
                                    value={field.value}
                                    onChangeText={field.onChange}
                                    onBlur={field.onBlur}
                                    error={errors.start_date?.message}
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="end_date"
                            render={({ field }) => (
                                <AppTextInput
                                    label="End date"
                                    required
                                    placeholder="YYYY-MM-DD"
                                    autoCapitalize="none"
                                    testID="leave-end-date"
                                    value={field.value}
                                    onChangeText={field.onChange}
                                    onBlur={field.onBlur}
                                    error={errors.end_date?.message}
                                    helper={
                                        startDate === endDate
                                            ? 'Single-day request.'
                                            : 'Must be on or after the start date.'
                                    }
                                />
                            )}
                        />

                        <Divider />

                        <View style={{ gap: theme.spacing.xs }}>
                            <AppText variant="caption" color="textSecondary">
                                Estimated total
                            </AppText>
                            <AppText variant="subtitle" testID="leave-total-preview">
                                {previewValid
                                    ? `${totalPreview} day${totalPreview === 1 ? '' : 's'}`
                                    : '—'}
                            </AppText>
                            <AppText variant="caption" color="textMuted">
                                Preview only — the server recalculates the final total
                                from the working calendar.
                            </AppText>
                        </View>
                    </View>
                </AppCard>

                <SessionSelector
                    label="Starts"
                    selected={startSession ?? 'full_day'}
                    options={availableSessions}
                    onSelect={value =>
                        setValue('start_session', value, { shouldValidate: true, shouldDirty: true })
                    }
                    error={errors.start_session?.message}
                    testIDPrefix="leave-start-session"
                />

                <SessionSelector
                    label="Ends"
                    selected={endSession ?? 'full_day'}
                    options={availableSessions}
                    onSelect={value =>
                        setValue('end_session', value, { shouldValidate: true, shouldDirty: true })
                    }
                    error={errors.end_session?.message}
                    helper={
                        startDate !== endDate
                            ? 'Applied to the end date of the range.'
                            : undefined
                    }
                    testIDPrefix="leave-end-session"
                />

                <Controller
                    control={control}
                    name="reason"
                    render={({ field }) => (
                        <AppTextInput
                            label="Reason"
                            multiline
                            numberOfLines={4}
                            placeholder="Optional — add context for your approver (max 1000)."
                            testID="leave-reason"
                            value={field.value ?? ''}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            error={errors.reason?.message}
                        />
                    )}
                />

                <AppCard>
                    <View style={{ gap: theme.spacing.sm }}>
                        <AppText variant="bodyStrong">Attachments</AppText>
                        <AppText variant="caption" color="textMuted">
                            Up to {LEAVE_ATTACHMENT_MAX_COUNT} files · pdf, jpg, jpeg, png,
                            doc, docx · 5MB each. Sent as multipart upload.
                        </AppText>

                        {attachments.map(item => (
                            <View
                                key={item.name}
                                testID={`leave-attachment-${item.name}`}
                                style={[styles.attachmentRow, { gap: theme.spacing.sm }]}>
                                <AppText variant="caption" numberOfLines={1} style={styles.attachmentName}>
                                    {item.name}
                                </AppText>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`Remove ${item.name}`}
                                    testID={`leave-attachment-remove-${item.name}`}
                                    onPress={() => handleRemoveAttachment(item.name)}
                                    hitSlop={theme.spacing.sm}>
                                    <AppText variant="caption" color="danger">
                                        Remove
                                    </AppText>
                                </Pressable>
                            </View>
                        ))}

                        <AppTextInput
                            label="File name"
                            placeholder="e.g. certificate.pdf"
                            autoCapitalize="none"
                            testID="leave-attachment-input"
                            value={pendingFileName}
                            onChangeText={setPendingFileName}
                            error={attachmentError ?? undefined}
                            helper={
                                attachmentError
                                    ? undefined
                                    : 'On-device picker lands with the native file module; file names are validated here.'
                            }
                        />
                        <AppButton
                            label={attachments.length > 0 ? 'Add another file' : 'Add file'}
                            variant="secondary"
                            size="sm"
                            fullWidth={false}
                            onPress={handleAddAttachment}
                            testID="leave-attachment-add"
                        />
                    </View>
                </AppCard>

                {errors.root ? (
                    <AppText variant="caption" color="danger" testID="leave-error-root">
                        {errors.root.message}
                    </AppText>
                ) : null}

                <AppButton
                    label="Submit request"
                    onPress={onSubmit}
                    loading={isSubmitting || createRequest.isPending}
                    disabled={isBlocked}
                    testID="leave-submit"
                />

                <AppText variant="caption" color="textMuted">
                    Requests are subject to approval and to your available leave balance,
                    which is checked when your request is reviewed. Pending requests
                    cannot be withdrawn from the app.
                </AppText>
            </ScrollView>
        </ScreenContainer>
    );
}

type SessionSelectorProps = {
    label: string;
    selected: LeaveSession;
    options: readonly LeaveSession[];
    onSelect: (value: LeaveSession) => void;
    error?: string;
    helper?: string;
    testIDPrefix: string;
};

/**
 * Radio-style slot picker. Extracted rather than duplicated because the start and end
 * selectors are identical apart from the field they write to, and keeping them in one
 * place guarantees they can never drift into different visual treatments.
 */
function SessionSelector({
    label,
    selected,
    options,
    onSelect,
    error,
    helper,
    testIDPrefix,
}: SessionSelectorProps): React.JSX.Element {
    const theme = useTheme();

    return (
        <View style={{ gap: theme.spacing.sm }} testID={testIDPrefix}>
            <AppText variant="caption" color="textSecondary">
                {label}
            </AppText>

            <View style={[styles.chips, { gap: theme.spacing.xs }]}>
                {options.map(option => {
                    const isSelected = option === selected;

                    return (
                        <Pressable
                            key={option}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: isSelected }}
                            testID={`${testIDPrefix}-${option}`}
                            onPress={() => onSelect(option)}
                            style={[
                                styles.chip,
                                {
                                    paddingVertical: theme.spacing.xs,
                                    paddingHorizontal: theme.spacing.sm,
                                    borderRadius: theme.radius.full,
                                    borderWidth: theme.sizing.borderWidths.hairline,
                                    borderColor: isSelected
                                        ? theme.colors.primary
                                        : theme.colors.border,
                                    backgroundColor: isSelected
                                        ? theme.colors.primarySoft
                                        : theme.colors.surface,
                                },
                            ]}>
                            <AppText
                                variant="caption"
                                color={isSelected ? 'primaryPressed' : 'textSecondary'}>
                                {SESSION_LABELS[option]}
                            </AppText>
                        </Pressable>
                    );
                })}
            </View>

            {error ? (
                <AppText variant="caption" color="danger">
                    {error}
                </AppText>
            ) : helper ? (
                <AppText variant="caption" color="textMuted">
                    {helper}
                </AppText>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingBottom: 40,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    chip: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    attachmentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    attachmentName: {
        flex: 1,
    },
});

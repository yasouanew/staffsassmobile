import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppCard } from '../../../components/AppCard';
import { AppHeader } from '../../../components/AppHeader';
import { AppText } from '../../../components/AppText';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorView } from '../../../components/ErrorView';
import { LoadingView } from '../../../components/LoadingView';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { StatusBadge } from '../../../components/StatusBadge';
import type { LeaveStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import type { LeaveRequestStatus } from '../../../types/api';
import { formatDate } from '../../../utils/date';
import { useLeaveRequests } from '../hooks';
import type { LeaveRequest } from '../types';
import { formatTotalDays, sessionLabel } from '../utils/leaveRequest';

type Props = NativeStackScreenProps<LeaveStackParamList, 'LeaveList'>;

type FilterKey = LeaveRequestStatus | 'all';

/**
 * Filters offered in the header. `all` maps to "no filter" rather than a status,
 * because the API treats an absent `status` as "every status" — inventing an `all`
 * value would send an invalid enum and return a 422.
 */
const FILTERS: readonly { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
];

const PAGE_SIZE = 20;

/**
 * My Leave (spec Screen 8).
 *
 * `GET /leave-requests` is auto-scoped to the token's employee (spec §0.5), so no
 * `employee_id` is passed anywhere in this screen — see
 * [`useLeaveRequests`](src/features/leave/hooks/useLeaveRequests.ts:1).
 *
 * There is no balance endpoint — only `total_days` per request is shown, never an
 * authoritative balance (spec Screen 8 §5). There is no cancel action (G6).
 */
export function LeaveListScreen({ navigation }: Props): React.JSX.Element {
    const theme = useTheme();
    const [status, setStatus] = useState<FilterKey>('all');
    const [page, setPage] = useState(1);
    const [allItems, setAllItems] = useState<LeaveRequest[]>([]);

    const listParams = useMemo(
        () => ({
            status: status === 'all' ? undefined : status,
            per_page: PAGE_SIZE,
            page,
        }),
        [status, page],
    );
    const query = useLeaveRequests(listParams);
    const pendingQuery = useLeaveRequests({ status: 'pending', per_page: 1, page: 1 });

    // Reset accumulation when the filter changes.
    useEffect(() => {
        setPage(1);
        setAllItems([]);
    }, [status]);

    // Accumulate pages for infinite scroll, deduped by id.
    useEffect(() => {
        const fresh = query.data?.data;

        if (!fresh) {
            return;
        }

        setAllItems(previous => {
            if (page === 1) {
                return fresh;
            }

            const seen = new Set(previous.map(item => item.id));
            const appended = fresh.filter(item => !seen.has(item.id));

            return [...previous, ...appended];
        });
    }, [query.data, page]);

    const pendingTotal = pendingQuery.data?.meta.total ?? 0;
    const hasMore = query.data ? query.data.meta.current_page < query.data.meta.last_page : false;

    const handleRefresh = (): void => {
        setPage(1);
        void query.refetch();
        void pendingQuery.refetch();
    };

    const handleEndReached = (): void => {
        if (hasMore && !query.isFetching && !query.isPending) {
            setPage(current => current + 1);
        }
    };

    const header = (
        <AppHeader
            title="Leave"
            subtitle="Your leave requests."
            action={
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Request leave"
                    testID="leave-request-action"
                    onPress={() => navigation.navigate('CreateLeaveRequest')}
                    hitSlop={theme.spacing.sm}>
                    <AppText variant="bodyStrong" color="textLink">
                        + Request
                    </AppText>
                </Pressable>
            }
        />
    );

    if (query.isPending && page === 1 && allItems.length === 0) {
        return (
            <ScreenContainer hasHeader>
                {header}
                <LoadingView message="Loading your leave requests…" />
            </ScreenContainer>
        );
    }

    if (query.isError && allItems.length === 0) {
        return (
            <ScreenContainer hasHeader>
                {header}
                <ErrorView error={query.error} onRetry={() => void query.refetch()} />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer hasHeader scrollable={false} withFabSpacing>
            {header}

            <View style={[styles.body, { gap: theme.spacing.sm }]}>
                {pendingTotal > 0 ? (
                    <View
                        testID="leave-pending-count"
                        accessibilityRole="text"
                        style={[
                            styles.pendingBanner,
                            {
                                backgroundColor: theme.colors.warningSoft,
                                borderRadius: theme.radius.md,
                                paddingVertical: theme.spacing.sm,
                                paddingHorizontal: theme.spacing.md,
                            },
                        ]}>
                        <AppText variant="bodyStrong" color="warningStrong">
                            {pendingTotal} pending
                        </AppText>
                        <AppText variant="caption" color="warningStrong">
                            Awaiting a decision — pending requests cannot be withdrawn from the
                            app.
                        </AppText>
                    </View>
                ) : null}

                <View
                    style={[styles.filters, { gap: theme.spacing.xs }]}
                    testID="leave-filters">
                    {FILTERS.map(filter => {
                        const isActive = filter.key === status;

                        return (
                            <Pressable
                                key={filter.key}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isActive }}
                                testID={`leave-filter-${filter.key}`}
                                onPress={() => setStatus(filter.key)}
                                style={[
                                    styles.filterChip,
                                    {
                                        paddingVertical: theme.spacing.xs,
                                        paddingHorizontal: theme.spacing.sm,
                                        borderRadius: theme.radius.full,
                                        backgroundColor: isActive
                                            ? theme.colors.primary
                                            : theme.colors.surfaceMuted,
                                    },
                                ]}>
                                <AppText
                                    variant="caption"
                                    color={isActive ? 'onPrimary' : 'textSecondary'}>
                                    {filter.label}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </View>

                <FlatList<LeaveRequest>
                    data={allItems}
                    keyExtractor={request => String(request.id)}
                    testID="leave-list"
                    contentContainerStyle={[styles.list, { gap: theme.spacing.sm }]}
                    refreshing={query.isRefetching}
                    onRefresh={handleRefresh}
                    onEndReached={handleEndReached}
                    onEndReachedThreshold={0.5}
                    ListEmptyComponent={
                        <EmptyState
                            title="No leave requests"
                            description={
                                status === 'all'
                                    ? 'You have not submitted any leave requests yet. Tap + to request leave.'
                                    : `You have no ${status} leave requests.`
                            }
                            actionLabel="Request leave"
                            onAction={() => navigation.navigate('CreateLeaveRequest')}
                        />
                    }
                    ListFooterComponent={
                        query.isFetching && page > 1 ? (
                            <LoadingView message="Loading more…" fullScreen={false} />
                        ) : undefined
                    }
                    renderItem={({ item }) => (
                        <LeaveRow
                            request={item}
                            onPress={() =>
                                navigation.navigate('LeaveDetail', {
                                    leaveRequestId: item.id,
                                })
                            }
                        />
                    )}
                />
            </View>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Request leave"
                testID="leave-fab"
                onPress={() => navigation.navigate('CreateLeaveRequest')}
                style={[
                    styles.fab,
                    {
                        backgroundColor: theme.colors.primary,
                        borderRadius: theme.radius.full,
                        width: 56,
                        height: 56,
                    },
                ]}>
                <AppText variant="title" color="onPrimary" align="center">
                    +
                </AppText>
            </Pressable>
        </ScreenContainer>
    );
}

function LeaveRow({
    request,
    onPress,
}: {
    request: LeaveRequest;
    onPress: () => void;
}): React.JSX.Element {
    const theme = useTheme();
    const dates = `${formatDate(request.start_date)} – ${formatDate(request.end_date)}`;
    const sessions = sessionLabel(
        request.start_date,
        request.end_date,
        request.start_session,
        request.end_session,
    );
    const attachmentCount = request.attachments?.length ?? 0;

    return (
        <AppCard
            onPress={onPress}
            testID={`leave-card-${request.id}`}
            accessibilityLabel={`${request.leave_type?.name ?? 'Leave'}, ${dates}, ${request.status}`}>
            <View style={[styles.row, { gap: theme.spacing.sm }]}>
                <View style={[styles.textBlock, { gap: theme.spacing.xxs }]}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                        {request.leave_type?.name ?? 'Leave'}
                    </AppText>
                    <AppText variant="caption" color="textSecondary">
                        {dates} · {formatTotalDays(request.total_days)}
                    </AppText>
                    <AppText variant="caption" color="textMuted">
                        {sessions}
                        {attachmentCount > 0
                            ? ` · ${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'}`
                            : ''}
                    </AppText>
                    {request.reason ? (
                        <AppText variant="caption" color="textSecondary" numberOfLines={2}>
                            {request.reason}
                        </AppText>
                    ) : null}
                </View>

                <StatusBadge status={request.status} />
            </View>
        </AppCard>
    );
}

const styles = StyleSheet.create({
    body: {
        flex: 1,
        paddingTop: 12,
    },
    pendingBanner: {
        gap: 2,
    },
    filters: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    filterChip: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        paddingBottom: 96,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    textBlock: {
        flex: 1,
        flexShrink: 1,
    },
    fab: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        right: 16,
        bottom: 24,
    },
});

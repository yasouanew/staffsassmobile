import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '../../../components/AppButton';
import { AppHeader } from '../../../components/AppHeader';
import { AppText } from '../../../components/AppText';
import { AppTextInput } from '../../../components/AppTextInput';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { AccountStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { isAppError } from '../../../types/appError';
import {
    updateProfileSchema,
    type UpdateProfileFormValues,
} from '../../auth/validation';
import { useSession } from '../../auth/hooks';
import { useSessionStore } from '../../auth/store/sessionStore';
import { useUpdateProfile } from '../../profile/hooks';
import { toFieldErrorMap } from '../../../utils/errors';

type Props = NativeStackScreenProps<AccountStackParamList, 'Profile'>;

/**
 * Personal details (spec Screen 12).
 *
 * Only `name` and `email` are editable — the backend's `UpdateProfileRequest` accepts
 * nothing else, and `phone` is read-only on `UserResource`. Phone is therefore shown
 * as a non-editable row rather than an input that would silently discard edits.
 *
 * Changing the email resets `email_verified_at` server-side. That is surfaced as a
 * warning *before* submitting, because the consequence (losing access to parts of the
 * app until re-verification) is not discoverable afterwards.
 */
export function ProfileScreen({ navigation }: Props): React.JSX.Element {
    const theme = useTheme();
    const session = useSession();
    const cachedUser = useSessionStore(state => state.user);
    const user = session.data ?? cachedUser;

    const updateProfile = useUpdateProfile();

    const {
        control,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<UpdateProfileFormValues>({
        resolver: zodResolver(updateProfileSchema),
        defaultValues: {
            name: user?.name ?? '',
            email: user?.email ?? '',
        },
    });

    const onSubmit = handleSubmit(async values => {
        try {
            await updateProfile.mutateAsync(values);
            navigation.goBack();
        } catch (error) {
            if (!isAppError(error)) {
                setError('root', {
                    type: 'server',
                    message: 'We could not save your details. Please try again.',
                });
                return;
            }

            const fieldErrors = toFieldErrorMap(error);

            if (Object.keys(fieldErrors).length === 0) {
                setError('root', { type: 'server', message: error.message });
                return;
            }

            (Object.keys(fieldErrors) as (keyof UpdateProfileFormValues)[]).forEach(key => {
                setError(key, { type: 'server', message: fieldErrors[key] });
            });
        }
    });

    return (
        <ScreenContainer hasHeader>
            <AppHeader
                title="Personal details"
                subtitle="Update your name and email."
                onBack={() => navigation.goBack()}
            />

            <ScrollView
                contentContainerStyle={[styles.content, { gap: theme.spacing.md }]}
                keyboardShouldPersistTaps="handled"
            >
                <Controller
                    control={control}
                    name="name"
                    render={({ field }) => (
                        <AppTextInput
                            label="Full name"
                            required
                            autoCapitalize="words"
                            autoComplete="name"
                            value={field.value}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            error={errors.name?.message}
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="email"
                    render={({ field }) => (
                        <AppTextInput
                            label="Email"
                            required
                            autoCapitalize="none"
                            autoComplete="email"
                            keyboardType="email-address"
                            value={field.value}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            error={errors.email?.message}
                            helper="Changing your email requires you to verify the new address."
                        />
                    )}
                />

                {user?.phone ? (
                    <View style={{ gap: theme.spacing.xs }}>
                        <AppText variant="caption" color="textSecondary">
                            Phone
                        </AppText>
                        <AppText variant="body">{user.phone}</AppText>
                        <AppText variant="caption" color="textMuted">
                            Contact your administrator to change your phone number.
                        </AppText>
                    </View>
                ) : null}

                {errors.root ? (
                    <AppText variant="caption" color="danger">
                        {errors.root.message}
                    </AppText>
                ) : null}

                <AppButton
                    label="Save changes"
                    onPress={onSubmit}
                    loading={isSubmitting || updateProfile.isPending}
                />
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingBottom: 40,
    },
});

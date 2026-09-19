import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppHeader } from '../../../components/AppHeader';
import { AppText } from '../../../components/AppText';
import { AppTextInput } from '../../../components/AppTextInput';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { AccountStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import { isAppError } from '../../../types/appError';
import { toFieldErrorMap } from '../../../utils/errors';
import { useSignOutEverywhere } from '../../auth/hooks';
import { updatePasswordSchema, type UpdatePasswordFormValues } from '../../auth/validation';
import { useUpdatePassword } from '../../profile/hooks';

type Props = NativeStackScreenProps<AccountStackParamList, 'ChangePassword'>;

/**
 * Change password (spec Screen 14).
 *
 * **The backend does not accept or verify the current password** — `UpdatePasswordRequest`
 * only validates `password` + `password_confirmation`. Inventing a "current password"
 * field would be pure theatre: it could be filled with anything and the change would
 * still succeed, which is worse than not asking.
 *
 * Because there is no re-authentication, the screen is explicit about the risk and
 * offers "sign out everywhere" as the follow-up action, so a user who suspects their
 * account is compromised can revoke the other sessions in the same flow. That button
 * is the reason this screen renders alongside the mutation rather than after it.
 */
export function ChangePasswordScreen({ navigation }: Props): React.JSX.Element {
    const theme = useTheme();
    const updatePassword = useUpdatePassword();
    const signOutEverywhere = useSignOutEverywhere();

    const {
        control,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<UpdatePasswordFormValues>({
        resolver: zodResolver(updatePasswordSchema),
        defaultValues: {
            password: '',
            password_confirmation: '',
        },
    });

    const confirmSignOutEverywhere = () => {
        Alert.alert(
            'Sign out everywhere',
            'This revokes every active session, including this device. You will need to sign in again.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign out everywhere',
                    style: 'destructive',
                    onPress: () => signOutEverywhere.mutate(),
                },
            ],
        );
    };

    const onSubmit = handleSubmit(async values => {
        try {
            await updatePassword.mutateAsync(values);

            // Clear the fields before leaving: the password must not linger in form
            // state behind the previous screen.
            reset();

            Alert.alert(
                'Password updated',
                'Your password has been changed. For security, you can sign out other devices below.',
                [
                    {
                        text: 'Sign out other devices',
                        style: 'destructive',
                        onPress: confirmSignOutEverywhere,
                    },
                    { text: 'Done', onPress: () => navigation.goBack() },
                ],
            );
        } catch (error) {
            if (!isAppError(error)) {
                setError('root', {
                    type: 'server',
                    message: 'We could not update your password. Please try again.',
                });
                return;
            }

            const fieldErrors = toFieldErrorMap(error);

            if (Object.keys(fieldErrors).length === 0) {
                setError('root', { type: 'server', message: error.message });
                return;
            }

            (Object.keys(fieldErrors) as (keyof UpdatePasswordFormValues)[]).forEach(key => {
                setError(key, { type: 'server', message: fieldErrors[key] });
            });
        }
    });

    return (
        <ScreenContainer hasHeader>
            <AppHeader
                title="Change password"
                subtitle="Choose a new password."
                onBack={() => navigation.goBack()}
            />

            <ScrollView
                contentContainerStyle={[styles.content, { gap: theme.spacing.md }]}
                keyboardShouldPersistTaps="handled"
            >
                <Controller
                    control={control}
                    name="password"
                    render={({ field }) => (
                        <AppTextInput
                            label="New password"
                            required
                            secureToggle
                            autoCapitalize="none"
                            autoComplete="new-password"
                            value={field.value}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            error={errors.password?.message}
                            helper="At least 8 characters."
                        />
                    )}
                />

                <Controller
                    control={control}
                    name="password_confirmation"
                    render={({ field }) => (
                        <AppTextInput
                            label="Confirm new password"
                            required
                            secureToggle
                            autoCapitalize="none"
                            autoComplete="new-password"
                            value={field.value}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            error={errors.password_confirmation?.message}
                        />
                    )}
                />

                <AppCard>
                    <AppText variant="caption" color="textSecondary">
                        Changing your password does not sign out other devices. Use the option below
                        if you think someone else has access to your account.
                    </AppText>
                </AppCard>

                {errors.root ? (
                    <AppText variant="caption" color="danger">
                        {errors.root.message}
                    </AppText>
                ) : null}

                <AppButton
                    label="Update password"
                    onPress={onSubmit}
                    loading={isSubmitting || updatePassword.isPending}
                />

                <AppButton
                    label="Sign out everywhere"
                    variant="danger"
                    onPress={confirmSignOutEverywhere}
                    loading={signOutEverywhere.isPending}
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

import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../../components/AppButton';
import { AppHeader } from '../../../components/AppHeader';
import { AppText } from '../../../components/AppText';
import { AppTextInput } from '../../../components/AppTextInput';
import { PasswordStrengthMeter } from '../../../components/PasswordStrengthMeter';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { AuthStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import type { AppError } from '../../../types/appError';
import { toFieldErrorMap } from '../../../utils/errors';
import { useResetPassword } from '../hooks';
import { useRecoveryStore } from '../store';
import { parseResetParams } from '../utils';
import { evaluatePasswordStrength } from '../utils/passwordStrength';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

/**
 * Reset password (spec Screen 3).
 *
 * `token` and `email` normally arrive as route params, populated by the deep-link
 * handler at the root of the app. Both are treated as **optional inputs** rather
 * than assumptions, because a link can be opened without the query string (a
 * truncated share, a hand-typed address, an OS that strips the fragment) and a
 * crash-on-mount is a far worse failure than an empty field.
 *
 * Three ways the values can arrive, in priority order:
 *
 * 1. Deep link params (`staffapp://reset-password?token=…&email=…`) — the normal path.
 * 2. The recovery store — set by Forgot Password when the user stayed in the app.
 * 3. Nothing at all — the token field is revealed and the user pastes the code.
 *
 * There is no endpoint to validate the token ahead of time (spec Screen 3), so the
 * screen submits blind and maps any 422 onto `token` or `email` — which is exactly
 * what the field-level error handling is for.
 */
export function ResetPasswordScreen({ navigation, route }: Props): React.JSX.Element {
    const theme = useTheme();

    const pendingEmail = useRecoveryStore(state => state.pendingEmail);

    /**
     * `route.params` is optional at the type level (deep links can omit it entirely),
     * so everything is funnelled through the same tolerant parser the link handler uses.
     * Memoised because `useForm`'s `defaultValues` are read once on mount, and a fresh
     * object identity on every render serves no purpose.
     */
    const initial = useMemo(() => {
        const parsed = parseResetParams(route.params);

        return {
            token: parsed.token,
            email: parsed.email.length > 0 ? parsed.email : (pendingEmail ?? ''),
        };
    }, [route.params, pendingEmail]);

    const {
        control,
        handleSubmit,
        setError,
        watch,
        formState: { errors },
    } = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            token: initial.token,
            email: initial.email,
            password: '',
            password_confirmation: '',
        },
        mode: 'onBlur',
    });

    const passwordValue = watch('password');
    const strength = useMemo(() => evaluatePasswordStrength(passwordValue ?? ''), [passwordValue]);

    const resetPassword = useResetPassword();

    /**
     * When no token came in with the link there is nothing to submit, so the field is
     * revealed instead of failing validation on an invisible input. The user is told
     * where to find the code rather than being left staring at an empty form.
     */
    const hasToken = initial.token.length > 0;

    const onSubmit = handleSubmit(async values => {
        try {
            await resetPassword.mutateAsync(values);
        } catch (error) {
            const appError = error as AppError;

            if (appError.kind === 'validation' && appError.fieldErrors) {
                const fields = toFieldErrorMap(appError);
                const resetFields: Array<keyof ResetPasswordFormValues> = [
                    'token',
                    'email',
                    'password',
                    'password_confirmation',
                ];
                let handled = false;

                resetFields.forEach(field => {
                    const message = fields[field];

                    if (message) {
                        setError(field, { type: 'server', message });
                        handled = true;
                    }
                });

                if (handled) {
                    return;
                }
            }

            setError('root', { type: 'server', message: appError.message });
        }
    });

    if (resetPassword.isSuccess) {
        return (
            <ScreenContainer scrollable contentContainerStyle={styles.content}>
                <AppHeader title="Password updated" />

                <View style={[styles.block, { gap: theme.spacing.sm }]}>
                    <AppText variant="body" color="textSecondary">
                        Your password has been changed. Sign in with your new password to
                        continue.
                    </AppText>
                </View>

                <AppButton
                    label="Back to sign in"
                    onPress={() => navigation.navigate('Login')}
                    fullWidth
                    size="lg"
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scrollable contentContainerStyle={styles.content}>
            <AppHeader title="Set a new password" onBack={() => navigation.goBack()} />

            <View style={[styles.block, { gap: theme.spacing.sm }]}>
                <AppText variant="body" color="textSecondary">
                    {hasToken
                        ? 'Choose a new password for your account.'
                        : 'Paste the reset code from your email, then choose a new password.'}
                </AppText>
            </View>

            <View style={[styles.form, { gap: theme.spacing.md }]}>
                {hasToken ? null : (
                    <Controller
                        control={control}
                        name="token"
                        render={({ field }) => (
                            <AppTextInput
                                label="Reset code"
                                value={field.value}
                                onChangeText={field.onChange}
                                onBlur={field.onBlur}
                                error={errors.token?.message}
                                helper="Copy it from the reset link in your email."
                                autoCapitalize="none"
                                autoCorrect={false}
                                required
                            />
                        )}
                    />
                )}

                <Controller
                    control={control}
                    name="email"
                    render={({ field }) => (
                        <AppTextInput
                            label="Email"
                            value={field.value}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            error={errors.email?.message}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect={false}
                            textContentType="emailAddress"
                            required
                        />
                    )}
                />

                <View style={{ gap: theme.spacing.xs }}>
                    <Controller
                        control={control}
                        name="password"
                        render={({ field }) => (
                            <AppTextInput
                                label="New password"
                                value={field.value}
                                onChangeText={field.onChange}
                                onBlur={field.onBlur}
                                error={errors.password?.message}
                                helper="At least 8 characters."
                                secureToggle
                                autoCapitalize="none"
                                autoComplete="new-password"
                                textContentType="newPassword"
                                required
                            />
                        )}
                    />

                    <PasswordStrengthMeter
                        score={strength.score}
                        label={strength.label}
                        suggestions={strength.suggestions}
                    />
                </View>

                <Controller
                    control={control}
                    name="password_confirmation"
                    render={({ field }) => (
                        <AppTextInput
                            label="Confirm new password"
                            value={field.value}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            error={errors.password_confirmation?.message}
                            secureToggle
                            autoCapitalize="none"
                            autoComplete="new-password"
                            textContentType="newPassword"
                            required
                        />
                    )}
                />

                {errors.root?.message ? (
                    <AppText variant="caption" color="dangerStrong">
                        {errors.root.message}
                    </AppText>
                ) : null}

                <AppButton
                    label="Update password"
                    onPress={onSubmit}
                    loading={resetPassword.isPending}
                    fullWidth
                    size="lg"
                />
            </View>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
    },
    block: {
        marginBottom: 24,
    },
    form: {
        marginBottom: 16,
    },
});

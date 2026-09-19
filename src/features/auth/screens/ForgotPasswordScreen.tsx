import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../../components/AppButton';
import { AppHeader } from '../../../components/AppHeader';
import { AppText } from '../../../components/AppText';
import { AppTextInput } from '../../../components/AppTextInput';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { AuthStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import type { AppError } from '../../../types/appError';
import { toFieldErrorMap } from '../../../utils/errors';
import { useForgotPassword } from '../hooks';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

/**
 * Forgot password (spec Screen 2).
 *
 * The success state is intentionally **one-way and non-enumerating**: the backend
 * returns the same message whether or not the address exists, and the UI repeats
 * that indistinguishability rather than confirming "we found your account". That is
 * a deliberate anti-enumeration property, not an oversight.
 *
 * The success panel still offers a way forward into Reset Password, because the deep
 * link can fail to reach the app on some devices (an email client that swaps in its
 * own in-app browser, for instance). That path is worded as "already have a code" so
 * it does not leak whether the address was recognised.
 */
export function ForgotPasswordScreen({ navigation }: Props): React.JSX.Element {
    const theme = useTheme();

    const {
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: '' },
        mode: 'onBlur',
    });

    const requestReset = useForgotPassword();

    const onSubmit = handleSubmit(async values => {
        try {
            await requestReset.mutateAsync(values);
        } catch (error) {
            const appError = error as AppError;

            if (appError.kind === 'validation' && appError.fieldErrors) {
                const fields = toFieldErrorMap(appError);
                const message = fields.email;

                if (message) {
                    setError('email', { type: 'server', message });
                    return;
                }
            }

            setError('root', { type: 'server', message: appError.message });
        }
    });

    if (requestReset.isSuccess) {
        return (
            <ScreenContainer scrollable contentContainerStyle={styles.content}>
                <AppHeader title="Check your email" onBack={() => navigation.goBack()} />

                <View style={[styles.block, { gap: theme.spacing.sm }]}>
                    <AppText variant="body" color="textSecondary">
                        If an account exists for that address, a password reset link is on its
                        way. The link expires shortly, so use it soon.
                    </AppText>
                    <AppText variant="caption" color="textMuted">
                        Nothing arrived? Check your spam folder before requesting another link —
                        the reset endpoint is rate limited.
                    </AppText>
                </View>

                <View style={[styles.actions, { gap: theme.spacing.sm }]}>
                    <AppButton
                        label="Back to sign in"
                        onPress={() => navigation.navigate('Login')}
                        fullWidth
                    />

                    <AppButton
                        label="I already have a reset code"
                        onPress={() => navigation.navigate('ResetPassword')}
                        variant="secondary"
                        fullWidth
                    />
                </View>
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scrollable contentContainerStyle={styles.content}>
            <AppHeader title="Forgot password" onBack={() => navigation.goBack()} />

            <View style={[styles.block, { gap: theme.spacing.sm }]}>
                <AppText variant="body" color="textSecondary">
                    Enter the email address on your account and we will send a reset link.
                </AppText>
            </View>

            <View style={[styles.form, { gap: theme.spacing.md }]}>
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

                {errors.root?.message ? (
                    <AppText variant="caption" color="dangerStrong">
                        {errors.root.message}
                    </AppText>
                ) : null}

                <AppButton
                    label="Send reset link"
                    onPress={onSubmit}
                    loading={requestReset.isPending}
                    fullWidth
                    size="lg"
                />

                <Pressable
                    accessibilityRole="button"
                    onPress={() => navigation.navigate('ResetPassword')}
                    style={styles.link}
                >
                    <AppText variant="label" color="textLink">
                        Already have a reset code?
                    </AppText>
                </Pressable>
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
    actions: {
        marginBottom: 16,
    },
    link: {
        alignSelf: 'center',
        paddingVertical: 4,
    },
});

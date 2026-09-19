import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../../../components/AppButton';
import { AppText } from '../../../components/AppText';
import { AppTextInput } from '../../../components/AppTextInput';
import { ScreenContainer } from '../../../components/ScreenContainer';
import type { AuthStackParamList } from '../../../navigation/types';
import { useTheme } from '../../../theme';
import type { AppError } from '../../../types/appError';
import { toFieldErrorMap } from '../../../utils/errors';
import { useLogin } from '../hooks';
import { loginSchema, type LoginFormValues } from '../validation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

/**
 * Login screen (spec Screen 1).
 *
 * Validation: the Zod schema only checks presence and email shape. Credential
 * correctness, account status and throttling are server concerns and are surfaced
 * from the API response — the client must not claim to know whether a password is
 * right.
 *
 * Errors are split by kind rather than dumped as one string: field-scoped 422s go
 * back onto their inputs, everything else becomes a form-level message, and a 429
 * gets a distinct explanation because retrying immediately makes it worse.
 */
export function LoginScreen({ navigation }: Props): React.JSX.Element {
    const theme = useTheme();
    const login = useLogin();

    const {
        control,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
        mode: 'onBlur',
    });

    const onSubmit = handleSubmit(async values => {
        try {
            await login.mutateAsync({
                email: values.email,
                password: values.password,
            });
            // No navigation on success: the root navigator switches stacks when the
            // session store reports `authenticated`. Navigating here as well would
            // race that switch.
        } catch (error) {
            const appError = error as AppError;

            if (appError.kind === 'validation' && appError.fieldErrors) {
                const fields = toFieldErrorMap(appError);
                const loginFields: Array<keyof LoginFormValues> = ['email', 'password'];

                loginFields.forEach(field => {
                    const message = fields[field];

                    if (message) {
                        setError(field, { type: 'server', message });
                    }
                });

                return;
            }

            // The message is already human-readable and kind-aware (see
            // `normalizeError`), so it is surfaced verbatim.
            setError('root', { type: 'server', message: appError.message });
        }
    });

    const rootError = errors.root?.message;
    const isThrottled = login.error?.kind === 'throttled';

    return (
        <ScreenContainer scrollable contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <AppText variant="title">Welcome back</AppText>
                <AppText variant="body" color="textSecondary">
                    Sign in to view your shifts, roster and leave.
                </AppText>
            </View>

            <View style={styles.form}>
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

                <Controller
                    control={control}
                    name="password"
                    render={({ field }) => (
                        <AppTextInput
                            label="Password"
                            value={field.value}
                            onChangeText={field.onChange}
                            onBlur={field.onBlur}
                            error={errors.password?.message}
                            secureToggle
                            autoCapitalize="none"
                            autoComplete="current-password"
                            textContentType="password"
                            required
                        />
                    )}
                />

                {rootError ? (
                    <View
                        style={[
                            styles.formError,
                            {
                                backgroundColor: isThrottled
                                    ? theme.colors.warningSoft
                                    : theme.colors.dangerSoft,
                                borderRadius: theme.radius.sm,
                                padding: theme.spacing.sm,
                            },
                        ]}
                    >
                        <AppText
                            variant="caption"
                            color={isThrottled ? 'warningStrong' : 'dangerStrong'}
                        >
                            {rootError}
                        </AppText>
                    </View>
                ) : null}

                <AppButton
                    label="Sign in"
                    onPress={onSubmit}
                    loading={isSubmitting || login.isPending}
                    fullWidth
                    size="lg"
                />

                <Pressable
                    onPress={() => navigation.navigate('ForgotPassword')}
                    accessibilityRole="button"
                    style={styles.link}
                >
                    <AppText variant="body" color="primary">
                        Forgot password?
                    </AppText>
                </Pressable>
            </View>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 24,
    },
    form: {
        gap: 16,
    },
    formError: {
        width: '100%',
    },
    link: {
        alignSelf: 'center',
        paddingVertical: 8,
    },
});

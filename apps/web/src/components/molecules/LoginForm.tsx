'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { LoginRequestSchema } from 'shared';

import { ControlledInput } from '@/components/atoms/ControlledInput';
import { MotionButton } from '@/components/ui/motionButton';
import authHooks from '@/hooks/useAuth';
import type { LoginCredentials } from '@/services/interfaces/auth.interface';
import { extractApiErrorMessage } from '@/utils/apiError';

const DEFAULT_VALUES: LoginCredentials = {
  email: '',
  password: '',
};

const SUCCESS_REDIRECT = '/dashboard';
const SUBMIT_LABEL = 'Entrar';
const GENERIC_ERROR = 'Não foi possível entrar. Tente novamente.';

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { login } = authHooks.use();

  const { control, handleSubmit, formState } = useForm<LoginCredentials>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(LoginRequestSchema),
    mode: 'onBlur',
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login.mutateAsync(values);
      router.push(SUCCESS_REDIRECT);
    } catch (error) {
      setServerError(extractApiErrorMessage(error) ?? GENERIC_ERROR);
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-10 rounded-2xl border border-zinc-200/70 bg-white/60 p-8 shadow-sm backdrop-blur-sm dark:border-zinc-800/70 dark:bg-zinc-950/60"
    >
      <div className="flex flex-col gap-8">
        <ControlledInput
          control={control}
          name="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          autoFocus
        />
        <ControlledInput
          control={control}
          name="password"
          label="Senha"
          type="password"
          autoComplete="current-password"
          showPasswordToggle
        />
      </div>

      {serverError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {serverError}
        </p>
      ) : null}

      <div className="flex justify-center">
        <MotionButton
          type="submit"
          label={SUBMIT_LABEL}
          loading={formState.isSubmitting || login.isPending}
          revealDelay={1.4}
        />
      </div>
    </form>
  );
}

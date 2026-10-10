'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import authHooks from '@/hooks/useAuth';

const LABEL = 'Sair';

export function LogoutButton() {
  const router = useRouter();
  const { logout } = authHooks.use();

  async function handleClick() {
    await logout.mutateAsync();
    router.push('/login');
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-loading={logout.isPending}
      onClick={handleClick}
      disabled={logout.isPending}
      className="gap-2"
    >
      <LogOut aria-hidden="true" className="size-4" />
      {LABEL}
    </Button>
  );
}

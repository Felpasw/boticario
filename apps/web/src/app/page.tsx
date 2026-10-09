'use client';

import { useRouter } from 'next/navigation';

import { AuthTemplate } from '@/components/templates/AuthTemplate';
import { HeroShutterText } from '@/components/ui/heroShutterText';
import { MotionButton } from '@/components/ui/motionButton';

const SUBTITLE = 'Wi-Fi Insights · Loja Boticário';
const FOOTER = 'Boticario — guest Wi-Fi visibility panel';
const CTA_LABEL = 'Começar';
const LOGIN_PATH = '/login';

export default function LandingPage() {
  const router = useRouter();

  return (
    <AuthTemplate subtitle={SUBTITLE} footer={FOOTER} heading={<HeroShutterText />}>
      <div className="flex justify-center">
        <MotionButton type="button" label={CTA_LABEL} onClick={() => router.push(LOGIN_PATH)} />
      </div>
    </AuthTemplate>
  );
}

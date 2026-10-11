import { LoginForm } from '@/components/molecules/LoginForm';
import { AuthTemplate } from '@/components/templates/AuthTemplate';
import { AnimatedBoticarioLogo } from '@/components/ui/AnimatedBoticarioLogo';

const SUBTITLE = 'Wi-Fi Insights · Loja Boticário';
const FOOTER = 'Boticario — guest Wi-Fi visibility panel';

export default function LoginPage() {
  return (
    <AuthTemplate
      subtitle={SUBTITLE}
      footer={FOOTER}
      heading={<AnimatedBoticarioLogo width={320} height={180} priority />}
    >
      <LoginForm />
    </AuthTemplate>
  );
}

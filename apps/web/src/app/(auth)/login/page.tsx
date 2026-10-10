import { LoginForm } from '@/components/molecules/LoginForm';
import { AuthTemplate } from '@/components/templates/AuthTemplate';
import { HeroShutterText } from '@/components/ui/heroShutterText';

const SUBTITLE = 'Wi-Fi Insights · Loja Boticário';
const FOOTER = 'Boticario — guest Wi-Fi visibility panel';

export default function LoginPage() {
  return (
    <AuthTemplate
      subtitle={SUBTITLE}
      footer={FOOTER}
      heading={<HeroShutterText textSizeClass="text-[clamp(2rem,8vw,6rem)]" />}
    >
      <LoginForm />
    </AuthTemplate>
  );
}

import PrototypePage from '@/components/PrototypePage';
import AccountHydrator from '@/components/AccountHydrator';

export default function AccountPage() {
  return (
    <AccountHydrator>
      <PrototypePage page="account" />
    </AccountHydrator>
  );
}

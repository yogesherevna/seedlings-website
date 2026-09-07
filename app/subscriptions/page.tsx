import PrototypePage from '@/components/PrototypePage';
import SubscriptionHydrator from '@/components/SubscriptionHydrator';

export default function SubscriptionsPage() {
  return (
    <SubscriptionHydrator>
      <PrototypePage page="subscriptions" />
    </SubscriptionHydrator>
  );
}

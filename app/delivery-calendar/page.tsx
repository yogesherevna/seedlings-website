import PrototypePage from '@/components/PrototypePage';
import DeliveryCalendarHydrator from '@/components/DeliveryCalendarHydrator';

export default function Page() {
  return (
    <DeliveryCalendarHydrator>
      <PrototypePage page="delivery-calendar" />
    </DeliveryCalendarHydrator>
  );
}

import PrototypePage from '@/components/PrototypePage';
import OrderDetailHydrator from '@/components/OrderDetailHydrator';

export default function Page() {
  return (
    <OrderDetailHydrator>
      <PrototypePage page="order-detail" />
    </OrderDetailHydrator>
  );
}

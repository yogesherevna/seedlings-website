import PrototypePage from '@/components/PrototypePage';
import CheckoutHydrator from '@/components/CheckoutHydrator';

export default function Page() {
  return <CheckoutHydrator><PrototypePage page="checkout" /></CheckoutHydrator>;
}

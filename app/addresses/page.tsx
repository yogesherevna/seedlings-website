import PrototypePage from '@/components/PrototypePage';
import AddressHydrator from '@/components/AddressHydrator';

export default function Page() {
  return <AddressHydrator><PrototypePage page="addresses" /></AddressHydrator>;
}

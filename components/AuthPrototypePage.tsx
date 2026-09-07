import PrototypePage from './PrototypePage';
import AuthHydrator from './AuthHydrator';

export default function AuthPrototypePage() {
  return <AuthHydrator><PrototypePage page="account" /></AuthHydrator>;
}

import PrototypePage from './PrototypePage';

type Page = 'home'|'microgreens'|'product'|'journey'|'contact'|'account'|'cart'|'checkout'|'success';

export default function CmsPrototypePage({ page }: { page: Page }) {
  return <PrototypePage page={page} />;
}

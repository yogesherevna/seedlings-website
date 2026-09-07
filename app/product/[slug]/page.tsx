import PrototypePage from '@/components/PrototypePage';
import CatalogueHydrator from '@/components/CatalogueHydrator';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CatalogueHydrator page="product" slug={slug}><PrototypePage page="product" /></CatalogueHydrator>;
}

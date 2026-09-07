import fs from 'node:fs';
import path from 'node:path';
import CmsHydrator from './CmsHydrator';

const pages: Record<string,string> = {
  home: 'index.html', microgreens: 'microgreens.html', product: 'product.html', journey: 'journey.html',
  contact: 'contact.html', account: 'account.html', cart: 'cart.html', checkout: 'checkout.html', success: 'success.html', subscriptions: 'subscriptions.html', orders: 'orders.html', 'order-detail': 'order-detail.html', addresses: 'addresses.html', profile: 'profile.html', 'delivery-calendar': 'delivery-calendar.html'
};

function rewriteLinks(html: string) {
  return html.replace(/(href|src)="([^"]+)"/g, (_, attr: string, value: string) => {
    const map: Record<string,string> = {
      'index.html':'/', 'microgreens.html':'/microgreens', 'product.html':'/product/demo',
      'journey.html':'/our-journey', 'contact.html':'/contact', 'account.html':'/account',
      'cart.html':'/cart', 'checkout.html':'/checkout', 'success.html':'/order-success',
      'subscriptions.html':'/subscriptions', 'orders.html':'/orders',
      'order-detail.html':'/order-detail', 'addresses.html':'/addresses',
      'profile.html':'/profile', 'delivery-calendar.html':'/delivery-calendar'
    };
    const rewritten = map[value] ?? (value.startsWith('assets/') ? `/prototype/${value}` : value);
    return `${attr}="${rewritten}"`;
  });
}

export default function PrototypePage({ page }: { page: keyof typeof pages }) {
  const file = path.join(process.cwd(), 'public', 'prototype', pages[page]);
  const source = fs.readFileSync(file, 'utf8');
  const body = source.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? source;
  const html = rewriteLinks(body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ''));
  return <CmsHydrator page={page}><div dangerouslySetInnerHTML={{ __html: html }} /></CmsHydrator>;
}

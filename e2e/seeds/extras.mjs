// An "Extras" page: pricing, map, spacers, in section-by-section scrolling.
import { API, apiToken, photo, upload } from '../lib.mjs';

const token = await apiToken();
const auth = { authorization: `Bearer ${token}` };
const hero = await upload(token, await photo({ width: 2400, height: 1400, from: '#0f4c5c', to: '#e9c46a' }), 'hero.jpg', 'image/jpeg');

const t = (en, fa) => (l) => (l === 'en' ? en : fa);
const blocks = (l) => [
  { id: 'x1', type: 'horizon', props: { image: hero, mobileImage: '', blur: false, title: t('Plans for every studio', 'برنامه‌ای برای هر استودیو')(l), text: t('Scroll: the page settles on each section.', 'اسکرول کنید: صفحه روی هر بخش می‌ایستد.')(l) } },
  { id: 'x2', type: 'pricing', props: {} },
  { id: 'x3', type: 'spacer', props: { size: 'lg', shape: 'wave', color: 'dark', flip: false } },
  { id: 'x4', type: 'counters', props: { title: t('In numbers', 'به زبان عدد')(l), items: [
    { value: 12, prefix: '', suffix: '+', label: t('Years', 'سال')(l) },
    { value: 340, prefix: '', suffix: '', label: t('Projects', 'پروژه')(l) },
    { value: 98, prefix: '', suffix: '%', label: t('Happy clients', 'رضایت')(l) },
  ] } },
  { id: 'x5', type: 'spacer', props: { size: 'md', shape: 'line', color: 'primary', flip: false } },
  { id: 'x6', type: 'map', props: { title: t('Visit us', 'به ما سر بزنید')(l), lat: 35.7219, lng: 51.3347, zoom: '15', address: t('Tehran, Khaleghi Street, No. 6', 'تهران، خیابان خالقی، پلاک ۶')(l), phone: '+98 21 0000 0000', hours: t('Sat–Wed, 9:00–17:00', 'شنبه تا چهارشنبه، ۹ تا ۱۷')(l), layout: 'card' } },
];
// Pricing defaults are in English; give the Persian page Persian plans.
const pricingFa = {
  title: 'تعرفه‌ها', subtitle: 'یک برنامه انتخاب کنید؛ هر وقت خواستید عوضش کنید.', currency: 'هزار تومان', monthlyLabel: 'ماهانه', yearlyLabel: 'سالانه (دو ماه رایگان)',
  plans: [
    { name: 'پایه', price: '۹۰', yearlyPrice: '۹۰۰', period: '/ماه', description: 'برای یک سایت شخصی.', features: 'یک وب‌سایت\nگواهی SSL\nپشتیبانی ایمیلی\n-دامنه‌ی اختصاصی', buttonLabel: 'انتخاب', buttonLink: '#x6', highlighted: false, badge: '' },
    { name: 'کسب‌وکار', price: '۲۹۰', yearlyPrice: '۲۹۰۰', period: '/ماه', description: 'برای تیم‌های در حال رشد.', features: 'پنج وب‌سایت\nگواهی SSL\nدامنه‌ی اختصاصی\nپشتیبانی ویژه', buttonLabel: 'انتخاب', buttonLink: '#x6', highlighted: true, badge: 'محبوب‌ترین' },
    { name: 'آژانس', price: '۷۹۰', yearlyPrice: '۷۹۰۰', period: '/ماه', description: 'برای مشتری‌های زیاد.', features: 'وب‌سایت نامحدود\nگواهی SSL\nدامنه‌های اختصاصی\nمدیر اختصاصی', buttonLabel: 'گفتگو', buttonLink: '#x6', highlighted: false, badge: '' },
  ],
};

for (const old of await (await fetch(`${API}/admin/pages`, { headers: auth })).json()) {
  if (old.name === 'Extras') await fetch(`${API}/admin/pages/${old.id}`, { method: 'DELETE', headers: auth });
}
const schema = await (await fetch(`${API}/admin/pages/schema`, { headers: auth })).json().catch(() => null);
const withDefaults = (list, l) =>
  list.map((b) => {
    const def = (schema ?? []).find?.((d) => d.type === b.type);
    const props = b.type === 'pricing' && l === 'fa' ? pricingFa : { ...(def?.defaults ?? {}), ...b.props };
    return { ...b, props: { ...props, anchor: b.id } };
  });
const page = await (await fetch(`${API}/admin/pages`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Extras' }) })).json();
const upd = await fetch(`${API}/admin/pages/${page.id}`, {
  method: 'PATCH',
  headers: { ...auth, 'content-type': 'application/json' },
  body: JSON.stringify({ theme: { background: '#ffffff', scrollMode: 'sections' }, translations: ['en', 'fa'].map((l) => ({ locale: l, title: t('Extras', 'بیشتر')(l), slug: 'extras', blocks: withDefaults(blocks(l), l) })) }),
});
console.log('update', upd.status, upd.ok ? '' : (await upd.text()).slice(0, 400));
console.log('publish', (await fetch(`${API}/admin/pages/${page.id}/publish`, { method: 'POST', headers: auth })).status);

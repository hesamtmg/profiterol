// Builds an "AMSR" page: the spotlight hero with two people, like the amsr-portfolio first screen.
import { API, apiToken, cutout, logo, photo, upload } from '../lib.mjs';

const token = await apiToken();
const auth = { authorization: `Bearer ${token}` };
const pic = async (name, buf, type = 'image/webp') => upload(token, await buf, name, type);
const img = {
  ali: await pic('ali.webp', photo({ width: 1920, height: 1080, from: '#0d0d0f', to: '#00a998', format: 'webp' })),
  aliMob: await pic('ali-mobile.webp', photo({ width: 900, height: 1600, from: '#0d0d0f', to: '#00a998', format: 'webp' })),
  sanaz: await pic('sanaz.webp', photo({ width: 1920, height: 1080, from: '#0d0d0f', to: '#c49a6c', format: 'webp' })),
  sanazMob: await pic('sanaz-mobile.webp', photo({ width: 900, height: 1600, from: '#0d0d0f', to: '#c49a6c', format: 'webp' })),
  aliCard: await pic('ali-card.webp', cutout({ color: '#0b6e64' })),
  sanazCard: await pic('sanaz-card.webp', cutout({ color: '#7a5b3a' })),
  aliLogoEn: await pic('ali-en.png', logo('ALI', { vertical: true, color: '#ffffff' }), 'image/png'),
  sanazLogoEn: await pic('sanaz-en.png', logo('SANAZ', { vertical: true, color: '#ffffff' }), 'image/png'),
  aliLogoFa: await pic('ali-fa.png', logo('علی', { vertical: true, color: '#ffffff' }), 'image/png'),
  sanazLogoFa: await pic('sanaz-fa.png', logo('ساناز', { vertical: true, color: '#ffffff' }), 'image/png'),
};
const person = (o) => ({ mobilePhoto: '', cardLogo: '', ...o });
const spotlight = (lang) => ({
  id: 'amsrhero',
  type: 'spotlight',
  props: {
    people: [
      person({
        name: lang === 'en' ? 'Ali Mazaheri' : 'علی مظاهری',
        headline: lang === 'en' ? 'Customs and Clearance' : 'امور گمرکی و ترخیص کالا',
        text:
          lang === 'en'
            ? 'A professional group in the field of goods clearance and import, relying on experience and technical knowledge'
            : 'گروه‌ای حرفه‌ای در حوزه ترخیص کالا و واردات با تکیه بر تجربه و دانش فنی متخصصان و مدیران با تجربه گمرک',
        photo: img.ali,
        mobilePhoto: img.aliMob,
        cardPhoto: img.aliCard,
        cardLogo: lang === 'en' ? img.aliLogoEn : img.aliLogoFa,
        color: '#00a998',
        buttonLabel: lang === 'en' ? 'Contact Us' : 'تماس بگیرید',
        buttonLink: 'tel:+989128158328',
      }),
      person({
        name: lang === 'en' ? 'Sanaz Riazi' : 'ساناز ریاضی',
        headline: lang === 'en' ? 'Customs and Clearance' : 'امور گمرکی و ترخیص کالا',
        text:
          lang === 'en'
            ? 'A professional group in the field of goods clearance and import, relying on experience and technical knowledge'
            : 'گروه‌ای حرفه‌ای در حوزه ترخیص کالا و واردات با تکیه بر تجربه و دانش فنی متخصصان و مدیران با تجربه گمرک',
        photo: img.sanaz,
        mobilePhoto: img.sanazMob,
        cardPhoto: img.sanazCard,
        cardLogo: lang === 'en' ? img.sanazLogoEn : img.sanazLogoFa,
        color: '#c49a6c',
        buttonLabel: lang === 'en' ? 'Contact Us' : 'تماس بگیرید',
        buttonLink: 'tel:+989126164436',
      }),
    ],
    marquee: 'SUPER FAST CLEARANCE IS OUR KEY POWER',
    textSide: 'left',
    scrollHint: true,
  },
});
const page = await (
  await fetch(`${API}/admin/pages`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'AMSR' }),
  })
).json();
const upd = await fetch(`${API}/admin/pages/${page.id}`, {
  method: 'PATCH',
  headers: { ...auth, 'content-type': 'application/json' },
  body: JSON.stringify({
    theme: { background: '#0d0d0f', headerStyle: 'glass' },
    translations: ['en', 'fa'].map((l) => ({ locale: l, title: 'AMSR', slug: 'amsr', blocks: [spotlight(l)] })),
  }),
});
console.log('update', upd.status, upd.status !== 200 ? await upd.text() : '');
console.log('publish', (await fetch(`${API}/admin/pages/${page.id}/publish`, { method: 'POST', headers: auth })).status);

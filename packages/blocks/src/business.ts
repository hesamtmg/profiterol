/**
 * What kind of business or organization a site belongs to, told to search engines as schema.org structured data
 * (JSON-LD). Owners pick from plain-language categories ("Food & drink" › "Café"); each choice maps to the most
 * specific schema.org type, because that is what Google uses for maps and business results.
 *
 * Every type here exists in the current schema.org vocabulary: `npm run check:business-types` downloads the latest
 * one, fails if a type was removed or replaced, and lists new business types that could be added.
 */

type Label = { en: string; fa: string };

export interface BusinessType {
  /** The schema.org type, e.g. `CafeOrCoffeeShop`. */
  type: string;
  label: Label;
}

export interface BusinessCategory {
  key: string;
  label: Label;
  /** A Material Design Icons name, without the `mdi-` prefix. */
  icon: string;
  types: BusinessType[];
}

const t = (type: string, en: string, fa: string): BusinessType => ({ type, label: { en, fa } });

/** The last type of each category is its general one, for businesses that fit none of the others. */
export const businessCategories: BusinessCategory[] = [
  {
    key: 'food',
    label: { en: 'Food & drink', fa: 'غذا و نوشیدنی' },
    icon: 'silverware-fork-knife',
    types: [
      t('Restaurant', 'Restaurant', 'رستوران'),
      t('CafeOrCoffeeShop', 'Café or coffee shop', 'کافه'),
      t('FastFoodRestaurant', 'Fast food', 'فست‌فود'),
      t('Bakery', 'Bakery or pastry shop', 'نانوایی یا شیرینی‌فروشی'),
      t('IceCreamShop', 'Ice cream shop', 'بستنی‌فروشی'),
      t('BarOrPub', 'Bar or pub', 'بار'),
      t('Winery', 'Winery', 'شراب‌سازی'),
      t('Brewery', 'Brewery', 'آبجوسازی'),
      t('FoodEstablishment', 'Other food & drink', 'سایر غذا و نوشیدنی'),
    ],
  },
  {
    key: 'shop',
    label: { en: 'Shops', fa: 'فروشگاه' },
    icon: 'storefront-outline',
    types: [
      t('OnlineStore', 'Online shop', 'فروشگاه اینترنتی'),
      t('DepartmentStore', 'Department store', 'فروشگاه بزرگ'),
      t('ShoppingCenter', 'Shopping mall', 'مرکز خرید'),
      t('ClothingStore', 'Clothing', 'پوشاک'),
      t('ShoeStore', 'Shoes', 'کفش'),
      t('JewelryStore', 'Jewelry', 'طلا و جواهر'),
      t('ElectronicsStore', 'Electronics', 'لوازم الکترونیکی'),
      t('MobilePhoneStore', 'Mobile phones', 'موبایل'),
      t('ComputerStore', 'Computers', 'کامپیوتر'),
      t('FurnitureStore', 'Furniture', 'مبلمان'),
      t('HomeGoodsStore', 'Home goods', 'لوازم خانگی'),
      t('HardwareStore', 'Hardware & tools', 'ابزار و یراق'),
      t('GroceryStore', 'Grocery', 'سوپرمارکت'),
      t('ConvenienceStore', 'Convenience store', 'مغازه و خواربارفروشی'),
      t('BookStore', 'Books', 'کتاب‌فروشی'),
      t('MusicStore', 'Musical instruments', 'سازفروشی'),
      t('BikeStore', 'Bicycles', 'دوچرخه‌فروشی'),
      t('GardenStore', 'Garden & plants', 'گل و گیاه و لوازم باغبانی'),
      t('Florist', 'Florist', 'گل‌فروشی'),
      t('PetStore', 'Pet shop', 'لوازم حیوانات خانگی'),
      t('SportingGoodsStore', 'Sporting goods', 'لوازم ورزشی'),
      t('ToyStore', 'Toys', 'اسباب‌بازی'),
      t('Store', 'Other shop', 'سایر فروشگاه‌ها'),
    ],
  },
  {
    key: 'health',
    label: { en: 'Health & medical', fa: 'سلامت و پزشکی' },
    icon: 'medical-bag',
    types: [
      t('MedicalClinic', 'Clinic', 'کلینیک'),
      t('Physician', 'Doctor', 'پزشک'),
      t('Dentist', 'Dentist', 'دندانپزشک'),
      t('DiagnosticLab', 'Medical lab', 'آزمایشگاه پزشکی'),
      t('Pharmacy', 'Pharmacy', 'داروخانه'),
      t('Optician', 'Optician', 'عینک‌سازی'),
      t('Hospital', 'Hospital', 'بیمارستان'),
      t('VeterinaryCare', 'Veterinarian', 'دامپزشک'),
      t('MedicalBusiness', 'Other medical', 'سایر خدمات پزشکی'),
    ],
  },
  {
    key: 'beauty',
    label: { en: 'Beauty & wellness', fa: 'زیبایی و آرامش' },
    icon: 'face-woman-shimmer-outline',
    types: [
      t('BeautySalon', 'Beauty salon', 'سالن زیبایی'),
      t('HairSalon', 'Hair salon or barber', 'آرایشگاه'),
      t('NailSalon', 'Nail salon', 'سالن ناخن'),
      t('DaySpa', 'Spa', 'اسپا'),
      t('TattooParlor', 'Tattoo studio', 'استودیو تتو'),
      t('HealthAndBeautyBusiness', 'Other beauty & wellness', 'سایر خدمات زیبایی'),
    ],
  },
  {
    key: 'professional',
    label: { en: 'Professional services', fa: 'خدمات تخصصی' },
    icon: 'briefcase-outline',
    types: [
      t('LegalService', 'Law firm or lawyer', 'وکالت و خدمات حقوقی'),
      t('Notary', 'Notary', 'دفترخانه'),
      t('AccountingService', 'Accounting', 'حسابداری'),
      t('FinancialService', 'Financial services', 'خدمات مالی'),
      t('BankOrCreditUnion', 'Bank', 'بانک'),
      t('InsuranceAgency', 'Insurance', 'بیمه'),
      t('RealEstateAgent', 'Real estate', 'املاک'),
      t('EmploymentAgency', 'Recruitment', 'کاریابی'),
      t('TravelAgency', 'Travel agency', 'آژانس مسافرتی'),
      t('LocalBusiness', 'Other office or service', 'سایر دفاتر و خدمات'),
    ],
  },
  {
    key: 'home',
    label: { en: 'Home & construction', fa: 'ساختمان و خدمات منزل' },
    icon: 'hammer-wrench',
    types: [
      t('GeneralContractor', 'Builder or contractor', 'پیمانکار ساختمانی'),
      t('Electrician', 'Electrician', 'برق‌کار'),
      t('Plumber', 'Plumber', 'لوله‌کش'),
      t('HVACBusiness', 'Heating & cooling', 'تأسیسات گرمایش و سرمایش'),
      t('HousePainter', 'Painter', 'نقاش ساختمان'),
      t('RoofingContractor', 'Roofing', 'عایق‌کاری و سقف'),
      t('Locksmith', 'Locksmith', 'کلیدسازی'),
      t('MovingCompany', 'Movers', 'باربری'),
      t('DryCleaningOrLaundry', 'Laundry & dry cleaning', 'خشک‌شویی'),
      t('HomeAndConstructionBusiness', 'Other home services', 'سایر خدمات ساختمانی'),
    ],
  },
  {
    key: 'auto',
    label: { en: 'Cars & vehicles', fa: 'خودرو' },
    icon: 'car-outline',
    types: [
      t('AutoDealer', 'Car dealer', 'نمایشگاه خودرو'),
      t('AutoRepair', 'Repair shop', 'تعمیرگاه'),
      t('AutoBodyShop', 'Body shop', 'صافکاری و نقاشی خودرو'),
      t('TireShop', 'Tires', 'لاستیک‌فروشی'),
      t('MotorcycleDealer', 'Motorcycle dealer', 'نمایشگاه موتورسیکلت'),
      t('MotorcycleRepair', 'Motorcycle repair', 'تعمیر موتورسیکلت'),
      t('AutoPartsStore', 'Parts', 'لوازم یدکی'),
      t('AutoRental', 'Car rental', 'اجاره خودرو'),
      t('AutoWash', 'Car wash', 'کارواش'),
      t('GasStation', 'Gas station', 'پمپ بنزین'),
      t('AutomotiveBusiness', 'Other car services', 'سایر خدمات خودرو'),
    ],
  },
  {
    key: 'lodging',
    label: { en: 'Hotels & stays', fa: 'هتل و اقامت' },
    icon: 'bed-outline',
    types: [
      t('Hotel', 'Hotel', 'هتل'),
      t('Motel', 'Motel', 'متل'),
      t('Hostel', 'Hostel', 'هاستل'),
      t('BedAndBreakfast', 'Guest house / B&B', 'اقامتگاه بوم‌گردی'),
      t('VacationRental', 'Holiday rental', 'ویلا و اجاره کوتاه‌مدت'),
      t('Resort', 'Resort', 'ریزورت'),
      t('Campground', 'Campsite', 'کمپ'),
      t('LodgingBusiness', 'Other lodging', 'سایر اقامتگاه‌ها'),
    ],
  },
  {
    key: 'education',
    label: { en: 'Education', fa: 'آموزش' },
    icon: 'school-outline',
    types: [
      t('ChildCare', 'Daycare', 'مهدکودک'),
      t('Preschool', 'Preschool', 'پیش‌دبستانی'),
      t('ElementarySchool', 'Primary school', 'دبستان'),
      t('MiddleSchool', 'Middle school', 'مدرسه راهنمایی'),
      t('HighSchool', 'High school', 'دبیرستان'),
      t('CollegeOrUniversity', 'University or college', 'دانشگاه'),
      t('EducationalOrganization', 'Institute, academy or courses', 'آموزشگاه و مؤسسه آموزشی'),
    ],
  },
  {
    key: 'leisure',
    label: { en: 'Sports & entertainment', fa: 'ورزش و سرگرمی' },
    icon: 'dumbbell',
    types: [
      t('ExerciseGym', 'Gym', 'باشگاه بدنسازی'),
      t('HealthClub', 'Fitness center', 'باشگاه تندرستی'),
      t('SportsClub', 'Sports club', 'باشگاه ورزشی'),
      t('SportsTeam', 'Sports team', 'تیم ورزشی'),
      t('AmusementPark', 'Amusement park', 'شهربازی'),
      t('MovieTheater', 'Cinema', 'سینما'),
      t('ArtGallery', 'Art gallery', 'گالری هنری'),
      t('NightClub', 'Night club', 'کلوب شبانه'),
      t('EntertainmentBusiness', 'Other entertainment', 'سایر سرگرمی‌ها'),
    ],
  },
  {
    key: 'company',
    label: { en: 'Companies & organizations', fa: 'شرکت‌ها و سازمان‌ها' },
    icon: 'domain',
    types: [
      t('Corporation', 'Company (any industry)', 'شرکت (هر حوزه‌ای)'),
      t('NewsMediaOrganization', 'News & media', 'رسانه و خبرگزاری'),
      t('NGO', 'Charity or non-profit', 'خیریه یا سازمان مردم‌نهاد'),
      t('GovernmentOrganization', 'Government', 'سازمان دولتی'),
      t('Library', 'Library', 'کتابخانه'),
      t('Organization', 'Other organization', 'سایر سازمان‌ها'),
    ],
  },
  {
    key: 'personal',
    label: { en: 'Personal & creative', fa: 'شخصی و هنری' },
    icon: 'account-star-outline',
    types: [
      t('Person', 'Myself (personal site or portfolio)', 'خودم (سایت شخصی یا نمونه‌کار)'),
      t('MusicGroup', 'Band or musician', 'گروه موسیقی یا نوازنده'),
      t('TheaterGroup', 'Theatre group', 'گروه تئاتر'),
      t('DanceGroup', 'Dance group', 'گروه رقص'),
      t('PerformingGroup', 'Other performing group', 'سایر گروه‌های اجرایی'),
    ],
  },
];

const byType = new Map(businessCategories.flatMap((c) => c.types.map((type) => [type.type, { category: c, type }] as const)));

/** The category and label of a schema.org type, if it is one owners can pick. */
export function findBusinessType(type: string): { category: BusinessCategory; type: BusinessType } | undefined {
  return byType.get(type);
}

/**
 * The types above that are not a schema.org `LocalBusiness` (a place customers visit). Only local businesses take a
 * price range. Kept in step with schema.org by `npm run check:business-types`.
 */
export const nonLocalBusinessTypes = [
  'OnlineStore',
  'VeterinaryCare',
  'DiagnosticLab',
  'MiddleSchool',
  'SportsTeam',
  'TheaterGroup',
  'DanceGroup',
  'Preschool',
  'ElementarySchool',
  'HighSchool',
  'CollegeOrUniversity',
  'EducationalOrganization',
  'Corporation',
  'NewsMediaOrganization',
  'NGO',
  'GovernmentOrganization',
  'Organization',
  'Person',
  'MusicGroup',
  'PerformingGroup',
];

export function isLocalBusiness(type: string): boolean {
  return byType.has(type) && !nonLocalBusinessTypes.includes(type);
}

/** The business details kept in site settings. Every field is optional; empty ones are left out of the JSON-LD. */
export interface BusinessInfo {
  /** A schema.org type from `businessCategories`, or '' for none. */
  type: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  /** Country name or two-letter code, e.g. "IR". */
  country: string;
  /** e.g. "$$" or "100,000–500,000 IRR". */
  priceRange: string;
  /** Profile pages elsewhere: Instagram, LinkedIn, a Google Maps listing… */
  sameAs: string[];
}

export const emptyBusiness = (): BusinessInfo => ({
  type: '',
  phone: '',
  email: '',
  street: '',
  city: '',
  region: '',
  postalCode: '',
  country: '',
  priceRange: '',
  sameAs: [],
});

const MAX_PROFILES = 10;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Keeps only known fields, a known type and https profile links. */
export function cleanBusiness(input: unknown): BusinessInfo {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const type = str(o.type, 60);
  return {
    type: byType.has(type) ? type : '',
    phone: str(o.phone, 40),
    email: str(o.email, 200),
    street: str(o.street, 200),
    city: str(o.city, 100),
    region: str(o.region, 100),
    postalCode: str(o.postalCode, 20),
    country: str(o.country, 60),
    priceRange: str(o.priceRange, 60),
    sameAs: (Array.isArray(o.sameAs) ? o.sameAs : [])
      .map((u) => str(u, 500))
      .filter((u) => /^https:\/\/[^\s<>"]+$/i.test(u))
      .slice(0, MAX_PROFILES),
  };
}

export interface SiteJsonLdInput {
  business: Partial<BusinessInfo> | null | undefined;
  /** The site's address, e.g. https://example.com */
  origin: string;
  /** The home page in this language, e.g. https://example.com/en */
  homeUrl: string;
  name: string;
  locale: string;
  /** Absolute URLs, or ''. */
  logo: string;
  description?: string;
}

/**
 * The home page's structured data: who runs the site (the business, organization or person) and the site itself.
 * Returns null when no type has been chosen.
 */
export function siteJsonLd(input: SiteJsonLdInput): Record<string, unknown> | null {
  const b = cleanBusiness(input.business);
  if (!b.type || !input.name) return null;
  const id = `${input.origin}/#${b.type === 'Person' ? 'person' : 'organization'}`;
  const address =
    b.street || b.city || b.region || b.postalCode || b.country
      ? compact({
          '@type': 'PostalAddress',
          streetAddress: b.street,
          addressLocality: b.city,
          addressRegion: b.region,
          postalCode: b.postalCode,
          addressCountry: b.country,
        })
      : undefined;
  const owner = compact({
    '@type': b.type,
    '@id': id,
    name: input.name,
    url: input.homeUrl,
    description: input.description,
    // A person has a photo, not a logo; businesses show both on Google.
    ...(b.type === 'Person' ? { image: input.logo } : { logo: input.logo, image: input.logo }),
    telephone: b.phone,
    email: b.email,
    address,
    priceRange: isLocalBusiness(b.type) ? b.priceRange : '',
    sameAs: b.sameAs.length ? b.sameAs : undefined,
  });
  const website = compact({
    '@type': 'WebSite',
    '@id': `${input.origin}/#website`,
    name: input.name,
    url: input.homeUrl,
    inLanguage: input.locale,
    publisher: { '@id': id },
  });
  return { '@context': 'https://schema.org', '@graph': [owner, website] };
}

/** Drops empty values, so the JSON-LD never claims an empty phone number or address. */
function compact(o: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined && v !== null));
}

/**
 * JSON for a `<script type="application/ld+json">`. `<` is escaped so text typed by an editor (e.g. "</script>")
 * can never end the script tag.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

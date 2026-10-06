import { h, type Component, type FunctionalComponent } from 'vue';
import CardGrid from './CardGrid.vue';
import Carousel from './Carousel.vue';
import CollectionList from './CollectionList.vue';
import ContactFooter from './ContactFooter.vue';
import ContactForm from './ContactForm.vue';
import Faq from './Faq.vue';
import Gallery from './Gallery.vue';
import HeroCards from './HeroCards.vue';
import ImageText from './ImageText.vue';
import Marquee from './Marquee.vue';
import Spotlight from './Spotlight.vue';
import Statement from './Statement.vue';
import TextBlock from './TextBlock.vue';
import VideoHero from './VideoHero.vue';
import VideoPlayer from './VideoPlayer.vue';
import MapBlock from './MapBlock.vue';
import Pricing from './Pricing.vue';
import Spacer from './Spacer.vue';
import AuroraHero from './animated/AuroraHero.vue';
import ScrollText from './animated/ScrollText.vue';
import Counters from './animated/Counters.vue';
import LogoStrip from './animated/LogoStrip.vue';
import HorizontalScroll from './animated/HorizontalScroll.vue';
import TiltCards from './animated/TiltCards.vue';
import FlipCards from './animated/FlipCards.vue';
import BeforeAfter from './animated/BeforeAfter.vue';
import Testimonials from './animated/Testimonials.vue';
import Timeline from './animated/Timeline.vue';
import Parallax from './animated/Parallax.vue';
import StickyStory from './animated/StickyStory.vue';
import ZoomReveal from './animated/ZoomReveal.vue';
import StackingCards from './animated/StackingCards.vue';
import ScrollMarquee from './animated/ScrollMarquee.vue';
import SplitReveal from './animated/SplitReveal.vue';
import FloatingGallery from './animated/FloatingGallery.vue';
import ContactSplit from './classic/ContactSplit.vue';
import Horizon from './classic/Horizon.vue';
import HorizonSide from './classic/HorizonSide.vue';
import Information from './classic/Information.vue';
import PhotoGrid from './classic/PhotoGrid.vue';
import RichText from './classic/RichText.vue';
import SideBySide from './classic/SideBySide.vue';
import Slider from './classic/Slider.vue';
import Triple from './classic/Triple.vue';
import VideoCover from './classic/VideoCover.vue';
import VideoShowcase from './classic/VideoShowcase.vue';
import Columns from './layout/Columns.vue';
import Group from './layout/Group.vue';

/** minicms kinds 5 and 6 are one layout with the photo on either side. */
const HorizonRight: FunctionalComponent = (_, { attrs }) => h(HorizonSide, { ...attrs, side: 'right' });
const HorizonLeft: FunctionalComponent = (_, { attrs }) => h(HorizonSide, { ...attrs, side: 'left' });

/** Block type → the component that renders it. Keep in sync with `@profiterol/blocks`. */
export const blockComponents: Record<string, Component> = {
  columns: Columns,
  group: Group,
  spotlight: Spotlight,
  'hero-cards': HeroCards,
  'card-grid': CardGrid,
  'collection-list': CollectionList,
  text: TextBlock,
  'image-text': ImageText,
  statement: Statement,
  faq: Faq,
  marquee: Marquee,
  'contact-footer': ContactFooter,
  'video-hero': VideoHero,
  carousel: Carousel,
  gallery: Gallery,
  video: VideoPlayer,
  'contact-form': ContactForm,
  pricing: Pricing,
  map: MapBlock,
  spacer: Spacer,
  // Animated
  'aurora-hero': AuroraHero,
  'scroll-text': ScrollText,
  counters: Counters,
  'logo-strip': LogoStrip,
  'horizontal-scroll': HorizontalScroll,
  'tilt-cards': TiltCards,
  'flip-cards': FlipCards,
  'before-after': BeforeAfter,
  testimonials: Testimonials,
  timeline: Timeline,
  parallax: Parallax,
  'sticky-story': StickyStory,
  'zoom-reveal': ZoomReveal,
  'stacking-cards': StackingCards,
  'scroll-marquee': ScrollMarquee,
  'split-reveal': SplitReveal,
  'floating-gallery': FloatingGallery,
  // The 12 section kinds of minicms
  'video-cover': VideoCover,
  triple: Triple,
  horizon: Horizon,
  'side-by-side': SideBySide,
  'horizon-right': HorizonRight,
  'horizon-left': HorizonLeft,
  'contact-split': ContactSplit,
  information: Information,
  'rich-text': RichText,
  'video-showcase': VideoShowcase,
  slider: Slider,
  'photo-grid': PhotoGrid,
};

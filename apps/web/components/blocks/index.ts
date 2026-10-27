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
import TextileDesigner from './TextileDesigner.vue';
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
import TextScramble from './animated/TextScramble.vue';
import ImageTrail from './animated/ImageTrail.vue';
import HoverList from './animated/HoverList.vue';
import SpinningBadge from './animated/SpinningBadge.vue';
import ExpandingPanels from './animated/ExpandingPanels.vue';
import ProgressBars from './animated/ProgressBars.vue';
import PictureText from './animated/PictureText.vue';
import Orbit from './animated/Orbit.vue';
import CardFan from './animated/CardFan.vue';
import PhotoColumns from './animated/PhotoColumns.vue';
import BlueprintStatement from './studio/BlueprintStatement.vue';
import NeedPicker from './studio/NeedPicker.vue';
import ProjectArchive from './studio/ProjectArchive.vue';
import ProjectScatter from './studio/ProjectScatter.vue';
import ServiceStack from './studio/ServiceStack.vue';
import StudioFooter from './studio/StudioFooter.vue';
import TypeHero from './studio/TypeHero.vue';
import CloseUpStrip from './folio/CloseUpStrip.vue';
import HelloStatement from './folio/HelloStatement.vue';
import NameHero from './folio/NameHero.vue';
import ServiceGrid from './folio/ServiceGrid.vue';
import TalkFooter from './folio/TalkFooter.vue';
import WordTicker from './folio/WordTicker.vue';
import WorkIndex from './folio/WorkIndex.vue';
import FocusList from './spatial/FocusList.vue';
import LetterHero from './spatial/LetterHero.vue';
import LitParagraph from './spatial/LitParagraph.vue';
import PictureWords from './spatial/PictureWords.vue';
import PillFooter from './spatial/PillFooter.vue';
import ShapeParade from './spatial/ShapeParade.vue';
import TickerBand from './spatial/TickerBand.vue';
import WaveCta from './spatial/WaveCta.vue';
import WorkDone from './spatial/WorkDone.vue';
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
  'textile-designer': TextileDesigner,
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
  'text-scramble': TextScramble,
  'image-trail': ImageTrail,
  'hover-list': HoverList,
  'spinning-badge': SpinningBadge,
  'expanding-panels': ExpandingPanels,
  'progress-bars': ProgressBars,
  'picture-text': PictureText,
  orbit: Orbit,
  'card-fan': CardFan,
  'photo-columns': PhotoColumns,
  // The awakeagency.dev look
  'type-hero': TypeHero,
  'blueprint-statement': BlueprintStatement,
  'project-scatter': ProjectScatter,
  'project-archive': ProjectArchive,
  'service-stack': ServiceStack,
  'need-picker': NeedPicker,
  'studio-footer': StudioFooter,
  // The mikewilcockdesign.com look
  'name-hero': NameHero,
  'word-ticker': WordTicker,
  'work-index': WorkIndex,
  'close-up-strip': CloseUpStrip,
  'hello-statement': HelloStatement,
  'service-grid': ServiceGrid,
  'talk-footer': TalkFooter,
  // The undplus.com look
  'letter-hero': LetterHero,
  'picture-words': PictureWords,
  'shape-parade': ShapeParade,
  'focus-list': FocusList,
  'ticker-band': TickerBand,
  'work-done': WorkDone,
  'lit-paragraph': LitParagraph,
  'wave-cta': WaveCta,
  'pill-footer': PillFooter,
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

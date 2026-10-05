import type { Component } from 'vue';
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

/** Block type → the component that renders it. Keep in sync with `@profiterol/blocks`. */
export const blockComponents: Record<string, Component> = {
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
};

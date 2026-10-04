import type { Component } from 'vue';
import CardGrid from './CardGrid.vue';
import ContactFooter from './ContactFooter.vue';
import Faq from './Faq.vue';
import HeroCards from './HeroCards.vue';
import ImageText from './ImageText.vue';
import Marquee from './Marquee.vue';
import Statement from './Statement.vue';
import TextBlock from './TextBlock.vue';

/** Block type → the component that renders it. Keep in sync with `@profiterol/blocks`. */
export const blockComponents: Record<string, Component> = {
  'hero-cards': HeroCards,
  'card-grid': CardGrid,
  text: TextBlock,
  'image-text': ImageText,
  statement: Statement,
  faq: Faq,
  marquee: Marquee,
  'contact-footer': ContactFooter,
};

/**
 * How each printable surface (see printSurfaces in @profiterol/blocks) is drawn. All coordinates are in the
 * surface's own `view` box. `area` is the rectangle the design covers, with the same proportions as the printed
 * size, and `body` is the outline the print is cut to. The same SVG paths draw the product pickers and, through
 * Path2D, the canvas mock-ups.
 */
export interface Surface {
  view: [number, number];
  area: [number, number, number, number];
  body: string;
  /** Parts in the product's color that take no print (handles, ties). Drawn as thick lines. */
  straps?: string[];
  /** Seams and hems, drawn as stitched lines over the print. */
  seams?: string[];
  /** Fixed parts that are not fabric (a flag pole), in their own color. */
  fixed?: { d: string; fill: string }[];
  /** A mug: the design wraps around, so the mock-up shows the front half of it on a cylinder. */
  mug?: boolean;
}

export const surfaces: Record<string, Surface> = {
  tshirt: {
    view: [1000, 1000],
    area: [40, 40, 920, 920],
    body: 'M370 40 Q500 150 630 40 L960 170 L880 420 L780 380 L780 960 L220 960 L220 380 L120 420 L40 170 Z',
    seams: [
      'M352 50 Q500 185 648 50',
      'M220 380 L262 135',
      'M780 380 L738 135',
      'M220 930 L780 930',
      'M128 395 L50 195',
      'M872 395 L950 195',
    ],
  },
  hoodie: {
    view: [1000, 1000],
    area: [40, 40, 920, 920],
    body: 'M330 140 Q330 40 500 40 Q670 40 670 140 L960 260 L900 600 L800 560 L800 900 Q800 960 740 960 L260 960 Q200 960 200 900 L200 560 L100 600 L40 260 Z',
    seams: [
      'M380 150 Q500 300 620 150',
      'M330 690 L670 690 L710 870 L290 870 Z',
      'M200 560 L250 230',
      'M800 560 L750 230',
      'M465 250 L455 400',
      'M535 250 L545 400',
      'M205 905 L795 905',
    ],
  },
  apron: {
    view: [1000, 1000],
    area: [200, 40, 600, 920],
    body: 'M370 40 L630 40 L630 230 Q720 300 800 330 L800 960 L200 960 L200 330 Q280 300 370 230 Z',
    straps: ['M200 420 Q120 440 90 600', 'M800 420 Q880 440 910 600', 'M380 44 Q500 -40 620 44'],
    seams: ['M330 600 L670 600 L670 770 L330 770 Z', 'M500 600 L500 770', 'M215 940 L785 940'],
  },
  tote: {
    view: [1000, 1000],
    area: [210, 320, 580, 640],
    body: 'M210 320 L790 320 L790 960 L210 960 Z',
    straps: ['M340 322 Q340 80 500 80 Q660 80 660 322'],
    seams: ['M210 348 L790 348'],
  },
  pillow: {
    view: [1000, 1000],
    area: [40, 40, 920, 920],
    body: 'M60 70 Q500 20 940 70 Q985 500 940 930 Q500 980 60 930 Q15 500 60 70 Z',
    seams: ['M500 52 Q520 140 500 210', 'M500 948 Q480 860 500 790'],
  },
  scarf: {
    view: [1000, 1000],
    area: [60, 60, 880, 880],
    body: 'M80 60 L920 60 Q940 60 940 80 L940 920 Q940 940 920 940 L80 940 Q60 940 60 920 L60 80 Q60 60 80 60 Z',
    seams: ['M80 80 L920 80 L920 920 L80 920 Z'],
  },
  flag: {
    view: [1000, 700],
    area: [80, 80, 900, 540],
    body: 'M80 80 Q305 50 530 80 Q755 110 980 80 L980 620 Q755 650 530 620 Q305 590 80 620 Z',
    seams: ['M305 70 Q330 350 305 605', 'M755 95 Q730 350 755 635'],
    fixed: [{ d: 'M38 30 Q51 14 64 30 L64 690 L38 690 Z', fill: '#9ca3af' }],
  },
  fabric: {
    view: [1000, 760],
    area: [60, 60, 900, 643],
    body: 'M60 60 L960 60 L960 640 Q930 690 880 703 L60 703 Z',
    seams: ['M960 640 Q900 650 880 703'],
    fixed: [{ d: 'M22 44 Q22 30 40 30 L62 30 Q80 30 80 44 L80 719 Q80 733 62 733 L40 733 Q22 733 22 719 Z', fill: '#d6d3d1' }],
  },
  mousepad: {
    view: [1000, 820],
    area: [40, 46, 920, 728],
    body: 'M90 46 L910 46 Q960 46 960 96 L960 724 Q960 774 910 774 L90 774 Q40 774 40 724 L40 96 Q40 46 90 46 Z',
    seams: ['M92 60 L908 60 Q946 60 946 98 L946 722 Q946 760 908 760 L92 760 Q54 760 54 722 L54 98 Q54 60 92 60 Z'],
  },
  mug: {
    view: [1000, 900],
    area: [40, 260, 920, 414],
    body: 'M230 90 L720 90 L720 780 Q720 830 670 830 L280 830 Q230 830 230 780 Z',
    straps: ['M720 240 C900 240 900 600 720 600'],
    mug: true,
  },
};

export const surfaceOf = (key: string): Surface => surfaces[key] ?? surfaces.tshirt;

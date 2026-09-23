import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'GeoEnhance-AI',
  tagline: 'Sharper pixels are easy. Knowing which ones to trust is the mission.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://akash-design-prog.github.io',
  baseUrl: '/geoenhance-docs/',

  organizationName: 'Akash-design-prog',
  projectName: 'geoenhance-docs',

  onBrokenLinks: 'warn',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
      // GIF captures for the live-demo-walkthrough page are still pending --
      // see docs/live-demo-walkthrough.md. Warn, don't fail the build, until
      // they're recorded.
      onBrokenMarkdownImages: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/Akash-design-prog/GeoEnhance-AI/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'GeoEnhance-AI',
      logo: {
        alt: 'GeoEnhance-AI logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/Akash-design-prog/GeoEnhance-AI',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Getting Started', to: '/getting-started'},
            {label: 'Validation & Results', to: '/validation-results'},
            {label: 'System Architecture', to: '/architecture'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'GitHub repository', href: 'https://github.com/Akash-design-prog/GeoEnhance-AI'},
          ],
        },
      ],
      copyright: `GeoEnhance-AI — Smart India Hackathon 2026, SIH26142. Built on ESA OpenSR SEN2SR Lite (CC0), scored against real reference imagery, never claimed as more than measured.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

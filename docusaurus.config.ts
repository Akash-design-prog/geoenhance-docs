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
  // Explicit, not left as Docusaurus's "host default" (undefined) -- the search-local plugin
  // matches built page routes against known doc permalinks, and that match is keyed off this
  // value. Leaving it unset is the suspected reason its indexer silently matched zero pages.
  trailingSlash: false,

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

  // Fraunces for headings (matches the live dashboard's own hero typeface), Inter for body --
  // real typography instead of the Infima default system stack.
  stylesheets: [
    {
      href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap',
      type: 'text/css',
    },
  ],

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

  // Local, index-at-build-time search -- no Algolia account or external service needed.
  // Needs the [resolve, options] tuple form -- a bare string silently skips index generation.
  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexBlog: false,
        // The plugin defaults to assuming docs live under /docs/* -- ours live at the site
        // root (docs preset routeBasePath: '/'), so every route silently matched zero indexed
        // pages until this was set explicitly. Root basePath is passed as '' per the plugin's
        // own handling (see processPluginOptions.js: it strips a leading '/' either way).
        docsRouteBasePath: '/',
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'GeoEnhance-AI',
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

import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import HomepageStats from '@site/src/components/HomepageStats';
import HomepageDemo from '@site/src/components/HomepageDemo';
import Heading from '@theme/Heading';

import styles from './index.module.css';

const GitHubIcon = (
  <svg viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <p className={styles.heroSub}>
          Sentinel-2 imagery, 10 m → 2.5 m, with a per-pixel confidence map and a
          calibrated interval instead of a single trust-me number. Built for SIH26142.
        </p>
        <div className={styles.buttons}>
          <Link
            className={clsx('button button--lg', styles.ctaButton)}
            to="/getting-started">
            Get Started
          </Link>
          <Link
            className={clsx('button button--lg', styles.ghostButton)}
            to="/live-demo-walkthrough">
            See the Demo
          </Link>
          <Link
            className={clsx('button button--lg', styles.ghostButton)}
            href="https://github.com/Akash-design-prog/GeoEnhance-AI">
            {GitHubIcon}
            GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Documentation"
      description="Sentinel-2 super-resolution with calibrated per-pixel uncertainty -- architecture, validation results, and a live demo walkthrough for GeoEnhance-AI (SIH26142).">
      <HomepageHeader />
      <main>
        <HomepageDemo />
        <HomepageStats />
        <HomepageFeatures />
      </main>
    </Layout>
  );
}

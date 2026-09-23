import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import HomepageStats from '@site/src/components/HomepageStats';
import Heading from '@theme/Heading';

import styles from './index.module.css';

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
            className={clsx('button button--secondary button--lg', styles.ctaButton)}
            to="/getting-started">
            Get Started
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/live-demo-walkthrough">
            See the Demo
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://github.com/Akash-design-prog/GeoEnhance-AI">
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
        <HomepageStats />
        <HomepageFeatures />
      </main>
    </Layout>
  );
}

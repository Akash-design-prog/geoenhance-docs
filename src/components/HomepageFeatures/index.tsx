import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: ReactNode;
  description: ReactNode;
};

// Simple line icons, hand-drawn to match each card's point -- no icon library needed for three glyphs.
const LayersIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </svg>
);

const SymmetryIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18" />
    <path d="M6 7a4 4 0 000 8" />
    <path d="M18 7a4 4 0 010 8" />
    <path d="M3 7h3M18 7h3M3 15h3M18 15h3" />
  </svg>
);

const ShieldIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const FeatureList: FeatureItem[] = [
  {
    title: '10 bands, not 3',
    icon: LayersIcon,
    description: (
      <>
        SEN2SR Lite reconstructs all ten Sentinel-2 bands natively. The MVP engine,
        Real-ESRGAN, was RGB-only and hallucinated texture on satellite imagery --
        replaced once that limitation was found, not patched around.
      </>
    ),
  },
  {
    title: 'TTA, not MC-Dropout',
    icon: SymmetryIcon,
    description: (
      <>
        SEN2SR Lite has zero dropout layers at inference, so MC-Dropout would yield
        exactly zero variance -- checked directly, not assumed. Uncertainty instead
        comes from 8-pass D4 symmetry test-time augmentation, closed with a
        split-conformal interval carrying a real 92.1% measured coverage.
      </>
    ),
  },
  {
    title: 'Honest nulls',
    icon: ShieldIcon,
    description: (
      <>
        PSNR and SSIM are reported only for the two sectors actually validated
        against a real reference; every other sector, and the SAM metric everywhere,
        reports <code>null</code> instead of a plausible-looking invented number.
      </>
    ),
  },
];

function Feature({title, icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.featureCard}>
        <div className={styles.iconBadge}>{icon}</div>
        <Heading as="h3" className={styles.featureTitle}>
          {title}
        </Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

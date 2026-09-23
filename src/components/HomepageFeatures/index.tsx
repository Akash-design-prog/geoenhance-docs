import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: '10 bands, not 3',
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
    description: (
      <>
        PSNR and SSIM are reported only for the two sectors actually validated
        against a real reference; every other sector, and the SAM metric everywhere,
        reports <code>null</code> instead of a plausible-looking invented number.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.featureCard}>
        <Heading as="h3">{title}</Heading>
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

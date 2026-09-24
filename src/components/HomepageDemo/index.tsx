import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import urbanGif from '@site/docs/img/urban.gif';
import styles from './styles.module.css';

export default function HomepageDemo(): ReactNode {
  return (
    <section className={styles.demo}>
      <div className="container">
        <div className={styles.frame}>
          <img
            src={urbanGif}
            alt="Real before/after slider drag on the urban sector, 10m input vs 2.5m AI-reconstructed output"
            className={styles.gif}
          />
        </div>
        <p className={styles.caption}>
          Urban sector, real tile, real drag -- not a mockup. +71.6% measured sharpness gain over bicubic.{' '}
          <Link to="/live-demo-walkthrough">See all five sectors →</Link>
        </p>
      </div>
    </section>
  );
}

import type {ReactNode} from 'react';
import styles from './styles.module.css';

type Stat = {
  value: string;
  label: string;
  note?: string;
};

const stats: Stat[] = [
  {value: '4x', label: 'resolution', note: '10 m Sentinel-2 → 2.5 m'},
  {value: '10', label: 'bands used', note: 'not just RGB'},
  {value: '+0.22 dB', label: 'PSNR gain', note: '238 held-out SEN2NEON tiles'},
  {value: '92.1%', label: 'conformal coverage', note: '90% target, pre-declared rule'},
  {value: '5', label: 'sectors', note: 'agriculture, disaster, defence, urban, forest'},
];

export default function HomepageStats(): ReactNode {
  return (
    <section className={styles.stats}>
      <div className="container">
        <div className={styles.grid}>
          {stats.map((s) => (
            <div className={styles.cell} key={s.label}>
              <div className={styles.value}>{s.value}</div>
              <div className={styles.label}>{s.label}</div>
              {s.note && <div className={styles.note}>{s.note}</div>}
            </div>
          ))}
        </div>
        <p className={styles.caveat}>
          Every number here has a method and a sample size behind it in{' '}
          <a href="/validation-results">Validation &amp; Results</a> -- none is a bare
          percentage.
        </p>
      </div>
    </section>
  );
}

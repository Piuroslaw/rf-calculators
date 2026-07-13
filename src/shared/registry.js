import * as dbConverter from '../calculators/db-converter.js';
import * as voltageDivider from '../calculators/voltage-divider.js';
import * as riseTimeBw from '../calculators/rise-time-bw.js';

// Add new calculator modules here — each exports { id, title, init }
// (and, per the calculator contract, `calculate` + `schema`).
export const calculators = [dbConverter, voltageDivider, riseTimeBw];

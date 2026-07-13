import * as dbConverter from '../calculators/db-converter.js';

// Add new calculator modules here — each exports { id, title, init }
// (and, per the calculator contract, `calculate` + `schema`).
export const calculators = [dbConverter];

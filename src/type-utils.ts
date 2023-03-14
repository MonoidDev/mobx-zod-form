export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

// Get indexes of a tuple
export type IdxOf<T extends any[]> = Exclude<keyof T, keyof any[]>;

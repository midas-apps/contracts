// No imports: product configs import these values, and an import of
// `./types` from a config creates a cycle through `./utils`

/** `type(uint32).max`: disables the delay (see MidasAuthLibrary.NO_DELAY) */
export const NO_DELAY = 0xffffffff;

/** `0`: no override, falls back to the role/default delay (see MidasAuthLibrary.NULL_DELAY) */
export const NULL_DELAY = 0;

/** pause delay of MidasPauseManager, the same for all the networks: pausing is instant */
export const PAUSE_DELAY = NO_DELAY;

/* eslint-disable */
/**
 * plugin-hh-fallback
 * -----------------------------------------------------------------------------
 * Makes an unrecognized `yarn <name> [...args]` fall back to
 * `yarn hardhat <name> [...args]`.
 *
 * Many deploy/ops commands used to be plain package.json scripts (e.g.
 * `yarn deploy:generate:contracts`) and are now Hardhat tasks invoked as
 * `yarn hh <task>`. Rather than re-add a delegating script per command (and
 * update every doc), this plugin wraps Yarn's built-in `run` command: when it
 * can't find a matching script/binary, it retries the name as a Hardhat task.
 *
 * Behavior is otherwise untouched: real scripts, binaries and built-in Yarn
 * commands run exactly as before — the fallback only fires on the genuine
 * "Couldn't find a script named ..." failure.
 *
 * Pinned to the Yarn release in .yarn/releases (yarnPath), so the internal
 * error string we match on is stable.
 */
module.exports = {
  name: `plugin-hh-fallback`,
  factory: (require) => {
    const essentials = require(`@yarnpkg/plugin-essentials`);
    const { UsageError } = require(`clipanion`);

    const commands = (essentials.default || essentials).commands || [];

    for (const Command of commands) {
      // Target Yarn's `run` command specifically (the one that throws the
      // "Couldn't find a script named ..." UsageError).
      const isRun =
        JSON.stringify(Command.paths || []) === `[["run"]]` &&
        typeof Command.prototype.execute === `function` &&
        /find a script nam/.test(Command.prototype.execute.toString());

      if (!isRun || Command.prototype.__hhFallbackPatched) continue;
      Command.prototype.__hhFallbackPatched = true;

      const originalExecute = Command.prototype.execute;

      Command.prototype.execute = async function () {
        try {
          return await originalExecute.call(this);
        } catch (error) {
          const message = error && error.message ? String(error.message) : ``;
          const isMissingScript =
            error instanceof UsageError && /Couldn't find a script nam/.test(message);

          // Only fall back for a real `yarn <name> [...]` invocation, and never
          // for `--binaries-only`, where a task name makes no sense.
          if (isMissingScript && this.scriptName && !this.binariesOnly) {
            return await this.cli.run([`hardhat`, this.scriptName, ...(this.args || [])]);
          }

          throw error;
        }
      };
    }

    return { hooks: {} };
  },
};

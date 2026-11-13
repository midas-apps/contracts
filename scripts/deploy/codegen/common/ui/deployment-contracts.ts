import { group, text, confirm, select } from '@clack/prompts';

import { requireNotCancelled } from '..';
import { tokenLevelGreenlistTokens } from '../../../../../helpers/roles';

export const getTokenContractNameFromUser = async () => {
  return text({
    message: 'What is the token contract name?',
    placeholder: 'mRe7SOL',
    initialValue: undefined,
    validate(value) {
      if (!value || value.length === 0) return `Value is required!`;
    },
  }).then(requireNotCancelled);
};

export const getConfigFromUser = async (tokenContractName: string) => {
  const { tokenName, tokenSymbol, contractNamePrefix, rolesPrefix } =
    await group({
      tokenName: () =>
        text({
          message: 'What is the token name?',
          placeholder: 'Midas Re7SOL',
          initialValue: undefined,
          validate(value) {
            if (!value || value.length === 0) return `Value is required!`;
          },
        }),

      tokenSymbol: () =>
        text({
          message: 'What is the token symbol?',
          placeholder: 'mRe7SOL',
          initialValue: tokenContractName,
          validate(value) {
            if (!value || value.length === 0) return `Value is required!`;
          },
        }),

      contractNamePrefix: () =>
        text({
          message: 'What is the contract name prefix?',
          placeholder: 'MRe7Sol',
          initialValue: undefined,
          validate(value) {
            if (!value || value.length === 0) return `Value is required!`;
          },
        }),

      rolesPrefix: () =>
        text({
          message: 'What is the roles prefix?',
          placeholder: 'M_RE7SOL',
          initialValue: undefined,
          validate(value) {
            if (!value || value.length === 0) return `Value is required!`;
          },
        }),
    });

  return {
    tokenName,
    contractNamePrefix,
    rolesPrefix,
    tokenSymbol: tokenSymbol as string,
    tokenContractName,
  };
};

export const getShouldUseTokenLevelGreenListFromUser = async (
  initialValue = false,
) => {
  return confirm({
    message: 'Should use token level green list for vaults?',
    initialValue,
  }).then(requireNotCancelled);
};

export const getShouldUseTokenPermissionedFromUser = async () => {
  return confirm({
    message: 'Should use permissioned mToken variant?',
    initialValue: false,
  }).then(requireNotCancelled);
};

export const getShouldUseTokenMinBalanceFromUser = async () => {
  return confirm({
    message: 'Should use min-balance mToken variant?',
    initialValue: false,
  }).then(requireNotCancelled);
};

/**
 * Optionally reuse an existing product's greenlist role instead of minting a
 * token-specific one (e.g. mGLO reuses mGLOBAL's M_GLOBAL_GREENLISTED_ROLE).
 * Returns the source mToken name, or undefined to use this token's own role.
 */
export const getGreenlistRoleSourceFromUser = async (currentToken: string) => {
  const options = tokenLevelGreenlistTokens.filter((t) => t !== currentToken);

  if (options.length === 0) {
    return undefined;
  }

  const share = await confirm({
    message:
      "Reuse another product's greenlist role? " +
      "(No = mint this token's own <PREFIX>_GREENLISTED_ROLE)",
    initialValue: false,
  }).then(requireNotCancelled);

  if (!share) {
    return undefined;
  }

  return select<string>({
    message: "Which product's greenlist role should be reused?",
    options: options.map((token) => ({
      value: token,
      label: token,
      hint: `use ${token}'s GREENLISTED_ROLE`,
    })),
  }).then(requireNotCancelled);
};

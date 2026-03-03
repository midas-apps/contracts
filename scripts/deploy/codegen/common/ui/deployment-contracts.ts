import { group, multiselect, text } from '@clack/prompts';

import { requireNotCancelled } from '..';
import { TokenContractNames } from '../../../../../helpers/contracts';

export const getConfigFromUser = async () => {
  const {
    tokenContractName,
    tokenName,
    tokenSymbol,
    contractNamePrefix,
    rolesPrefix,
  } = await group({
    tokenContractName: () =>
      text({
        message: 'What is the token contract name?',
        placeholder: 'mRe7SOL',
        initialValue: undefined,
        validate(value) {
          if (!value || value.length === 0) return `Value is required!`;
        },
      }),

    tokenName: () =>
      text({
        message: 'What is the token name?',
        placeholder: 'Midas Re7SOL',
        initialValue: undefined,
        validate(value) {
          if (!value || value.length === 0) return `Value is required!`;
        },
      }),

    tokenSymbol: ({ results: { tokenContractName } }) =>
      text({
        message: 'What is the token symbol?',
        placeholder: 'mRe7SOL',
        initialValue: tokenContractName!,
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

export const getContractsToGenerateFromUser = async () => {
  return await multiselect<keyof TokenContractNames>({
    message:
      'Select contracts to generate. (Space to select, Enter to confirm)',
    options: [
      { value: 'token', label: 'Token', hint: 'Token contract' },
      { value: 'dv', label: 'Deposit Vault', hint: 'Deposit Vault contract' },
      {
        value: 'rv',
        label: 'Redemption Vault',
        hint: 'Redemption Vault contract',
      },
      {
        value: 'rvSwapper',
        label: 'Redemption Vault With Swapper',
        hint: 'Redemption Vault With Swapper contract',
      },
      {
        value: 'rvMToken',
        label: 'Redemption Vault With MToken',
        hint: 'Redemption Vault With MToken liquid strategy contract',
      },
      {
        value: 'rvUstb',
        label: 'Redemption Vault With USTB',
        hint: 'Redemption Vault With USTB contract',
      },
      {
        value: 'rvAave',
        label: 'Redemption Vault With Aave',
        hint: 'Redemption Vault With Aave V3 contract',
      },
      {
        value: 'rvMorpho',
        label: 'Redemption Vault With Morpho',
        hint: 'Redemption Vault With Morpho Vault (ERC-4626) contract',
      },
      {
        value: 'dvAave',
        label: 'Deposit Vault With Aave',
        hint: 'Deposit Vault with Aave V3 auto-invest contract',
      },
      {
        value: 'dvMorpho',
        label: 'Deposit Vault With Morpho',
        hint: 'Deposit Vault with Morpho auto-invest contract',
      },
      {
        value: 'dvMToken',
        label: 'Deposit Vault With MToken',
        hint: 'Deposit Vault with mToken auto-invest contract',
      },
      { value: 'dataFeed', label: 'Data Feed', hint: 'Data Feed contract' },
      {
        value: 'customAggregator',
        label: 'Custom Aggregator',
        hint: 'Custom Aggregator contract',
      },
      {
        value: 'customAggregatorGrowth',
        label: 'Custom Aggregator Growth',
        hint: 'Custom Aggregator Growth contract',
      },
    ],
    initialValues: ['token', 'dv', 'rvSwapper', 'dataFeed', 'customAggregator'],
    required: true,
  }).then(requireNotCancelled);
};

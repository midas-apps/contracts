import { cancel, isCancel, multiselect } from '@clack/prompts';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { MTokenName } from '../../../../config';
import {
  getTokenContractNames,
  TokenContractNames,
} from '../../../../helpers/contracts';
import { mTokensMetadata } from '../../../../helpers/mtokens-metadata';
import { getRolesNamesForToken } from '../../../../helpers/roles';

const getTokenContractFromTemplate = (mToken: MTokenName) => {
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);
  const metadata = mTokensMetadata[mToken];

  return {
    name: contractNames.token,
    content: `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mTBILL/mTBILL.sol";

/**
 * @title ${contractNames.token}
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract ${contractNames.token} is mTBILL {
    /**
     * @notice actor that can mint ${contractNames.token}
     */
    bytes32 public constant ${roles.minter} =
        keccak256("${roles.minter}");

    /**
     * @notice actor that can burn ${contractNames.token}
     */
    bytes32 public constant ${roles.burner} =
        keccak256("${roles.burner}");

    /**
     * @notice actor that can pause ${contractNames.token}
     */
    bytes32 public constant ${roles.pauser} =
        keccak256("${roles.pauser}");

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract\`s initializer
     * @param _accessControl address of MidasAccessControl contract
     */
    function initialize(address _accessControl) external override initializer {
        __Blacklistable_init(_accessControl);
        __ERC20_init("${metadata.name}", "${metadata.symbol}");
    }

    /**
     * @dev AC role, owner of which can mint ${contractNames.token} token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return ${roles.minter};
    }

    /**
     * @dev AC role, owner of which can burn ${contractNames.token} token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return ${roles.burner};
    }

    /**
     * @dev AC role, owner of which can pause ${contractNames.token} token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return ${roles.pauser};
    }
}`,
  };
};

const getTokenRolesContractFromTemplate = (mToken: MTokenName) => {
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  return {
    name: contractNames.roles,
    content: `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title ${contractNames.roles}
 * @notice Base contract that stores all roles descriptors for ${contractNames.token} contracts
 * @author RedDuck Software
 */
abstract contract ${contractNames.roles} {
    /**
     * @notice actor that can manage ${contractNames.dv}
     */
    bytes32 public constant ${roles.depositVaultAdmin} =
        keccak256("${roles.depositVaultAdmin}");

    /**
     * @notice actor that can manage ${contractNames.rv}
     */
    bytes32 public constant ${roles.redemptionVaultAdmin} =
        keccak256("${roles.redemptionVaultAdmin}");

    /**
     * @notice actor that can manage ${contractNames.customAggregator} and ${contractNames.dataFeed}
     */
    bytes32 public constant ${roles.customFeedAdmin} =
        keccak256("${roles.customFeedAdmin}");
}`,
  };
};

const getDvContractFromTemplate = (mToken: MTokenName) => {
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  return {
    name: contractNames.dv,
    content: `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./${contractNames.roles}.sol";

/**
 * @title ${contractNames.dv}
 * @notice Smart contract that handles ${contractNames.token} minting
 * @author RedDuck Software
 */
contract ${contractNames.dv} is DepositVault, ${contractNames.roles} {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return ${roles.depositVaultAdmin};
    }
}`,
  };
};

const getRvContractFromTemplate = (mToken: MTokenName) => {
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  return {
    name: contractNames.rv,
    content: `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVault.sol";
import "./${contractNames.roles}.sol";

/**
 * @title ${contractNames.rv}
 * @notice Smart contract that handles ${contractNames.token} minting
 * @author RedDuck Software
 */
contract ${contractNames.rv} is
    RedemptionVault,
    ${contractNames.roles}
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return ${roles.redemptionVaultAdmin};
    }
}`,
  };
};

const getRvSwapperContractFromTemplate = (mToken: MTokenName) => {
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  return {
    name: contractNames.rvSwapper,
    content: `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./${contractNames.roles}.sol";

/**
 * @title ${contractNames.rvSwapper}
 * @notice Smart contract that handles ${contractNames.token} redemptions
 * @author RedDuck Software
 */
contract ${contractNames.rvSwapper} is
    RedemptionVaultWithSwapper,
    ${contractNames.roles}
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return ${roles.redemptionVaultAdmin};
    }
}`,
  };
};

const getRvUstbContractFromTemplate = (mToken: MTokenName) => {
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  return {
    name: contractNames.rvUstb,
    content: `
  // SPDX-License-Identifier: MIT
  pragma solidity 0.8.9;

  import "../RedemptionVaultWithUSTB.sol";
  import "./${contractNames.roles}.sol";

  /**
   * @title ${contractNames.rvUstb}
   * @notice Smart contract that handles ${contractNames.token} redemptions
   * @author RedDuck Software
   */
  contract ${contractNames.rvUstb} is
      RedemptionVaultWithUSTB,
      ${contractNames.roles}
  {
      /**
       * @dev leaving a storage gap for futures updates
       */
      uint256[50] private __gap;

      /**
       * @inheritdoc ManageableVault
       */
      function vaultRole() public pure override returns (bytes32) {
          return ${roles.redemptionVaultAdmin};
      }
  }`,
  };
};

const getDataFeedContractFromTemplate = (mToken: MTokenName) => {
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);
  if (!contractNames.dataFeed) {
    return undefined;
  }

  return {
    name: contractNames.dataFeed,
    content: `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./${contractNames.roles}.sol";

/**
 * @title ${contractNames.dataFeed}
 * @notice DataFeed for ${contractNames.token} product
 * @author RedDuck Software
 */
contract ${contractNames.dataFeed} is DataFeed, ${contractNames.roles} {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return ${roles.customFeedAdmin};
    }
}`,
  };
};

const getCustomAggregatorContractFromTemplate = (mToken: MTokenName) => {
  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  if (!contractNames.customAggregator) {
    return undefined;
  }

  return {
    name: contractNames.customAggregator,
    content: `
// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./${contractNames.roles}.sol";

/**
 * @title ${contractNames.customAggregator}
 * @notice AggregatorV3 compatible feed for ${contractNames.token},
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract ${contractNames.customAggregator} is
    CustomAggregatorV3CompatibleFeed,
    ${contractNames.roles}
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return ${roles.customFeedAdmin};
    }
}`,
  };
};

const generatorPerContract: Partial<
  Record<
    keyof TokenContractNames,
    (mToken: MTokenName) =>
      | {
          name: string;
          content: string;
        }
      | undefined
  >
> = {
  token: getTokenContractFromTemplate,
  dv: getDvContractFromTemplate,
  rv: getRvContractFromTemplate,
  rvSwapper: getRvSwapperContractFromTemplate,
  rvUstb: getRvUstbContractFromTemplate,
  dataFeed: getDataFeedContractFromTemplate,
  customAggregator: getCustomAggregatorContractFromTemplate,
};

export const generateContracts = async (
  hre: HardhatRuntimeEnvironment,
  mToken: MTokenName,
) => {
  const folder = path.join(hre.config.paths.root, 'contracts', `${mToken}`);

  console.log(folder);

  const isFolderExists = fs.existsSync(folder);

  if (isFolderExists) {
    fs.rmSync(folder, { recursive: true });
  }

  fs.mkdirSync(folder, { recursive: true });

  const contractsToGenerate = await multiselect<keyof TokenContractNames>({
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
        value: 'rvUstb',
        label: 'Redemption Vault With USTB',
        hint: 'Redemption Vault With USTB contract',
      },
      { value: 'dataFeed', label: 'Data Feed', hint: 'Data Feed contract' },
      {
        value: 'customAggregator',
        label: 'Custom Aggregator',
        hint: 'Custom Aggregator contract',
      },
    ],
    initialValues: ['token', 'dv', 'rvSwapper', 'dataFeed', 'customAggregator'],
    required: true,
  });

  if (isCancel(contractsToGenerate)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  const generators = [
    getTokenRolesContractFromTemplate,
    ...contractsToGenerate.map((contract) => generatorPerContract[contract]),
  ].filter((v) => v !== undefined);

  const generatedContracts = generators.map((generator) => generator(mToken));

  for (const contract of generatedContracts) {
    if (!contract) {
      cancel(`Contract ${contract} is not available for a provided mToken`);
      process.exit(0);
    }

    fs.writeFileSync(
      path.join(folder, `${contract.name}.sol`),
      contract.content,
    );
  }

  // run lint&format fix for generated contracts
  try {
    execSync(
      `yarn solhint ${folder}/**/*.sol --quiet --fix > /dev/null & yarn prettier ${folder}/**/*.sol --write > /dev/null`,
      {
        stdio: 'inherit',
      },
    );
  } catch (error) {
    cancel('Failed to run lint&format fix for generated contracts');
    process.exit(1);
  }
};

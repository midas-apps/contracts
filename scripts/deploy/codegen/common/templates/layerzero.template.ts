import { MTokenName } from '../../../../../config';
import { importWithoutCache } from '../../../../../helpers/utils';

export const getMinterBurnerContractFromTemplate = async (
  mToken: MTokenName,
) => {
  const { getTokenContractNames, getCommonContractNames } =
    await importWithoutCache(
      require.resolve('../../../../../helpers/contracts'),
    );

  const { getRolesNamesForToken } = await importWithoutCache(
    require.resolve('../../../../../helpers/roles'),
  );

  const contractNames = getTokenContractNames(mToken);
  const commonContractNames = getCommonContractNames();
  const roles = getRolesNamesForToken(mToken);

  return {
    name: contractNames.layerZero.minterBurner,
    content: `
  // SPDX-License-Identifier: MIT
  pragma solidity 0.8.22;

  import "../../misc/layerzero/${commonContractNames.layerZero.minterBurner}.sol";

  /**
   * @title ${contractNames.layerZero.minterBurner}
   * @notice MinterBurner contract that controls access
   * for minting and burning of ${contractNames.token} in LayerZero flows
   * @author RedDuck Software
   */
  contract ${contractNames.layerZero.minterBurner} is ${commonContractNames.layerZero.minterBurner} {
      /**
       * @notice adapter role that can call mint and burn functions
       */
      bytes32 public constant ${roles.layerZero.adapter} =
          keccak256("${roles.layerZero.adapter}");

      /**
       * @inheritdoc ${commonContractNames.layerZero.minterBurner}
       */
      function adapterRole() public pure override returns (bytes32) {
          return ${roles.layerZero.adapter};
      }
  }`,
  };
};

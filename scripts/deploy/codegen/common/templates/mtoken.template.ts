import { MTokenName } from '../../../../../config';
import { importWithoutCache } from '../../../../../helpers/utils';

export const getTokenContractFromTemplate = async (
  mToken: MTokenName,
  optionalParams?: Record<string, unknown>,
) => {
  const { isPermissionedMToken = false } = optionalParams || {};
  const { getTokenContractNames } = await importWithoutCache(
    require.resolve('../../../../../helpers/contracts'),
  );

  const { getRolesNamesForToken } = await importWithoutCache(
    require.resolve('../../../../../helpers/roles'),
  );

  const { mTokensMetadata } = await importWithoutCache(
    require.resolve('../../../../../helpers/mtokens-metadata'),
  );

  const metadata = mTokensMetadata[mToken];

  const contractNames = getTokenContractNames(mToken);
  const roles = getRolesNamesForToken(mToken);

  return {
    name: contractNames.token,
    content: `
  // SPDX-License-Identifier: MIT
  pragma solidity 0.8.9;

  import "../../mToken${isPermissionedMToken ? 'Permissioned' : ''}.sol";
  ${isPermissionedMToken ? `import "./${contractNames.roles}.sol";` : ''}

  /**
   * @title ${contractNames.token}
   * @author RedDuck Software
   */
  //solhint-disable contract-name-camelcase
  contract ${contractNames.token} is mToken${
      isPermissionedMToken ? `Permissioned, ${contractNames.roles}` : ''
    } {
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
       * @inheritdoc mToken
       */
      function _getNameSymbol()
          internal
          pure
          override
          returns (string memory, string memory)
      {
          return ("${metadata.name}", "${metadata.symbol}");
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

      ${
        isPermissionedMToken
          ? `
       /**
       * @inheritdoc mTokenPermissioned
       */
      function _greenlistedRole() internal pure override returns (bytes32) {
          return ${roles.greenlisted};
      }`
          : ''
      }
  }`,
  };
};

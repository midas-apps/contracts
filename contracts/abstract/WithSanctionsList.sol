// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {ISanctionsList} from "../interfaces/ISanctionsList.sol";
import {WithMidasAccessControl} from "../access/WithMidasAccessControl.sol";

/**
 * @title WithSanctionsList
 * @notice Base contract that uses sanctions oracle from
 * Chainalysis to check that user is not sanctioned
 * @author RedDuck Software
 */
abstract contract WithSanctionsList is WithMidasAccessControl {
    /**
     * @notice address of Chainalysis sanctions oracle
     */
    address public sanctionsList;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @param newSanctionsList new address of `sanctionsList`
     */
    event SetSanctionsList(address indexed newSanctionsList);

    /**
     * @notice when user is sanctioned on sanctions list contract
     * @param user user address
     */
    error Sanctioned(address user);

    /**
     * @dev checks that a given `user` is not sanctioned
     */
    modifier onlyNotSanctioned(address user) {
        address _sanctionsList = sanctionsList;
        if (_sanctionsList != address(0)) {
            require(
                !ISanctionsList(_sanctionsList).isSanctioned(user),
                Sanctioned(user)
            );
        }
        _;
    }

    /**
     * @dev upgradeable pattern contract`s initializer unchained
     */
    // solhint-disable func-name-mixedcase
    function __WithSanctionsList_init_unchained(address _sanctionsList)
        internal
        onlyInitializing
    {
        sanctionsList = _sanctionsList;
    }

    /**
     * @notice updates `sanctionsList` address.
     * @param newSanctionsList new sanctions list address
     */
    function setSanctionsList(address newSanctionsList)
        external
        onlyContractAdmin
    {
        sanctionsList = newSanctionsList;
        emit SetSanctionsList(newSanctionsList);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {IMintableBurnable} from "@layerzerolabs/oft-evm/contracts/interfaces/IMintableBurnable.sol";
import {IMToken} from "../../interfaces/IMToken.sol";
import {WithMidasAccessControl} from "../../access/WithMidasAccessControl.sol";

/**
 * @title LzElevatedMinterBurner
 * @notice MinterBurner implementation that controls access
 * for minting and burning of mTokens in the LayerZero flows
 * @author RedDuck Software
 */
abstract contract LzElevatedMinterBurner is
    IMintableBurnable,
    WithMidasAccessControl
{
    /**
     * @notice address of the mToken
     */
    address public mToken;

    modifier onlyAdapter() {
        _onlyRole(adapterRole(), msg.sender);
        _;
    }

    /**
     * @notice initialize the contract
     * @param _ac address of the MidasAccessControl contract
     * @param _mtoken address of the mToken
     */
    function initialize(address _ac, address _mtoken) external initializer {
        __WithMidasAccessControl_init(_ac);
        mToken = _mtoken;
    }

    /**
     * @inheritdoc IMintableBurnable
     */
    function burn(address _from, uint256 _amount)
        external
        override
        onlyAdapter
        returns (bool)
    {
        IMToken(mToken).burn(_from, _amount);
        return true;
    }

    /**
     * @inheritdoc IMintableBurnable
     */
    function mint(address _to, uint256 _amount)
        external
        override
        onlyAdapter
        returns (bool)
    {
        IMToken(mToken).mint(_to, _amount);
        return true;
    }

    /**
     * @notice role descriptor for the adapter
     * @return bytes32 role descriptor
     */
    function adapterRole() public pure virtual returns (bytes32);
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {OFTAdapter} from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title MidasLzOFTAdapter
 * @notice OFT adapter implementation
 * @author RedDuck Software
 */
contract MidasLzOFTAdapter is OFTAdapter {
    /**
     * @notice shared decimals for the OFT adapter
     */
    uint8 private immutable _sharedDecimals;

    /**
     * @notice constructor
     * @param _token address of the token
     * @param __sharedDecimals shared decimals for the OFT adapter
     * @param _lzEndpoint address of the LayerZero endpoint
     * @param _delegate address of the delegate
     */
    constructor(
        address _token,
        uint8 __sharedDecimals,
        address _lzEndpoint,
        address _delegate
    ) OFTAdapter(_token, _lzEndpoint, _delegate) Ownable() {
        _sharedDecimals = __sharedDecimals;
        uint8 tokenDecimals = IERC20Metadata(_token).decimals();

        if (tokenDecimals < sharedDecimals()) revert InvalidLocalDecimals();
        decimalConversionRate = 10**(tokenDecimals - sharedDecimals());
    }

    /**
     * @notice Returns the shared decimals for the OFT
     * @return The shared decimals
     */
    function sharedDecimals() public view override returns (uint8) {
        return _sharedDecimals;
    }
}

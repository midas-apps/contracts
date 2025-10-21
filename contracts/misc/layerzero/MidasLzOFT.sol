// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {OFT} from "@layerzerolabs/oft-evm/contracts/OFT.sol";

/**
 * @title MidasLzOFT
 * @notice OFT adapter implementation
 * @author RedDuck Software
 */
contract MidasLzOFT is OFT {
    /**
     * @notice shared decimals for the OFT
     */
    uint8 private immutable _sharedDecimals;

    /**
     * @notice constructor
     * @param _name name of the token
     * @param _symbol symbol of the token
     * @param __sharedDecimals shared decimals for the OFT
     * @param _lzEndpoint address of the LayerZero endpoint
     * @param _delegate address of the delegate
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 __sharedDecimals,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable() {
        _sharedDecimals = __sharedDecimals;

        if (decimals() < sharedDecimals()) revert InvalidLocalDecimals();
        decimalConversionRate = 10 ** (decimals() - sharedDecimals());
    }

    /**
     * @notice Returns the shared decimals for the OFT
     * @return The shared decimals
     */
    function sharedDecimals() public view override returns (uint8) {
        return _sharedDecimals;
    }
}

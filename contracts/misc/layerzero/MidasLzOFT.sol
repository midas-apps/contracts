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
     * @notice constructor
     * @param _name name of the token
     * @param _symbol symbol of the token
     * @param _lzEndpoint address of the LayerZero endpoint
     * @param _delegate address of the delegate
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable() {}
}

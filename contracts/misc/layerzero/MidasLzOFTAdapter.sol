// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {OFTAdapter} from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";

/**
 * @title MidasLzOFTAdapter
 * @notice OFT adapter implementation
 * @author RedDuck Software
 */
contract MidasLzOFTAdapter is OFTAdapter {
    /**
     * @notice constructor
     * @param _token address of the token
     * @param _lzEndpoint address of the LayerZero endpoint
     * @param _delegate address of the delegate
     */
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) OFTAdapter(_token, _lzEndpoint, _delegate) Ownable() {}
}

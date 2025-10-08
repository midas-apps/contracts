// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MintBurnOFTAdapter} from "@layerzerolabs/oft-evm/contracts/MintBurnOFTAdapter.sol";
import {IMintableBurnable} from "@layerzerolabs/oft-evm/contracts/interfaces/IMintableBurnable.sol";
import {RateLimiter} from "@layerzerolabs/oapp-evm/contracts/oapp/utils/RateLimiter.sol";

/**
 * @title MidasLzMintBurnOFTAdapter
 * @notice OFT MintBurn adapter implementation
 * @author RedDuck Software
 */
contract MidasLzMintBurnOFTAdapter is MintBurnOFTAdapter, RateLimiter {
    /**
     * @notice constructor
     * @param _token address of the mToken
     * @param _minterBurner address of the MidasElevatedMinterBurner contract
     * @param _lzEndpoint address of the LayerZero endpoint
     * @param _delegate address of the delegate
     */
    constructor(
        address _token,
        IMintableBurnable _minterBurner,
        address _lzEndpoint,
        address _delegate,
        RateLimitConfig[] memory _rateLimitConfigs
    )
        MintBurnOFTAdapter(_token, _minterBurner, _lzEndpoint, _delegate)
        Ownable()
    {
        _setRateLimits(_rateLimitConfigs);
    }

    function setRateLimits(RateLimitConfig[] calldata _rateLimitConfigs)
        external
        onlyOwner
    {
        _setRateLimits(_rateLimitConfigs);
    }

    function getRateLimit(uint32 _dstEid)
        external
        view
        returns (RateLimit memory)
    {
        return rateLimits[_dstEid];
    }

    // Override _debit to enforce rate limits on token transfers
    function _debit(
        address _from,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    )
        internal
        override
        returns (uint256 amountSentLD, uint256 amountReceivedLD)
    {
        // Check rate limit before allowing the transfer
        _outflow(_dstEid, _amountLD);

        // Proceed with normal OFT debit logic
        return super._debit(_from, _amountLD, _minAmountLD, _dstEid);
    }
}

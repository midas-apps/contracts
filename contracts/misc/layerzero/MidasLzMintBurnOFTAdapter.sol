// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MintBurnOFTAdapter} from "@layerzerolabs/oft-evm/contracts/MintBurnOFTAdapter.sol";
import {IMintableBurnable} from "@layerzerolabs/oft-evm/contracts/interfaces/IMintableBurnable.sol";
import {RateLimiter} from "@layerzerolabs/oapp-evm/contracts/oapp/utils/RateLimiter.sol";
import {IMToken} from "../../interfaces/IMToken.sol";

/**
 * @title MidasLzMintBurnOFTAdapter
 * @notice OFT MintBurn adapter implementation
 * @author RedDuck Software
 */
contract MidasLzMintBurnOFTAdapter is
    IMintableBurnable,
    MintBurnOFTAdapter,
    RateLimiter
{
    /**
     * @notice error thrown when the sender is not the contract
     * @param sender the address of the sender
     */
    error SenderNotThis(address sender);

    /**
     * @notice modifier to check if the sender is the contract itself
     */
    modifier onlyThis() {
        if (msg.sender != address(this)) {
            revert SenderNotThis(msg.sender);
        }
        _;
    }

    /**
     * @notice constructor
     * @param _token address of the mToken
     * @param _lzEndpoint address of the LayerZero endpoint
     * @param _delegate address of the delegate
     */
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate,
        RateLimitConfig[] memory _rateLimitConfigs
    )
        MintBurnOFTAdapter(
            _token,
            IMintableBurnable(address(this)),
            _lzEndpoint,
            _delegate
        )
        Ownable()
    {
        _setRateLimits(_rateLimitConfigs);
    }

    /**
     * @inheritdoc IMintableBurnable
     */
    function burn(address _from, uint256 _amount)
        external
        override
        onlyThis
        returns (bool)
    {
        IMToken(token()).burn(_from, _amount);
        return true;
    }

    /**
     * @inheritdoc IMintableBurnable
     */
    function mint(address _to, uint256 _amount)
        external
        override
        onlyThis
        returns (bool)
    {
        IMToken(token()).mint(_to, _amount);
        return true;
    }

    /**
     * @notice Sets the rate limits for the adapter
     * @param _rateLimitConfigs the rate limit configs to set
     */
    function setRateLimits(RateLimitConfig[] calldata _rateLimitConfigs)
        external
        onlyOwner
    {
        _setRateLimits(_rateLimitConfigs);
    }

    /**
     * @notice Returns the rate limit for a given destination EID
     * @param _dstEid the destination EID
     * @return the rate limit struct
     */
    function getRateLimit(uint32 _dstEid)
        external
        view
        returns (RateLimit memory)
    {
        return rateLimits[_dstEid];
    }

    /**
     * @notice Returns the shared decimals for the adapter
     * @dev Overridden to 9 because default is not enough for
     * some of the mTokens
     * @return The shared decimals
     */
    function sharedDecimals() public pure override returns (uint8) {
        return 9;
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

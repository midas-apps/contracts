// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.28;

/**
 * @title IMidasCCTFailedMessageFallback
 * @author RedDuck Software
 */
interface IMidasCCTFailedMessageFallback {
    /**
     * @notice handles a failed message
     * @dev this function is called by the token pool when it catches a failed message
     * @param _originalRecipient the original recipient of the failed message
     * @param _tokenAmount the amount of tokens to recover
     */
    function onFailedMessage(address _originalRecipient, uint256 _tokenAmount)
        external;
}

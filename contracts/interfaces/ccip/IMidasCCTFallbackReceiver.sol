// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.28;

import {IERC165Upgradeable as IERC165} from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";

/**
 * @title IMidasCCTFallbackReceiver
 * @author RedDuck Software
 * @notice Narrow callback used by the Midas CCT pool after a destination mint
 * cannot be delivered to the requested recipient.
 * @dev Implementations expose their bound pool through `tokenPool()` so the
 * pool can validate the receiver before linking it. The callback is expected
 * to revert unless its corresponding token amount is already funded.
 */
interface IMidasCCTFallbackReceiver is IERC165 {
    /**
     * @notice Returns the token pool authorized to register recoveries.
     * @return Address of the bound Midas CCT token pool.
     */
    function tokenPool() external view returns (address);

    /**
     * @notice Registers tokens that the pool has already minted to this receiver.
     * @dev The pool invokes this callback in the same transaction as the fallback
     * mint. A callback revert therefore rolls back both the mint and registration.
     * @param originalSender Direct source-chain Router caller carried by CCIP as
     * the original sender.
     * @param originalRecipient Requested destination token recipient.
     * @param originalSourceChainSelector Chainlink selector of the chain from
     * which the failed delivery originated.
     * @param amount Local-denominated token amount minted to this receiver.
     */
    function onFallbackMinted(
        address originalSender,
        address originalRecipient,
        uint64 originalSourceChainSelector,
        uint256 amount
    ) external;
}

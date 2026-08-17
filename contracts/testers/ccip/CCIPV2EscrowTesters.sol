// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IPoolV2} from "@chainlink/contracts-ccip/contracts/interfaces/IPoolV2.sol";
import {IERC20} from "@openzeppelin/contracts@5.3.0/token/ERC20/IERC20.sol";
import {IERC165} from "@openzeppelin/contracts@5.3.0/utils/introspection/IERC165.sol";

import {MidasCCTFallbackEscrow} from "../../misc/ccip/MidasCCTFallbackEscrow.sol";

interface ICCIPV2FallbackReceiver is IERC165 {
    function tokenPool() external view returns (address);

    function onFallbackMinted(
        address originalSender,
        address originalRecipient,
        uint64 originalSourceChainSelector,
        uint256 amount
    ) external;
}

interface ICCIPV2FallbackEscrow is ICCIPV2FallbackReceiver {
    struct LocalRecovery {
        bytes32 recoveryId;
        address recipient;
    }

    function claim(bytes32 recoveryId, address recipient) external;

    function adminRecoverBulk(LocalRecovery[] calldata recoveries) external;

    function confiscateBulk(bytes32[] calldata recoveryIds) external;

    function getReturnToSourceFee(bytes32 recoveryId)
        external
        view
        returns (uint256);

    function returnToSource(bytes32 recoveryId)
        external
        payable
        returns (bytes32 outboundCcipMessageId);

    function setDefaultRecipient(address newDefaultRecipient) external;

    function setPeerEscrow(
        uint64 sourceChainSelector,
        address peerEscrow,
        bool allowed
    ) external;
}

contract CCIPV2EscrowInterfaces {
    function fallbackReceiverInterfaceId() external pure returns (bytes4) {
        return type(ICCIPV2FallbackReceiver).interfaceId;
    }

    function fallbackEscrowInterfaceId() external pure returns (bytes4) {
        return type(ICCIPV2FallbackEscrow).interfaceId;
    }
}

contract CCIPV2PoolIdentityTester {
    error GetTokenFailed();

    address private immutable _token;
    bool private immutable _revertGetToken;

    constructor(address token, bool revertGetToken) {
        _token = token;
        _revertGetToken = revertGetToken;
    }

    function getToken() external view returns (IERC20) {
        if (_revertGetToken) revert GetTokenFailed();
        return IERC20(_token);
    }

    function supportsInterface(bytes4 interfaceId)
        external
        pure
        returns (bool)
    {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IPoolV2).interfaceId;
    }
}

contract MidasCCTFallbackEscrowUpgradeTester is MidasCCTFallbackEscrow {
    uint256 public upgradeMarker;

    function setUpgradeMarker(uint256 marker) external {
        upgradeMarker = marker;
    }
}

contract MidasCCTFallbackEscrowIncompatibleTester {
    uint256 public incompatibleSlot;
}

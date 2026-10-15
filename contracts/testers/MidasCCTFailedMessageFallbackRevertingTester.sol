// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.28;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {IMidasCCTFailedMessageFallback} from "../interfaces/ccip/IMidasCCTFailedMessageFallback.sol";

contract MidasCCTFailedMessageFallbackRevertingTester is
    ERC165,
    IMidasCCTFailedMessageFallback
{
    error CallbackFailed();

    function onFailedMessage(
        address,
        uint256,
        uint64
    ) external pure {
        revert CallbackFailed();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override
        returns (bool)
    {
        return
            interfaceId == type(IMidasCCTFailedMessageFallback).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}

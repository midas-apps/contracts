// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {DecimalsCorrectionLibrary} from "../libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title IDataFeed
 * @author RedDuck Software
 */
interface IDataFeed {
    /**
     * @notice fetches answer from aggregator
     * and converts it to the base18 precision
     * @return answer fetched aggregator answer
     */
    function getDataInBase18() external view returns (uint256 answer);
}

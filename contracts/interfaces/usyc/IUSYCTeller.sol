/**
 * Copyright 2025 Circle Internet Group, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
pragma solidity ^0.8.0;

interface IUSYCTeller {
    function deposit(uint256 assets, address receiver)
        external
        returns (uint256 shares);

    function redeem(
        uint256 shares,
        address receiver,
        address account
    ) external returns (uint256 assets);

    function previewDepositData(address account, uint256 assets)
        external
        view
        returns (
            uint256 shares,
            uint256 fee,
            int256 price
        );

    function previewWithdrawData(address account, uint256 assets)
        external
        view
        returns (
            uint256 shares,
            uint256 fee,
            int256 price
        );

    function previewRedeemData(address account, uint256 shares)
        external
        view
        returns (
            uint256 assets,
            uint256 fee,
            int256 price
        );

    function subscriptionFeeRate(address account)
        external
        view
        returns (uint256 rate);

    function redemptionFeeRate(address account)
        external
        view
        returns (uint256 rate);

    function asset() external view returns (address);

    function share() external view returns (address);

    function maxRedeem(address account)
        external
        view
        returns (uint256 maxShares);

    function treasury(address account)
        external
        view
        returns (address treasuryAddr);
}

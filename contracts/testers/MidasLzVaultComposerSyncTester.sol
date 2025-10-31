// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "../misc/layerzero/MidasLzVaultComposerSync.sol";

contract MidasLzVaultComposerSyncTester is MidasLzVaultComposerSync {
    enum HandleComposeType {
        NoOverride,
        ThrowsInsufficientBalanceError,
        ThrowsError
    }

    HandleComposeType public handleComposeType;

    constructor(
        address _depositVault,
        address _redemptionVault,
        address _paymentTokenOft,
        address _mTokenOft
    )
        MidasLzVaultComposerSync(
            _depositVault,
            _redemptionVault,
            _paymentTokenOft,
            _mTokenOft
        )
    {}

    function setHandleComposeType(HandleComposeType _handleComposeType)
        external
    {
        handleComposeType = _handleComposeType;
    }

    function handleCompose(
        address _oftIn,
        bytes32 _composeFrom,
        bytes memory _composeMsg,
        uint256 _amount
    ) public payable override {
        if (
            handleComposeType ==
            HandleComposeType.ThrowsInsufficientBalanceError
        ) {
            revert InsufficientMsgValue(0, 0);
        } else if (handleComposeType == HandleComposeType.ThrowsError) {
            revert("Error");
        } else {
            super.handleCompose(_oftIn, _composeFrom, _composeMsg, _amount);
        }
    }

    function depositAndSendPublic(
        bytes32 _depositor,
        uint256 _paymentTokenAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) external {
        _depositAndSend(
            _depositor,
            _paymentTokenAmount,
            _sendParam,
            _refundAddress
        );
    }

    function depositPublic(
        bytes32 _depositor,
        uint256 _paymentTokenAmount,
        uint256 _minReceiveAmount
    ) external returns (uint256 mTokenAmount) {
        return _deposit(_depositor, _paymentTokenAmount, _minReceiveAmount);
    }

    function redeemAndSendPublic(
        bytes32 _redeemer,
        uint256 _mTokenAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) external {
        _redeemAndSend(_redeemer, _mTokenAmount, _sendParam, _refundAddress);
    }

    function redeemPublic(
        bytes32 _redeemer,
        uint256 _mTokenAmount,
        uint256 _minReceiveAmount
    ) external virtual returns (uint256 paymentTokenAmount) {
        return _redeem(_redeemer, _mTokenAmount, _minReceiveAmount);
    }

    function balanceOfThisPublic(address token)
        external
        view
        returns (uint256)
    {
        return _balanceOfThis(token);
    }

    function previewDepositPublic(uint256 amountTokenIn)
        external
        view
        returns (uint256)
    {
        return _previewDeposit(amountTokenIn);
    }

    function previewRedeemPublic(uint256 amountMTokenIn)
        external
        view
        returns (uint256 amountTokenOut)
    {
        return _previewRedeem(amountMTokenIn);
    }

    function sendPublic(
        address _oft,
        SendParam memory _sendParam,
        address _refundAddress
    ) external payable {
        _send(_oft, _sendParam, _refundAddress);
    }
}

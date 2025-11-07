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
        bytes memory _extraOptions,
        SendParam memory _sendParam,
        address _refundAddress
    ) external {
        _depositAndSend(
            _depositor,
            _paymentTokenAmount,
            _extraOptions,
            _sendParam,
            _refundAddress
        );
    }

    function depositPublic(
        address _receiver,
        uint256 _paymentTokenAmount,
        uint256 _minReceiveAmount,
        bytes32 _referrerId
    ) external returns (uint256 mTokenAmount) {
        return
            _deposit(
                _receiver,
                _paymentTokenAmount,
                _minReceiveAmount,
                _referrerId
            );
    }

    function redeemAndSendPublic(
        bytes32 _redeemer,
        uint256 _mTokenAmount,
        bytes memory _extraOptions,
        SendParam memory _sendParam,
        address _refundAddress
    ) external {
        _redeemAndSend(
            _redeemer,
            _mTokenAmount,
            _extraOptions,
            _sendParam,
            _refundAddress
        );
    }

    function redeemPublic(
        address _receiver,
        uint256 _mTokenAmount,
        uint256 _minReceiveAmount
    ) external virtual returns (uint256 paymentTokenAmount) {
        return _redeem(_receiver, _mTokenAmount, _minReceiveAmount);
    }

    function parseExtraOptionsPublic(bytes memory _extraOptions)
        external
        pure
        returns (bytes32 referrerId)
    {
        return _parseDepositExtraOptions(_extraOptions);
    }

    function balanceOfPublic(address _token, address _of)
        external
        view
        returns (uint256)
    {
        return _balanceOf(_token, _of);
    }

    function sendOftPublic(
        address _oft,
        SendParam memory _sendParam,
        address _refundAddress
    ) external payable {
        _sendOft(_oft, _sendParam, _refundAddress);
    }
}

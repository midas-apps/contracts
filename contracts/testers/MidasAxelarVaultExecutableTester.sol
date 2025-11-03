// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "../misc/axelar/MidasAxelarVaultExecutable.sol";

contract MidasAxelarVaultExecutableTester is MidasAxelarVaultExecutable {
    constructor(
        address _depositVault,
        address _redemptionVault,
        bytes32 _paymentTokenId,
        bytes32 _mTokenId,
        address _interchainTokenService
    )
        MidasAxelarVaultExecutable(
            _depositVault,
            _redemptionVault,
            _paymentTokenId,
            _mTokenId,
            _interchainTokenService
        )
    {}

    function depositAndSendPublic(
        bytes memory _depositor,
        uint256 _paymentTokenAmount,
        bytes calldata _data
    ) external {
        _depositAndSend(_depositor, _paymentTokenAmount, _data);
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
        bytes memory _redeemer,
        uint256 _mTokenAmount,
        bytes calldata _data
    ) external {
        _redeemAndSend(_redeemer, _mTokenAmount, _data);
    }

    function redeemPublic(
        address _receiver,
        uint256 _mTokenAmount,
        uint256 _minReceiveAmount
    ) external virtual returns (uint256 paymentTokenAmount) {
        return _redeem(_receiver, _mTokenAmount, _minReceiveAmount);
    }

    function balanceOfPublic(
        address token,
        address _of
    ) external view returns (uint256) {
        return _balanceOf(token, _of);
    }

    function itsTransferPublic(
        string memory _destinationChain,
        bytes memory _destinationAddress,
        bytes32 _tokenId,
        uint256 _amount
    ) external payable {
        _itsTransfer(_destinationChain, _destinationAddress, _tokenId, _amount);
    }

    function bytesToAddressPublic(
        bytes memory _b
    ) external pure returns (address) {
        return _bytesToAddress(_b);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IERC20MintBurn is IERC20 {
    function mint(address to, uint256 amount) external;

    function burn(address from, uint256 amount) external;
}

contract AxelarInterchainTokenServiceMock {
    using SafeERC20 for IERC20;
    mapping(bytes32 => address) public registeredTokenAddresses;
    mapping(bytes32 => bool) public mintBurn;
    bool public shouldRevert;
    bytes32 public chainNameHash;

    function setChainNameHash(bytes32 _chainNameHash) external {
        chainNameHash = _chainNameHash;
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function registerToken(
        bytes32 tokenId,
        address tokenAddress,
        bool _mintBurn
    ) external {
        registeredTokenAddresses[tokenId] = tokenAddress;
        mintBurn[tokenId] = _mintBurn;
    }

    function interchainTransfer(
        bytes32 tokenId,
        string calldata /* destinationChain */,
        bytes calldata destinationAddressBytes,
        uint256 amount
    ) external payable {
        if (shouldRevert) {
            revert("interchainTransfer reverted");
        }
        address tokenAddress = registeredTokenAddresses[tokenId];
        if (tokenAddress == address(0)) {
            revert("token not registered");
        }
        address destinationAddress = address(
            uint160(bytes20(destinationAddressBytes))
        );
        if (mintBurn[tokenId]) {
            IERC20MintBurn(tokenAddress).burn(msg.sender, amount);
            IERC20MintBurn(tokenAddress).mint(destinationAddress, amount);
        } else {
            IERC20(tokenAddress).safeTransferFrom(
                msg.sender,
                destinationAddress,
                amount
            );
        }
    }

    function callContractWithInterchainToken(
        bytes32 tokenId,
        string calldata destinationChain,
        bytes calldata destinationAddress,
        uint256 amount,
        bytes calldata data
    ) external payable {}

    function registeredTokenAddress(
        bytes32 tokenId
    ) external view returns (address tokenAddress) {
        tokenAddress = registeredTokenAddresses[tokenId];
        require(tokenAddress != address(0), "token not registered");
    }
}

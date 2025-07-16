// solhint-disable
// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ustb/ISuperstateToken.sol";
import "hardhat/console.sol";

contract USTBMock is ERC20, ISuperstateToken {
    using SafeERC20 for IERC20;

    address private _allowListV2;

    mapping(address => ISuperstateToken.StablecoinConfig)
        private _stablecoinConfigs;

    mapping(address => bool) private _isAllowed;

    address public override owner;

    constructor() ERC20("USTB", "USTB") {
        owner = msg.sender;
    }

    function symbol()
        public
        view
        override(ERC20, ISuperstateToken)
        returns (string memory)
    {
        return ERC20.symbol();
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function subscribe(
        address to,
        uint256 inAmount,
        address stablecoin
    ) public {
        _subscribe(to, inAmount, stablecoin);
    }

    function subscribe(uint256 inAmount, address stablecoin) external {
        subscribe(msg.sender, inAmount, stablecoin);
    }

    function setStablecoinConfig(
        address stablecoin,
        address newSweepDestination,
        uint96 newFee
    ) external {
        _stablecoinConfigs[stablecoin] = ISuperstateToken.StablecoinConfig(
            newSweepDestination,
            newFee
        );
    }

    function setAllowListV2(address allowListV2_) external {
        _allowListV2 = allowListV2_;
    }

    function setIsAllowed(address addr, bool isAllowed_) external {
        _isAllowed[addr] = isAllowed_;
    }

    /**
     * @dev mints ustb 1:1 to inAmount
     */
    function _subscribe(
        address to,
        uint256 inAmount,
        address stablecoin
    ) internal {
        require(
            supportedStablecoins(stablecoin).sweepDestination != address(0),
            "USTB: unknown stablecoin"
        );
        IERC20(stablecoin).safeTransferFrom(
            msg.sender,
            address(this),
            inAmount
        );
        _mint(to, inAmount);
    }

    function supportedStablecoins(address stablecoin)
        public
        view
        returns (ISuperstateToken.StablecoinConfig memory)
    {
        return _stablecoinConfigs[stablecoin];
    }

    function allowListV2() external view returns (address) {
        return _allowListV2;
    }

    function isAllowed(address addr) external view returns (bool) {
        return _isAllowed[addr];
    }
}

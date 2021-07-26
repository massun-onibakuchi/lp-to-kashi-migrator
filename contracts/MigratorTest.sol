// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "./Migrator.sol";

contract MigratorTest is Migrator {
    constructor(address _factory, address _WETH) public Migrator(_factory, _WETH) {}

    /// @notice assuming caller approve this contract
    /// @dev Explain to a developer any extra details
    function redeemLpToken(IUniswapV2Pair pair) public {
        uint256 amount = pair.balanceOf(msg.sender);
        pair.transferFrom(msg.sender, address(this), amount);
        _redeemLpToken(pair, amount);
    }

    function cook(
        Kashi kashi0,
        Kashi kashi1,
        address asset0,
        address asset1,
        bytes calldata permitData
    ) public {
        return _cook(kashi0, kashi1, asset0, asset1, permitData);
    }
}

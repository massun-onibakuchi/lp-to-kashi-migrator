// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "./Migrator.sol";

contract MigratorTest is Migrator {
    constructor(address _factory, address _WETH) public Migrator(_factory, _WETH) {}

    function sort(address tokenA, address tokenB) public pure returns (address token0, address token1) {
        return _sort(tokenA, tokenB);
    }

    /// @notice assuming caller approve this contract
    /// @dev Explain to a developer any extra details
    function redeemLpToken(IUniswapV2Pair pool) public {
        return _redeemLpToken(pool);
    }

    function cook(
        Kashi kashi,
        address asset,
        bytes calldata permitData
    ) public {
        return _cook(kashi, asset, permitData);
    }
}

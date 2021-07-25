// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import { KashiPairMediumRiskV1 as Kashi, IERC20 } from "./bentobox/KashiPairMediumRiskV1.sol";

interface IMigrator {
    function migrateLpToKashi(
        address tokenA,
        address tokenB,
        Kashi kashiA,
        Kashi kashiB,
        bytes[2] calldata datas
    ) external;
}

contract Migrator is IMigrator {
    // Functions that need accrue to be called
    uint8 private constant ACTION_ADD_ASSET = 1;
    uint8 private constant ACTION_REPAY = 2;
    uint8 private constant ACTION_REMOVE_ASSET = 3;
    uint8 private constant ACTION_REMOVE_COLLATERAL = 4;
    uint8 private constant ACTION_BORROW = 5;
    uint8 private constant ACTION_GET_REPAY_SHARE = 6;
    uint8 private constant ACTION_GET_REPAY_PART = 7;
    uint8 private constant ACTION_ACCRUE = 8;

    // Functions that don't need accrue to be called
    uint8 private constant ACTION_ADD_COLLATERAL = 10;
    uint8 private constant ACTION_UPDATE_EXCHANGE_RATE = 11;

    // Function on BentoBox
    uint8 private constant ACTION_BENTO_DEPOSIT = 20;
    uint8 private constant ACTION_BENTO_WITHDRAW = 21;
    uint8 private constant ACTION_BENTO_TRANSFER = 22;
    uint8 private constant ACTION_BENTO_TRANSFER_MULTIPLE = 23;
    uint8 private constant ACTION_BENTO_SETAPPROVAL = 24;

    address public immutable factory;
    address public immutable WETH;

    constructor(address _factory, address _WETH) public {
        factory = _factory;
        WETH = _WETH;
    }

    function migrateLpToKashi(
        address tokenA,
        address tokenB,
        Kashi kashi0,
        Kashi kashi1,
        bytes[2] calldata datas
    ) public override {
        address pair = IUniswapV2Factory(factory).getPair(tokenA, tokenB);
        require(pair != address(0));

        if (tokenA == WETH) {
            tokenA = address(0);
        } else if (tokenB == WETH) {
            tokenB = address(0);
        }
        address asset0 = address(kashi0.asset());
        address asset1 = address(kashi1.asset());
        _validateInput(tokenA, tokenB, asset0, asset1);
        (address token0, address token1) = asset0 == tokenA ? (tokenA, tokenB) : (tokenB, tokenA);

        _redeemLpToken(IUniswapV2Pair(pair));
        _cook(kashi0, token0, datas[0]);
        _cook(kashi1, token1, datas[1]);
    }

    function _validateInput(
        address tokenA,
        address tokenB,
        address assetA,
        address assetB
    ) internal pure {
        require((assetA == tokenA && assetB == tokenB) || (assetA == tokenB && assetB == tokenA), "ASSET_ADDRESS");
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
    }

    function _sort(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }

    /// @notice assuming caller approve this contract
    /// @dev Explain to a developer any extra details
    function _redeemLpToken(IUniswapV2Pair pair) internal {
        pair.transferFrom(msg.sender, address(this), pair.balanceOf(msg.sender));
        pair.burn(address(this));
    }

    function _cook(
        Kashi kashi,
        address asset,
        bytes memory permitData
    ) internal {
        // cook: params
        // * uint8[] calldata actions,
        // * uint256[] calldata values,
        // * bytes[] calldata datas
        uint256[] memory values;
        uint8[] memory actions;
        bytes[] memory datas;
        actions[0] = ACTION_BENTO_SETAPPROVAL;
        actions[1] = ACTION_BENTO_DEPOSIT;
        actions[2] = ACTION_ADD_ASSET;

        (uint256 value, uint256 amount, uint256 share) = _makeData(kashi, asset);
        
        values[2] = value;
        datas[0] = permitData;
        datas[1] = abi.encodePacked(asset, msg.sender, msg.sender, amount, uint256(0));
        datas[2] = abi.encodePacked(share, msg.sender, false);
        
        kashi.cook{ value: amount }(actions, values, datas);
    }

    function _makeData(Kashi kashi, address asset)
        internal
        view
        returns (
            uint256 value,
            uint256 amount,
            uint256 share
        )
    {
        if (asset == address(0)) {
            value = address(this).balance;
            share = kashi.bentoBox().toShare(IERC20(0), amount, true);
        } else {
            amount = IERC20(asset).balanceOf(address(this));
            share = kashi.bentoBox().toShare(IERC20(asset), amount, true);
        }
    }

    receive() external payable {}
}

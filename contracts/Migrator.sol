// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import { KashiPairMediumRiskV1 as Kashi, IERC20 } from "./bentobox/KashiPairMediumRiskV1.sol";

contract Migrator {
    using SafeMath for uint256;

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
        bytes calldata permitData
    ) public {
        address pair = IUniswapV2Factory(factory).getPair(tokenA, tokenB);
        require(pair != address(0));
        IUniswapV2Pair pool = IUniswapV2Pair(pair);

        if (tokenA == WETH) {
            tokenA = address(0);
        } else if (tokenB == WETH) {
            tokenB = address(0);
        }
        // below here WETH == address(0)
        address asset0 = address(kashi0.asset());
        address asset1 = address(kashi1.asset());
        _validateInput(tokenA, tokenB, asset0, asset1);

        (address token0, address token1) = asset0 == tokenA ? (tokenA, tokenB) : (tokenB, tokenA);

        uint256 amount = pool.balanceOf(msg.sender);
        pool.transferFrom(msg.sender, address(this), amount);
        _redeemLpToken(pool, amount);
        _cook(kashi0, kashi1, token0, token1, permitData);
    }

    function _validateInput(
        address tokenA,
        address tokenB,
        address assetA,
        address assetB
    ) internal pure {
        require((assetA == tokenA && assetB == tokenB) || (assetA == tokenB && assetB == tokenA), "asset-address");
        require(tokenA != tokenB, "identical-address");
    }

    /// @notice assuming caller approve this contract
    /// @dev Explain to a developer any extra details
    /// assuming Lp token is transfered to this contract
    function _redeemLpToken(IUniswapV2Pair pair, uint256 amount) internal {
        pair.transfer(address(pair), amount);
        pair.burn(address(this));
    }

    function _cook(
        Kashi kashi0,
        Kashi kashi1,
        address asset0,
        address asset1,
        bytes memory permitData
    ) internal {
        // cook: params
        // * uint8[] calldata actions,
        // * uint256[] calldata values,
        // * bytes[] calldata datas
        (, , bool approved, , , ) = abi.decode(permitData, (address, address, bool, uint8, bytes32, bytes32));
        require(approved, "approved-should-be-true");

        uint256[] memory values = new uint256[](5);
        uint8[] memory actions = new uint8[](5);
        bytes[] memory datas = new bytes[](5); 

        actions[0] = ACTION_BENTO_SETAPPROVAL;
        actions[1] = ACTION_BENTO_DEPOSIT;
        actions[2] = ACTION_ADD_ASSET;
        actions[3] = ACTION_BENTO_DEPOSIT;
        actions[4] = ACTION_ADD_ASSET;

        (uint256 value0, uint256 amount0, uint256 share0) = _getDepositData(kashi0, asset0);
        (uint256 value1, uint256 amount1, uint256 share1) = _getDepositData(kashi1, asset1);

        values[1] = value0;
        values[3] = value1;

        datas[0] = permitData;
        datas[1] = abi.encodePacked(asset0, msg.sender, msg.sender, amount0, uint256(0));
        datas[2] = abi.encodePacked(share0, msg.sender, true);
        datas[3] = abi.encodePacked(asset1, msg.sender, msg.sender, amount1, uint256(0));
        datas[4] = abi.encodePacked(share1, msg.sender, true);

        kashi0.cook{ value: value0.add(value1) }(actions, values, datas);
    }

    function _getDepositData(Kashi kashi, address asset)
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

import hre, { ethers } from "hardhat";
import { expect, use } from "chai";
import { IERC20, MigraterTest, IUniswapV2Pair, KashiPairMediumRiskV1 } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

use(require("chai-bignumber")());

const toWei = ethers.utils.parseEther;
const overrides = { gasLimit: 9500000 };
const amount = toWei("100");

// get contract ABI via Etherscan API
const getVerifiedContractAt = async (address: string) => {
    // @ts-ignore
    return hre.ethers.getVerifiedContractAt(address);
};

describe("Migrator", async function () {
    const BENTO_BOX_ADDR = "";
    // Kashi Medium Risk Wrapped Ether/USD Coin-Chainlink
    const KASHI_PAIR0_ADDR = "0xda2333ae1a3e817bc8fbb1dfd6716e449b606250";
    // Kashi Medium Risk Wrapped Ether/Tether USD-Chainlik
    const KASHI_PAIR1_ADDR = "0xff7d29c7277d8a8850c473f0b71d7e5c4af45a50";
    const UNI_V2_FACTORY = "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f";
    const UNI_V2_USDC_WETH = "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc";
    const UNI_V2_USDC_USDT = "0x3041cbd36888becc7bbcbc0045e3b1f144466f5f";

    const SIGNER_ADDR = "0x0b6971e7d1edf1dfe4d501151d59a1f7ee30651e";
    const signer = ethers.provider.getSigner(SIGNER_ADDR);

    let wallet: SignerWithAddress;
    let other: SignerWithAddress;

    let weth: IERC20;
    let token0: IERC20;
    let token1: IERC20;
    let migrater: MigraterTest;
    let pair: IUniswapV2Pair;
    let kashi0: KashiPairMediumRiskV1;
    let kashi1: KashiPairMediumRiskV1;
    let Migrater;
    before(async function () {
        [wallet, other] = await ethers.getSigners();
        Migrater = await ethers.getContractFactory("MigraterTest");
    });
    beforeEach(async function () {
        migrater = (await Migrater.deploy(
            UNI_V2_FACTORY,
            "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
        )) as MigraterTest;
        weth = await getVerifiedContractAt("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        pair = await getVerifiedContractAt(UNI_V2_USDC_USDT);
        kashi0 = await getVerifiedContractAt(KASHI_PAIR0_ADDR);
        kashi1 = await getVerifiedContractAt(KASHI_PAIR1_ADDR);

        await wallet.sendTransaction({ to: SIGNER_ADDR, value: toWei("1") }); // get some eth from a wallet
        await ethers.provider.send("hardhat_impersonateAccount", [SIGNER_ADDR]);

        await pair.connect(signer).transfer(wallet.address, await pair.balanceOf(SIGNER_ADDR));

        await ethers.provider.send("hardhat_stopImpersonatingAccount", [SIGNER_ADDR]);
    });
    // afterEach(async () => {
    //     await hre.network.provider.request({
    //         method: "hardhat_reset",
    //         params: [
    //             {
    //                 forking: {
    //                     jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
    //                     blockNumber: parseInt(process.env.BLOCK_NUMBER),
    //                 },
    //             },
    //         ],
    //     });
    // });

    it("migrateLpToKashi", async function () {});
});

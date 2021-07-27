import hre, { waffle, ethers } from "hardhat";
import { expect, use } from "chai";
import { defaultAbiCoder, keccak256, recoverAddress, toUtf8Bytes } from "ethers/lib/utils";
import { getBentoBoxApproveDigest, signMasterContractApproval } from "./signature";
import { Wallet } from "ethers";
import { IERC20, MigratorTest, IUniswapV2Pair, KashiPairMediumRiskV1 } from "../typechain";

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
    const BENTO_BOX_ADDR = "0xF5BCE5077908a1b7370B9ae04AdC565EBd643966";
    // Kashi Medium Risk Wrapped BTC/USD Coin-Chainlink
    const KASHI_PAIR0_ADDR = "0x668edab8A38A962D30602d6Fa7CA489484eE3224";
    // Kashi Medium Risk Wrapped Ether/Tether USD-Chainlik
    const KASHI_PAIR1_ADDR = "0xff7d29c7277d8a8850c473f0b71d7e5c4af45a50";

    const UNI_V2_FACTORY = "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f";
    const UNI_V2_USDC_WETH = "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc";
    const UNI_V2_USDC_USDT = "0x3041cbd36888becc7bbcbc0045e3b1f144466f5f";

    const SIGNER_ADDR = "0x0b6971e7d1edf1dfe4d501151d59a1f7ee30651e";
    const signer = ethers.provider.getSigner(SIGNER_ADDR);

    let wallet: Wallet;
    let other: Wallet;

    let weth: IERC20;
    let token0: IERC20;
    let token1: IERC20;
    let migrator: MigratorTest;
    let pair: IUniswapV2Pair;
    let kashi0: KashiPairMediumRiskV1;
    let kashi1: KashiPairMediumRiskV1;
    let bentoBox;
    let Migrator;
    let chainId;
    before(async function () {
        // ({ chainId } = await ethers.provider.getNetwork());
        // [wallet, other] = await ethers.getSigners();
        [wallet, other] = waffle.provider.getWallets();
        Migrator = await ethers.getContractFactory("MigratorTest");
    });
    beforeEach(async function () {
        migrator = (await Migrator.deploy(
            UNI_V2_FACTORY,
            "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
        )) as MigratorTest;
        weth = await getVerifiedContractAt("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        pair = await getVerifiedContractAt(UNI_V2_USDC_USDT);
        kashi0 = await getVerifiedContractAt(KASHI_PAIR0_ADDR);
        kashi1 = await getVerifiedContractAt(KASHI_PAIR1_ADDR);
        bentoBox = await getVerifiedContractAt(BENTO_BOX_ADDR);

        await wallet.sendTransaction({ to: SIGNER_ADDR, value: toWei("1") }); // get some eth from a wallet
        await ethers.provider.send("hardhat_impersonateAccount", [SIGNER_ADDR]);

        await pair.connect(signer).transfer(wallet.address, await pair.balanceOf(SIGNER_ADDR));

        await ethers.provider.send("hardhat_stopImpersonatingAccount", [SIGNER_ADDR]);
    });
    afterEach(async () => {
        await hre.network.provider.request({
            method: "hardhat_reset",
            params: [
                {
                    forking: {
                        jsonRpcUrl: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
                        blockNumber: parseInt(process.env.BLOCK_NUMBER),
                    },
                },
            ],
        });
    });

    it("redeemLpToken", async function () {
        await pair.connect(wallet).approve(migrator.address, await pair.balanceOf(wallet.address));
        await migrator.redeemLpToken(pair.address);
        expect(await pair.balanceOf(wallet.address)).to.equal(0);
    });

    it("setMasterContractApproval", async function () {
        const nonce = 0;
        const approved = true;
        const masterContract = await bentoBox.masterContractOf(kashi0.address);
        expect(await bentoBox.masterContractOf(kashi1.address)).to.eq(masterContract);
        expect(await bentoBox.nonces(wallet.address)).to.eq(nonce);
        const { v, r, s } = await signMasterContractApproval(
            // keccak256(toUtf8Bytes("BentoBox V1")),
            "BentoBox V1",
            1,
            masterContract,
            wallet.address,
            approved,
            wallet,
            nonce,
        );
        const digest = getBentoBoxApproveDigest("BentoBox V1", masterContract, 1, approved, wallet.address, nonce);
        expect(recoverAddress(digest, { v, r, s })).to.eq(wallet.address);
    });
    // it("setMasterContractApproval", async function () {
    //     const nonce = 0;
    //     const approved = true;
    //     const masterContract = await bentoBox.masterContractOf(kashi0.address);
    //     expect(await bentoBox.masterContractOf(kashi1.address)).to.eq(masterContract);
    //     expect(await bentoBox.nonces(wallet.address)).to.eq(nonce);
    //     const { v, r, s } = await signMasterContractApproval(
    //         keccak256(toUtf8Bytes("BentoBox V1")),
    //         // "BentoBox V1",
    //         1,
    //         masterContract,
    //         wallet.address,
    //         approved,
    //         wallet,
    //         nonce,
    //     );
    //     expect(await bentoBox.setMasterContractApproval(wallet.address, masterContract, approved, v, r, s));
    // });

    // it("cook", async function () {
    //     const getPermitData = (user: string, masterContract: string, approved: boolean, v, r, s) => {
    //         return defaultAbiCoder.encode(
    //             ["address", "address", "bool", "uint8", "bytes32", "bytes32"],
    //             [user, masterContract, approved, v, r, s],
    //         );
    //     };
    //     const nonce = 0;
    //     expect(await bentoBox.nonces(wallet.address)).to.eq(nonce);
    //     const { v, r, s } = await signMasterContractApproval(
    //         keccak256(toUtf8Bytes("BentoBox V1")),
    //         // "BentoBox V1",
    //         chainId || 1,
    //         bentoBox.address,
    //         wallet.address,
    //         true,
    //         wallet,
    //         nonce,
    //     );
    //     const permitData = getPermitData(wallet.address, bentoBox.address, true, v, r, s);
    //     await pair.connect(wallet).approve(migrator.address, await pair.balanceOf(wallet.address));
    //     await migrator.cook(kashi0.address, kashi1.address, await kashi0.asset(), await kashi1.asset(), permitData);
    // });
});

import { keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack, splitSignature, BytesLike } from "ethers/lib/utils";
import { Wallet } from "ethers";

export const EIP712_DOMAIN_TYPEHASH = keccak256(
    toUtf8Bytes("EIP712Domain(string name,uint256 chainId,address verifyingContract)"),
);

export const MASTER_CONTRACT_APPROVAL_TYPE = [
    { name: "warning", type: "string" },
    { name: "user", type: "address" },
    { name: "masterContract", type: "address" },
    { name: "approved", type: "bool" },
    { name: "nonce", type: "uint256" },
];

export const APPROVAL_SIGNATURE_HASH = keccak256(
    toUtf8Bytes(
        "SetMasterContractApproval(string warning,address user,address masterContract,bool approved,uint256 nonce)",
    ),
);

export function getDomainSeparator(name: string, contractAddress: string, chainId: number) {
    return keccak256(
        defaultAbiCoder.encode(
            ["bytes32", "bytes32", "uint256", "address"],
            [EIP712_DOMAIN_TYPEHASH, keccak256(toUtf8Bytes(name)), chainId, contractAddress],
        ),
    );
}

const WARNING_FULLL_ACCESS = "Give FULL access to funds in (and approved to) BentoBox?";
const WARNING_REVOKE_ACCESS = "Revoke access to BentoBox?";

export function getBentoBoxApproveDigest(
    name: string,
    masterContract: string,
    chainId: number,
    approved: boolean,
    user: string,
    nonce: number,
) {
    const warning = approved
        ? keccak256(toUtf8Bytes(WARNING_FULLL_ACCESS))
        : keccak256(toUtf8Bytes(WARNING_REVOKE_ACCESS));
    const DOMAIN_SEPARATOR = getDomainSeparator(name, masterContract, chainId);
    const masterContractApprovalHash = keccak256(
        defaultAbiCoder.encode(
            ["bytes32", "bytes32", "address", "address", "bool", "uint256"],
            [APPROVAL_SIGNATURE_HASH, warning, user, masterContract, approved, nonce],
        ),
    );
    const hash = keccak256(
        solidityPack(
            ["bytes1", "bytes1", "bytes32", "bytes32"],
            ["0x19", "0x01", DOMAIN_SEPARATOR, masterContractApprovalHash],
        ),
    );
    return hash;
}

export const signMasterContractApproval = async (
    name: string,
    chainId: number,
    verifyingContract: string,
    user: string,
    approved: boolean,
    signer: Wallet,
    nonce: number,
) => {
    const warning = approved ? WARNING_FULLL_ACCESS : WARNING_REVOKE_ACCESS;
    const masterContract = verifyingContract;
    const domain = {
        name,
        chainId,
        verifyingContract,
    };
    const types = { SetMasterContractApproval: MASTER_CONTRACT_APPROVAL_TYPE };
    const data = {
        warning,
        user,
        masterContract,
        approved,
        nonce,
    };

    const signature = await signer._signTypedData(domain, types, data);

    return splitSignature(signature);
};

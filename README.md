# Lp-token-to-kashi-migrator
The `Migrator` contract in this repository migrates the LP token of UniswapV2 (Sushiswap) to Kashi of sushiswap.

## Concept
Among DeFi, the sushiswap ecosystem and development is expanding rapidly. Kashi is a relatively recent product of sushiswap, which features an elastic interest model and Isolated lending pairs. Also,Kashi has an abundance of lending pairs and allows you to freely choose your risk.

Liquidity providing  in Dex involves impermanent loss. However, since kashi is a lending financial service, there is no need to worry about impermanent loss. The concept of this repository is to burn LP tokens and instead create a gateway to lend each of the tokens that make up an Lp token to Kashi.

## Link
[Sushiswap: BentoBox Overview](https://dev.sushi.com/bentobox/bentobox-overview)
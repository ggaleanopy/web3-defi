import { Contract } from "ethers";
import {
  EXCHANGE_CONTRACT_ABI,
  EXCHANGE_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";

/*
    getAmountOfTokensReceivedFromSwap:  Returns the number of Eth/WorldCupBallsCoin tokens that can be received 
    when the user swaps `_swapAmountWEI` amount of Eth/CWorldCupBallsCoin tokens.
*/
export const getAmountOfTokensReceivedFromSwap = async (
  _swapAmountWei,
  provider,
  ethSelected,
  ethBalance,
  reservedWCBC
) => {
  // Create a new instance of the exchange contract
  const exchangeContract = new Contract(
    EXCHANGE_CONTRACT_ADDRESS,
    EXCHANGE_CONTRACT_ABI,
    provider
  );
  let amountOfTokens;
  // If ETH is selected this means our input value is `Eth` which means our input amount would be
  // `_swapAmountWei`, the input reserve would be the `ethBalance` of the contract and output reserve
  // would be the  `WorldCupBallsCoin token` reserve
  if (ethSelected) {
    amountOfTokens = await exchangeContract.getAmountOfTokens(
      _swapAmountWei,
      ethBalance,
      reservedWCBC
    );
  } else {
    // If ETH is not selected this means our input value is `WorldCupBallsCoin` tokens which means our input amount would be
    // `_swapAmountWei`, the input reserve would be the `WorldCupBallsCoin token` reserve of the contract and output reserve
    // would be the `ethBalance`
    amountOfTokens = await exchangeContract.getAmountOfTokens(
      _swapAmountWei,
      reservedWCBC,
      ethBalance
    );
  }

  return amountOfTokens;
};

/*
  swapTokens: Swaps  `swapAmountWei` of Eth/WorldCupBallsCoin tokens with `tokenToBeRecievedAfterSwap` amount of Eth/WorldCupBallsCoin tokens.
*/
export const swapTokens = async (
  signer,
  swapAmountWei,
  tokenToBeRecievedAfterSwap,
  ethSelected
) => {
  // Create a new instance of the exchange contract
  const exchangeContract = new Contract(
    EXCHANGE_CONTRACT_ADDRESS,
    EXCHANGE_CONTRACT_ABI,
    signer
  );
  const tokenContract = new Contract(
    TOKEN_CONTRACT_ADDRESS,
    TOKEN_CONTRACT_ABI,
    signer
  );
  let tx;
  // If Eth is selected call the `ethToWorldCupBallsCoinToken` function else
  // call the `worldCupBallsCoinTokenToEth` function from the contract
  // As you can see you need to pass the `swapAmount` as a value to the function because
  // It is the ether we are paying to the contract, instead of a value we are passing to the function
  if (ethSelected) {
    tx = await exchangeContract.ethToWorldCupBallsCoinToken(
      tokenToBeRecievedAfterSwap,
      {
        value: swapAmountWei,
      }
    );
  } else {
    // User has to approve `swapAmountWei` for the contract because `Crypto Dev Token`
    // is an ERC20
    tx = await tokenContract.approve(
      EXCHANGE_CONTRACT_ADDRESS,
      swapAmountWei.toString()
    );
    await tx.wait();
    // call cryptoDebTokenToEth function which would take in `swapAmounWei` of crypto dev tokens and would send back `tokenToBeRecievedAfterSwap` amount of ether to the user
    tx = await exchangeContract.worldCupBallsCoinTokenToEth(
      swapAmountWei,
      tokenToBeRecievedAfterSwap
    );
  }
  await tx.wait();
};
import { Contract, utils } from "ethers";
import {
  EXCHANGE_CONTRACT_ABI,
  EXCHANGE_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";

/**
 * addLiquidity helps add liquidity to the exchange,
 * If the user is adding initial liquidity, user decides the ether and WCBC tokens he wants to add
 * to the exchange. If we he adding the liquidity after the initial liquidity has already been added
 * then we calculate the WorldCupBallsCoin tokens he can add, given the eth he wants to add by keeping the ratios
 * constant
 */
export const addLiquidity = async (
  signer,
  addWCBCAmountWei,
  addEtherAmountWei
) => {
  try {
    // create a new instance of the token contract
    const tokenContract = new Contract(
      TOKEN_CONTRACT_ADDRESS,
      TOKEN_CONTRACT_ABI,
      signer
    );
    // create a new instance of the exchange contract
    const exchangeContract = new Contract(
      EXCHANGE_CONTRACT_ADDRESS,
      EXCHANGE_CONTRACT_ABI,
      signer
    );
    // Because WCBC tokens are an ERC20, user would need to give the contract allowance
    // to take the required number WCBC tokens out of his contract
    let tx = await tokenContract.approve(
      EXCHANGE_CONTRACT_ADDRESS,
      addWCBCAmountWei.toString()
    );
    await tx.wait();
    // After the contract has the approval, add the ether and WCBC tokens in the liquidity
    tx = await exchangeContract.addLiquidity(addWCBCAmountWei, {
      value: addEtherAmountWei,
    });
    await tx.wait();
  } catch (err) {
    console.error(err);
  }
};

/**
 * calculateWCBC calculates the WCBC tokens that need to be added to the liquidity
 * given `_addEtherAmountWei` amount of ether
 */
export const calculateWCBC = async (
  _addEther = "0",
  etherBalanceContract,
  wCBCTokenReserve
) => {
  // `_addEther` is a string, we need to convert it to a Bignumber before we can do our calculations
  // We do that using the `parseEther` function from `ethers.js`
  const _addEtherAmountWei = utils.parseEther(_addEther);
  // Ratio needs to be maintained when we add liquiidty.
  // We need to let the user know who a specific amount of ether how many `WCBC` tokens
  // he can add so that the price impact is not large
  // The ratio we follow is (Amount of WorldCupBallsCoin tokens to be added)/(WorldCupBallsCoin tokens balance) = (Ether that would be added)/ (Eth reseve in the contract)
  // So by maths we get (Amount of WorldCupBallsCoin tokens to be added) = (Ether that would be added*WorldCupBallsCoin tokens balance)/ (Eth reseve in the contract)
  const worldCupBallCoinsTokenAmount = _addEtherAmountWei
    .mul(wCBCTokenReserve)
    .div(etherBalanceContract);
  return worldCupBallCoinsTokenAmount;
};
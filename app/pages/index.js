import { BigNumber, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import styles from "../styles/Home.module.css";
import { addLiquidity, calculateWCBC } from "../utils/addLiquidity";
import {
  getWCBCTokensBalance,
  getEtherBalance,
  getLPTokensBalance,
  getReserveOfWCBCTokens,
} from "../utils/getAmounts";
import {
  getTokensAfterRemove,
  removeLiquidity,
} from "../utils/removeLiquidity";
import { swapTokens, getAmountOfTokensReceivedFromSwap } from "../utils/swap";

export default function Home() {
  /** General state variables */
  // loading is set to true when the transaction is mining and set to false when the transaction has mined
  const [loading, setLoading] = useState(false);
  // We have two tabs in this dapp, Liquidity Tab and Swap Tab. This variable keeps track of which Tab the user is on
  // If it is set to true this means that the user is on `liquidity` tab else he is on `swap` tab
  const [liquidityTab, setLiquidityTab] = useState(true);
  // This variable is the `0` number in form of a BigNumber
  const zero = BigNumber.from(0);
  /** Variables to keep track of amount */
  // `ethBalance` keeps track of the amount of Eth held by the user's account
  const [ethBalance, setEtherBalance] = useState(zero);
  // `reservedWCBC` keeps track of the WorldCupBallsCoin tokens Reserve balance in the Exchange contract
  const [reservedWCBC, setReservedWCBC] = useState(zero);
  // Keeps track of the ether balance in the contract
  const [etherBalanceContract, setEtherBalanceContract] = useState(zero);
  // wCBCBalance is the amount of `WCBC` tokens help by the users account
  const [wCBCBalance, setWCBCBalance] = useState(zero);
  // `lpBalance` is the amount of LP tokens held by the users account
  const [lpBalance, setLPBalance] = useState(zero);
  /** Variables to keep track of liquidity to be added or removed */
  // addEther is the amount of Ether that the user wants to add to the liquidity
  const [addEther, setAddEther] = useState(zero);
  // addWCBCTokens keeps track of the amount of WCBC tokens that the user wants to add to the liquidity
  // in case when there is no initial liquidity and after liquidity gets added it keeps track of the
  // WCBC tokens that the user can add given a certain amount of ether
  const [addWCBCTokens, setAddWCBCTokens] = useState(zero);
  // removeEther is the amount of `Ether` that would be sent back to the user based on a certain number of `LP` tokens
  const [removeEther, setRemoveEther] = useState(zero);
  // removeWCBC is the amount of `WorldCupBallsCoin` tokens that would be sent back to the user base on a certain number of `LP` tokens
  // that he wants to withdraw
  const [removeWCBC, setRemoveWCBC] = useState(zero);
  // amount of LP tokens that the user wants to remove from liquidity
  const [removeLPTokens, setRemoveLPTokens] = useState("0");
  /** Variables to keep track of swap functionality */
  // Amount that the user wants to swap
  const [swapAmount, setSwapAmount] = useState("");
  // This keeps track of the number of tokens that the user would recieve after a swap completes
  const [tokenToBeRecievedAfterSwap, setTokenToBeRecievedAfterSwap] =
    useState(zero);
  // Keeps track of whether  `Eth` or `WorldCupBallsCoin` token is selected. If `Eth` is selected it means that the user
  // wants to swap some `Eth` for some `WorldCupBallsCoin` tokens and vice versa if `Eth` is not selected
  const [ethSelected, setEthSelected] = useState(true);
  /** Wallet connection */
  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();
  // walletConnected keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);

  /**
   * getAmounts call various functions to retrive amounts for ethbalance,
   * LP tokens etc
   */
  const getAmounts = async () => {
    try {
      const provider = await getProviderOrSigner(false);
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();
      // get the amount of eth in the user's account
      const _ethBalance = await getEtherBalance(provider, address);
      // get the amount of `WorldCupBallsCoin` tokens held by the user
      const _wCBCBalance = await getWCBCTokensBalance(provider, address);
      // get the amount of `WorldCupBallsCoin` LP tokens held by the user
      const _lpBalance = await getLPTokensBalance(provider, address);
      // gets the amount of `WCBC` tokens that are present in the reserve of the `Exchange contract`
      const _reservedWCBC = await getReserveOfWCBCTokens(provider);
      // Get the ether reserves in the contract
      const _ethBalanceContract = await getEtherBalance(provider, null, true);
      setEtherBalance(_ethBalance);
      setWCBCBalance(_wCBCBalance);
      setLPBalance(_lpBalance);
      setReservedWCBC(_reservedWCBC);
      setReservedWCBC(_reservedWCBC);
      setEtherBalanceContract(_ethBalanceContract);
    } catch (err) {
      console.error(err);
    }
  };

  /**** SWAP FUNCTIONS ****/

  /*
  swapTokens: Swaps  `swapAmountWei` of Eth/WorldCupBallsCoin tokens with `tokenToBeRecievedAfterSwap` amount of Eth/WorldCupBallsCoin tokens.
*/
  const _swapTokens = async () => {
    try {
      // Convert the amount entered by the user to a BigNumber using the `parseEther` library from `ethers.js`
      const swapAmountWei = utils.parseEther(swapAmount);
      // Check if the user entered zero
      // We are here using the `eq` method from BigNumber class in `ethers.js`
      if (!swapAmountWei.eq(zero)) {
        const signer = await getProviderOrSigner(true);
        setLoading(true);
        // Call the swapTokens function from the `utils` folder
        await swapTokens(
          signer,
          swapAmountWei,
          tokenToBeRecievedAfterSwap,
          ethSelected
        );
        setLoading(false);
        // Get all the updated amounts after the swap
        await getAmounts();
        setSwapAmount("");
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setSwapAmount("");
    }
  };

  /*
    _getAmountOfTokensReceivedFromSwap:  Returns the number of Eth/WorldCupBallsCoin tokens that can be recieved 
    when the user swaps `_swapAmountWEI` amount of Eth/WorldCupBallsCoin tokens.
 */
  const _getAmountOfTokensReceivedFromSwap = async (_swapAmount) => {
    try {
      // Convert the amount entered by the user to a BigNumber using the `parseEther` library from `ethers.js`
      const _swapAmountWEI = utils.parseEther(_swapAmount.toString());
      // Check if the user entered zero
      // We are here using the `eq` method from BigNumber class in `ethers.js`
      if (!_swapAmountWEI.eq(zero)) {
        const provider = await getProviderOrSigner();
        // Get the amount of ether in the contract
        const _ethBalance = await getEtherBalance(provider, null, true);
        // Call the `getAmountOfTokensReceivedFromSwap` from the utils folder
        const amountOfTokens = await getAmountOfTokensReceivedFromSwap(
          _swapAmountWEI,
          provider,
          ethSelected,
          _ethBalance,
          reservedWCBC
        );
        setTokenToBeRecievedAfterSwap(amountOfTokens);
      } else {
        setTokenToBeRecievedAfterSwap(zero);
      }
    } catch (err) {
      console.error(err);
    }
  };

  /*** END ***/

  /**** ADD LIQUIDITY FUNCTIONS ****/

  /**
   * _addLiquidity helps add liquidity to the exchange,
   * If the user is adding initial liquidity, user decides the ether and WCBC tokens he wants to add
   * to the exchange. If we he adding the liquidity after the initial liquidity has already been added
   * then we calculate the WorldCupBallsCoin tokens he can add, given the eth he wants to add by keeping the ratios
   * constant
   */
  const _addLiquidity = async () => {
    try {
      // Convert the ether amount entered by the user to Bignumber
      const addEtherWei = utils.parseEther(addEther.toString());
      // Check if the values are zero
      if (!addWCBCTokens.eq(zero) && !addEtherWei.eq(zero)) {
        const signer = await getProviderOrSigner(true);
        setLoading(true);
        // call the addLiquidity function from the utils folder
        await addLiquidity(signer, addWCBCTokens, addEtherWei);
        setLoading(false);
        // Reinitialize the WCBC tokens
        setAddWCBCTokens(zero);
        // Get amounts for all values after the liquidity has been added
        await getAmounts();
      } else {
        setAddWCBCTokens(zero);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setAddWCBCTokens(zero);
    }
  };

  /**** END ****/

  /**** REMOVE LIQUIDITY FUNCTIONS ****/

  /**
   * _removeLiquidity: Removes the `removeLPTokensWei` amount of LP tokens from
   * liquidity and also the calculated amount of `ether` and `WCBC` tokens
   */
  const _removeLiquidity = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      // Convert the LP tokens entered by the user to a BigNumber
      const removeLPTokensWei = utils.parseEther(removeLPTokens);
      setLoading(true);
      // Call the removeLiquidity function from the `utils` folder
      await removeLiquidity(signer, removeLPTokensWei);
      setLoading(false);
      await getAmounts();
      setRemoveWCBC(zero);
      setRemoveEther(zero);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setRemoveWCBC(zero);
      setRemoveEther(zero);
    }
  };

  /**
   * _getTokensAfterRemove: Calculates the amount of `Ether` and `WCBC` tokens
   * that would be returned back to user after he removes `removeLPTokenWei` amount
   * of LP tokens from the contract
   */
  const _getTokensAfterRemove = async (_removeLPTokens) => {
    try {
      const provider = await getProviderOrSigner();
      // Convert the LP tokens entered by the user to a BigNumber
      const removeLPTokenWei = utils.parseEther(_removeLPTokens);
      // Get the Eth reserves within the exchange contract
      const _ethBalance = await getEtherBalance(provider, null, true);
      // get the WorldCupBallsCoin token reserves from the contract
      const worldCupBallsCoinTokenReserve = await getReserveOfWCBCTokens(provider);
      // call the getTokensAfterRemove from the utils folder
      const { _removeEther, _removeWCBC } = await getTokensAfterRemove(
        provider,
        removeLPTokenWei,
        _ethBalance,
        worldCupBallsCoinTokenReserve
      );
      setRemoveEther(_removeEther);
      setRemoveWCBC(_removeWCBC);
    } catch (err) {
      console.error(err);
    }
  };

  /**** END ****/

  /*
      connectWallet: Connects the MetaMask wallet
  */
  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // When used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Returns a Provider or Signer object representing the Ethereum RPC with or without the
   * signing capabilities of metamask attached
   *
   * A `Provider` is needed to interact with the blockchain - reading transactions, reading balances, reading state, etc.
   *
   * A `Signer` is a special type of Provider used in case a `write` transaction needs to be made to the blockchain, which involves the connected account
   * needing to make a digital signature to authorize the transaction being sent. Metamask exposes a Signer API to allow your website to
   * request signatures from the user using Signer functions.
   *
   * @param {*} needSigner - True if you need the signer, default false otherwise
   */
  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Goerli network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 5) {
      window.alert("Change the network to Goerli");
      throw new Error("Change network to Goerli");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  // useEffects are used to react to changes in state of the website
  // The array at the end of function call represents what state changes will trigger this effect
  // In this case, whenever the value of `walletConnected` changes - this effect will be called
  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getAmounts();
    }
  }, [walletConnected]);

  /*
      renderButton: Returns a button based on the state of the dapp
  */
  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wllet
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button_circle}>
          Connect your wallet
        </button>
      );
    }

    // If we are currently waiting for something, return a loading button
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    if (liquidityTab) {
      return (
        <div>
          <div className={styles.description}>
            You have:
            <br />
            {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
            {utils.formatEther(wCBCBalance)} WorldCupBallsCoin Tokens
            <br />
            {utils.formatEther(ethBalance)} Ether
            <br />
            {utils.formatEther(lpBalance)} WorldCupBallsCoin LP tokens
          </div>
          <div>
            {/* If reserved WCBC is zero, render the state for liquidity zero where we ask the user
            who much initial liquidity he wants to add else just render the state where liquidity is not zero and
            we calculate based on the `Eth` amount specified by the user how much `WCBC` tokens can be added */}
            {utils.parseEther(reservedWCBC.toString()).eq(zero) ? (
              <div className={styles.float_container}>
                  
                    <input
                      type="number"
                      placeholder="Amount of Ether"
                      onChange={(e) => setAddEther(e.target.value || "0")}
                      className={styles.input}
                    />
                
                <input
                  type="number"
                  placeholder="Amount of WorldCupBallsCoin tokens"
                  onChange={(e) =>
                    setAddWCBCTokens(
                      BigNumber.from(utils.parseEther(e.target.value || "0"))
                    )
                  }
                  className={styles.input}
                />
                <button className={styles.button2_circle} onClick={_addLiquidity}>
                  Add
                </button>
                
              </div>
            ) : (
              <div className={styles.float_container}>
                <div className={styles.float_child_left}>
                  <input
                    type="number"
                    placeholder="Amount of Ether"
                    onChange={async (e) => {
                      setAddEther(e.target.value || "0");
                      // calculate the number of WCBC tokens that
                      // can be added given  `e.target.value` amount of Eth
                      const _addWCBCTokens = await calculateWCBC(
                        e.target.value || "0",
                        etherBalanceContract,
                        reservedWCBC
                      );
                      setAddWCBCTokens(_addWCBCTokens);
                    }}
                    className={styles.input}
                  />
                  <div className={styles.inputDiv}>
                    {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
                    {`You will need ${utils.formatEther(addWCBCTokens)} WorldCupBallsCoin
                    Tokens`}
                  </div>
                </div>
                <div className={styles.float_child_right}>
                  <button className={styles.button2_circle} onClick={_addLiquidity}>
                    Add
                  </button>
                </div>
              </div>
            )}
            <div className={styles.float_container}>
                <div className={styles.float_child_left}>
                  <input
                    type="number"
                    placeholder="Amount of LP Tokens"
                    onChange={async (e) => {
                      setRemoveLPTokens(e.target.value || "0");
                      // Calculate the amount of Ether and WCBBC tokens that the user would recieve
                      // After he removes `e.target.value` amount of `LP` tokens
                      await _getTokensAfterRemove(e.target.value || "0");
                    }}
                    className={styles.input}
                  />
                  <div className={styles.inputDiv}>
                    {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
                    {`You will get ${utils.formatEther(removeWCBC)} WorldCupBallsCoin
                    Tokens and ${utils.formatEther(removeEther)} Eth`}
                  </div>
                </div>
                <div className={styles.float_child_right}>
                  <button className={styles.button2_circle} onClick={_removeLiquidity}>
                    Remove
                  </button>
                </div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div>
          <input
            type="number"
            placeholder="Amount"
            onChange={async (e) => {
              setSwapAmount(e.target.value || "");
              // Calculate the amount of tokens user would recieve after the swap
              await _getAmountOfTokensReceivedFromSwap(e.target.value || "0");
            }}
            className={styles.input}
            value={swapAmount}
          />
          <select
            className={styles.select}
            name="dropdown"
            id="dropdown"
            defaultValue={ethSelected ? "eth" : "worldCupBallsCoinToken"}
            onChange={async () => {
              setEthSelected(!ethSelected);
              console.log(ethSelected);
              
              // Initialize the values back to zero
              await _getAmountOfTokensReceivedFromSwap(0);
              setSwapAmount("");
            }}
          >
            <option value="eth">Ethereum</option>
            <option value="worldCupBallsCoinToken">WorldCupBallsCoin Token</option>
          </select>
          <br />
          <div className={styles.inputDiv}>
            {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
            {ethSelected
              ? `You will get ${utils.formatEther(
                  tokenToBeRecievedAfterSwap
                )} WorldCupBallsCoin Tokens`
              : `You will get ${utils.formatEther(
                  tokenToBeRecievedAfterSwap
                )} Eth`}
          </div>
          <button className={styles.button2_circle} onClick={_swapTokens}>
            Swap
          </button>
        </div>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>World Cup Balls - DeFi Exchange</title>
        <meta name="description" content="Exchange-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to WorldCupBallsCoin Exchange!</h1>
          <div className={styles.description}>
            Exchange Ethereum &#60;&#62; WorldCupBallsCoin Tokens
          </div>
          <div>
            <button
              className={styles.button_circle}
              onClick={() => {
                setLiquidityTab(!liquidityTab);
              }}
            >
              Liquidity
            </button>
            <button
              className={styles.button_circle}
              onClick={() => {
                setLiquidityTab(false);
              }}
            >
              Swap
            </button>
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="../wcb-logo.png" />
        </div>
      </div>

      <footer className={styles.footer}>&copy;&nbsp;{new Date().getFullYear()}&nbsp;-&nbsp;Powered&nbsp;by&nbsp; <a href="https://gustavogaleano.com" target="_blank" rel="noreferrer" className={styles.link}>Gustavo Galeano</a></footer>
    </div>
  );
}
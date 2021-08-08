import WalletConnectProvider from "@walletconnect/web3-provider";
import WalletLink from "walletlink";
import { useErrorBoundary } from "use-error-boundary";
import { Alert, Button, Modal, Divider, Space, Typography, Select, PageHeader, BackTop } from "antd";
import "antd/dist/antd.css";
import React, { useCallback, useEffect, useState } from "react";
import Web3Modal from "web3modal";
import { SubmitButton, Input, InputNumber, ResetButton, Form, FormItem } from "formik-antd";
import * as Yup from "yup";
import { Formik } from "formik";
import "./App.css";
import { Account, ThemeSwitch } from "./components";
import { INFURA_ID, NETWORK, NETWORKS } from "./constants";
import { Transactor } from "./helpers";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useExchangePrice,
  useGasPrice,
  useUserSigner,
} from "./hooks";
import Project from "./views/Project";
const { Option } = Select;
const { ethers } = require("ethers");
const targetNetwork = NETWORKS.ropsten; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG = false;
const NETWORKCHECK = true;
const scaffoldEthProvider = undefined;
// const scaffoldEthProvider = navigator.onLine
//   ? new ethers.providers.StaticJsonRpcProvider("https://rpc.scaffoldeth.io:48544")
//   : null;
const mainnetInfura = navigator.onLine
  ? new ethers.providers.StaticJsonRpcProvider("https://mainnet.infura.io/v3/" + INFURA_ID)
  : null;
// ( ⚠️ Getting "failed to meet quorum" errors? Check your INFURA_I )

// 🏠 Your local provider is usually pointed at your local blockchain
const localProviderUrl = targetNetwork.rpcUrl;
// as you deploy to other networks you can set REACT_APP_PROVIDER=https://dai.poa.network in packages/react-app/.env
const localProviderUrlFromEnv = process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : localProviderUrl;
if (DEBUG) console.log("🏠 Connecting to provider:", localProviderUrlFromEnv);
const localProvider = new ethers.providers.StaticJsonRpcProvider(localProviderUrlFromEnv);

// 🔭 block explorer URL
const blockExplorer = targetNetwork.blockExplorer;

// Coinbase walletLink init
const walletLink = new WalletLink({
  appName: "coinbase",
});

// WalletLink provider
const walletLinkProvider = walletLink.makeWeb3Provider(`https://mainnet.infura.io/v3/${INFURA_ID}`, 1);

/*
  Web3 modal helps us "connect" external wallets:
*/
const web3Modal = new Web3Modal({
  network: "mainnet", // Optional. If using WalletConnect on xDai, change network to "xdai" and add RPC info below for xDai chain.
  cacheProvider: true, // optional
  theme: "light", // optional. Change to "dark" for a dark theme.
  providerOptions: {
    walletconnect: {
      package: WalletConnectProvider, // required
      options: {
        infuraId: INFURA_ID,
        rpc: {
          1: "https://mainnet.infura.io/v3/${INFURA_ID}", // mainnet // For more WalletConnect providers: https://docs.walletconnect.org/quick-start/dapps/web3-provider#required
          100: "https://dai.poa.network", // xDai
        },
      },
    },
    "custom-walletlink": {
      display: {
        logo:
          "https://play-lh.googleusercontent.com/PjoJoG27miSglVBXoXrxBSLveV6e3EeBPpNY55aiUUBM9Q1RCETKCOqdOkX2ZydqVf0",
        name: "Coinbase",
        description: "Connect to Coinbase Wallet (not Coinbase App)",
      },
      package: walletLinkProvider,
      connector: async (provider, options) => {
        await provider.enable();
        return provider;
      },
    },
  },
});

const logoutOfWeb3Modal = async () => {
  await web3Modal.clearCachedProvider();
  setTimeout(() => {
    window.location.reload();
  }, 1);
};

function App() {
  const mainnetProvider = scaffoldEthProvider && scaffoldEthProvider._network ? scaffoldEthProvider : mainnetInfura;
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [injectedProvider, setInjectedProvider] = useState();
  const [projectState, setProjectState] = useState("All");
  const { ErrorBoundary, didCatch, error } = useErrorBoundary();
  const [address, setAddress] = useState();
  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangePrice(targetNetwork, mainnetProvider);
  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userSigner = useUserSigner(injectedProvider, localProvider);

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = Transactor(userSigner, gasPrice);

  // Faucet Tx can be used to send funds from the faucet
  const faucetTx = Transactor(localProvider, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address, 10000);

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider);

  // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  const writeContracts = useContractLoader(userSigner, { chainId: localChainId });

  // 📟 Listen for broadcast events
  // const projectsList = useEventListener(readContracts, "CrowdFunding", "NewProjectCreated", localProvider);

  const projectsList = useContractReader(readContracts, "CrowdFunding", "returnAllProjects", 10000);

  let networkDisplay = "";
  if (NETWORKCHECK && localChainId && selectedChainId && localChainId !== selectedChainId) {
    const networkSelected = NETWORK(selectedChainId);
    const networkLocal = NETWORK(localChainId);
    if (selectedChainId === 1337 && localChainId === 31337) {
      networkDisplay = (
        <div>
          <Alert
            message="⚠️ Wrong Network ID"
            description={
              <div>
                You have <b>chain id 1337</b> for localhost and you need to change it to <b>31337</b> to work with
                HardHat.
                <div>(MetaMask -&gt; Settings -&gt; Networks -&gt; Chain ID -&gt; 31337)</div>
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    } else {
      networkDisplay = (
        <div>
          <Alert
            message="⚠️ Wrong Network"
            description={
              <div>
                You have <b>{networkSelected && networkSelected.name}</b> selected and you need to be on{" "}
                <Button
                  onClick={async () => {
                    const ethereum = window.ethereum;
                    const data = [
                      {
                        chainId: "0x" + targetNetwork.chainId.toString(16),
                        chainName: targetNetwork.name,
                        nativeCurrency: targetNetwork.nativeCurrency,
                        rpcUrls: [targetNetwork.rpcUrl],
                        blockExplorerUrls: [targetNetwork.blockExplorer],
                      },
                    ];
                    console.log("data", data);
                    const tx = await ethereum.request({ method: "wallet_addEthereumChain", params: data }).catch();
                    if (tx) {
                      console.log(tx);
                    }
                  }}
                >
                  <b>{networkLocal && networkLocal.name}</b>
                </Button>
                .
              </div>
            }
            type="error"
            closable={false}
          />
        </div>
      );
    }
  } else {
    networkDisplay = <div style={{ color: targetNetwork.color }}>{targetNetwork.name}</div>;
  }

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [route, setRoute] = useState();
  useEffect(() => {
    setRoute(window.location.pathname);
  }, [setRoute]);

  let faucetHint = "";
  const [faucetClicked, setFaucetClicked] = useState(false);
  if (
    !faucetClicked &&
    localProvider &&
    localProvider._network &&
    localProvider._network.chainId === 3 &&
    yourLocalBalance &&
    ethers.utils.formatEther(yourLocalBalance) <= 0
  ) {
    faucetHint = (
      <div style={{ padding: "0.5rem" }}>
        <Button
          type="primary"
          onClick={() => {
            // open new tab with faucet website
            window.open("https://faucet.dimensions.network/", "_blank");
            setFaucetClicked(true);
          }}
        >
          💰 Grab funds from the faucet ⛽️
        </Button>
      </div>
    );
  }

  const startNewProject = ({ goal, title, duration, description }) => {
    const formattedGoal = goal / price;

    tx(
      writeContracts.CrowdFunding.createNewProject(
        ethers.utils.parseEther(formattedGoal.toString()),
        title,
        description,
        duration,
      ),
    ).then(
      t => {
        console.log(t);
      },
      e => {
        console.error(e);
      },
    );
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  function handleChange(value) {
    setProjectState(value);
  }
  return (
    <>
      {didCatch ? (
        <Typography.Title type="danger" level={5}>
          An error has been caught: {error.message}
        </Typography.Title>
      ) : (
        <ErrorBoundary>
          <BackTop />
          <div className="App">
            <PageHeader
              title="We Fund"
              subTitle="Decentralised Crowdfunding"
              extra={[
                <div>
                  <Account
                    address={address}
                    localProvider={localProvider}
                    userSigner={userSigner}
                    mainnetProvider={mainnetProvider}
                    price={price}
                    web3Modal={web3Modal}
                    loadWeb3Modal={loadWeb3Modal}
                    logoutOfWeb3Modal={logoutOfWeb3Modal}
                    blockExplorer={blockExplorer}
                  />
                  {faucetHint}
                  {networkDisplay}
                </div>,
              ]}
              style={{ cursor: "pointer" }}
            />

            <Button
              className="newProjectButton"
              type="primary"
              onClick={() => {
                setIsModalVisible(true);
              }}
            >
              Start new Project
            </Button>
            <Modal title="Create New Project" visible={isModalVisible} footer={null} onCancel={handleCancel}>
              <Formik
                initialValues={{ title: "", duration: 1, description: "", goal: "" }}
                validationSchema={Yup.object({
                  title: Yup.string().required(),
                  duration: Yup.number().required().min(1),
                  description: Yup.string().required(),
                  goal: Yup.number().required().positive(),
                })}
                onSubmit={(values, actions) => {
                  startNewProject(values);
                  actions.setSubmitting(false);
                  actions.resetForm();
                  setIsModalVisible(false);
                }}
                render={() => (
                  <Form id="fooId">
                    <Form.Item required={true} name="title" label="Project Name" rules={[{ type: "string" }]}>
                      <Input name="title" placeholder="Project Name" />
                    </Form.Item>
                    <FormItem
                      validate="required"
                      required={true}
                      name="description"
                      label="Project description"
                      rules={[{ type: "string" }]}
                    >
                      <Input name="description" placeholder="Project description" />
                    </FormItem>
                    <FormItem
                      required={true}
                      name="duration"
                      label="Duration in days"
                      rules={[{ type: "number", min: 1 }]}
                    >
                      <InputNumber name="duration" placeholder="Duration in Days" />
                    </FormItem>
                    <FormItem required={true} name="goal" label="Amount (in USD)" rules={[{ type: "number", min: 0 }]}>
                      <InputNumber name="goal" placeholder="$" />
                    </FormItem>
                    <Divider />
                    <Space>
                      <SubmitButton style={{ marginRight: "1rem" }}>Submit</SubmitButton>
                      <ResetButton>Reset</ResetButton>
                    </Space>
                  </Form>
                )}
              />
            </Modal>
            <Select defaultValue="All" style={{ width: 120 }} onChange={handleChange}>
              <Option value="All">All</Option>
              <Option value="Active">Active</Option>
              <Option value="Completed">Completed</Option>
              <Option value="Expired">Expired</Option>
            </Select>
            <div className="card">
              {projectsList &&
                projectsList.map(project => (
                  <Project
                    tx={tx}
                    parentDefinedState={projectState}
                    key={project}
                    userAddress={address}
                    address={project}
                    localProvider={localProvider}
                    userSigner={userSigner}
                    mainnetProvider={mainnetProvider}
                    price={price}
                    blockExplorer={blockExplorer}
                  />
                ))}
            </div>

            <ThemeSwitch />

            <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }}></div>
          </div>
        </ErrorBoundary>
      )}
    </>
  );
}

export default App;

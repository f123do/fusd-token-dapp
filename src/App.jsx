import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

// GANTI dengan alamat kontrak FUSD kamu:
const CONTRACT_ADDRESS = "0xaCB84568E9A68f13243932f6f0ba514CED2c9618";
const REQUIRE_SEPOLIA = true;
const SEPOLIA_CHAIN_ID = 11155111;

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [ethBalance, setEthBalance] = useState(null);

  const [tokenContract, setTokenContract] = useState(null);
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [tokenBalance, setTokenBalance] = useState(null);

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [txPending, setTxPending] = useState(false);

  const [toAddress, setToAddress] = useState("");
  const [amountHuman, setAmountHuman] = useState("");

  const resetStatus = () => {
    setStatus("");
    setError("");
  };

  async function connectWallet() {
    resetStatus();
    if (!window.ethereum) {
      setError("MetaMask not found.");
      return;
    }

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const p = new ethers.providers.Web3Provider(window.ethereum, "any");
      setProvider(p);

      const s = p.getSigner();
      setSigner(s);

      const addr = await s.getAddress();
      setAccount(addr);

      if (REQUIRE_SEPOLIA) {
        const network = await p.getNetwork();
        if (network.chainId !== SEPOLIA_CHAIN_ID) {
          setError("Switch MetaMask to Sepolia network.");
        }
      }

      const ethBal = await p.getBalance(addr);
      setEthBalance(ethers.utils.formatEther(ethBal));

      const ct = new ethers.Contract(CONTRACT_ADDRESS, ERC20_ABI, s);
      setTokenContract(ct);

      const [sym, dec] = await Promise.all([ct.symbol(), ct.decimals()]);
      setTokenSymbol(sym);
      setTokenDecimals(dec);

      const bal = await ct.balanceOf(addr);
      setTokenBalance(ethers.utils.formatUnits(bal, dec));
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  async function sendTransfer(e) {
    e.preventDefault();
    resetStatus();

    if (!tokenContract) {
      setError("Wallet not connected.");
      return;
    }

    if (!ethers.utils.isAddress(toAddress)) {
      setError("Invalid address.");
      return;
    }

    try {
      const amount = ethers.utils.parseUnits(amountHuman, tokenDecimals);

      const tx = await tokenContract.transfer(toAddress, amount);
      setTxPending(true);
      setStatus("Transaction sent: " + tx.hash);

      await tx.wait();
      setTxPending(false);
      setStatus("Transfer successful!");

      const bal = await tokenContract.balanceOf(account);
      setTokenBalance(ethers.utils.formatUnits(bal, tokenDecimals));
    } catch (err) {
      setError(err.message || String(err));
      setTxPending(false);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>FUSD dApp</h1>
      <button onClick={connectWallet} style={{ padding: 10, marginBottom: 20 }}>
        Connect MetaMask
      </button>

      <div>
        <p><b>Account:</b> {account}</p>
        <p><b>ETH Balance:</b> {ethBalance}</p>
        <p><b>Token:</b> {tokenSymbol}</p>
        <p><b>Token Balance:</b> {tokenBalance}</p>
      </div>

      <hr />

      <h2>Send {tokenSymbol}</h2>
      <form onSubmit={sendTransfer}>
        <input
          placeholder="Recipient address"
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        <input
          placeholder="Amount"
          value={amountHuman}
          onChange={(e) => setAmountHuman(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        <button
          type="submit"
          disabled={txPending}
          style={{ padding: 10, width: "100%" }}
        >
          {txPending ? "Sending..." : "Send"}
        </button>
      </form>

      <p style={{ color: "green" }}>{status}</p>
      <p style={{ color: "red" }}>{error}</p>
    </div>
  );
}

// src/App.jsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import QRCode from "qrcode.react";

/*
  FRD Wallet — Full featured single-file app component.
  - Multi-tab: Assets | Activity | Send | Receive | Settings
  - Dark mode toggle
  - Token list (single token from CONTRACT_ADDRESS)
  - Send modal with validations
  - Receive panel with QR code
  - Local tx history with links to Sepolia Etherscan
  - Minimal, responsive CSS is in src/index.css
*/

/* ---------- CONFIG ---------- */
/* Replace this with your deployed token contract on Sepolia */
const CONTRACT_ADDRESS = "0xaCB84568E9A68f13243932f6f0ba514CED2c9618";
/* If you'd rather use Vercel env var: use
   const CONTRACT_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS || "REPLACE_...";
*/
const REQUIRE_SEPOLIA = true;
const SEPOLIA_CHAIN_ID = 11155111;

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

/* ---------- Helpers ---------- */
const shortAddr = (a) => (a ? `${a.slice(0,6)}...${a.slice(-4)}` : "-");
const fmt = (n, decimals=18) => {
  try { return Number(ethers.utils.formatUnits(n, decimals)).toString(); }
  catch { return String(n); }
};

/* ---------- Main Component ---------- */
export default function App() {
  // web3 states
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState("");
  const [networkError, setNetworkError] = useState("");

  // balances & token
  const [ethBalance, setEthBalance] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [tokenBalance, setTokenBalance] = useState(null);

  // UX states
  const [activeTab, setActiveTab] = useState("assets"); // assets, activity, send, receive, settings
  const [darkMode, setDarkMode] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [txPending, setTxPending] = useState(false);

  // send form
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  // local tx history (in-memory)
  const [txHistory, setTxHistory] = useState([]);

  // reset messages
  const resetMsg = () => { setStatus(""); setError(""); };

  // connect wallet
  async function connectWallet() {
    resetMsg();
    if (!window.ethereum) return setError("MetaMask not found. Install MetaMask extension.");
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const p = new ethers.providers.Web3Provider(window.ethereum, "any");
      setProvider(p);
      const s = p.getSigner();
      setSigner(s);
      const addr = await s.getAddress();
      setAccount(addr);

      if (REQUIRE_SEPOLIA) {
        const net = await p.getNetwork();
        if (net.chainId !== SEPOLIA_CHAIN_ID) {
          setNetworkError("Please switch MetaMask network to Sepolia.");
        } else {
          setNetworkError("");
        }
      }

      // ETH balance
      const ethBal = await p.getBalance(addr);
      setEthBalance(ethers.utils.formatEther(ethBal));

      // token contract
      if (CONTRACT_ADDRESS && !CONTRACT_ADDRESS.includes("REPLACE")) {
        const ct = new ethers.Contract(CONTRACT_ADDRESS, ERC20_ABI, s);
        setTokenContract(ct);
        try {
          const [sym, dec, bal] = await Promise.all([ct.symbol(), ct.decimals(), ct.balanceOf(addr)]);
          setTokenSymbol(sym);
          setTokenDecimals(dec);
          setTokenBalance(ethers.utils.formatUnits(bal, dec));
        } catch (e) {
          console.error(e);
          setError("Failed to read token info. Check contract address & network.");
        }
      } else {
        setError("Set CONTRACT_ADDRESS in src/App.jsx to your token address.");
      }

      // listeners
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          setAccount("");
          setEthBalance(null);
          setTokenBalance(null);
        } else {
          setAccount(accounts[0]);
          fetchBalances(accounts[0]);
        }
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
    } catch (err) {
      console.error(err);
      setError(err?.message || String(err));
    }
  }

  async function fetchBalances(addr = account) {
    if (!provider || !addr) return;
    try {
      const eth = await provider.getBalance(addr);
      setEthBalance(ethers.utils.formatEther(eth));
      if (tokenContract) {
        const bal = await tokenContract.balanceOf(addr);
        setTokenBalance(ethers.utils.formatUnits(bal, tokenDecimals));
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Send token
  async function handleSend(e) {
    e.preventDefault();
    resetMsg();
    if (!tokenContract || !signer) return setError("Wallet not connected or token not initialized.");
    if (!ethers.utils.isAddress(recipient)) return setError("Invalid recipient address.");
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return setError("Invalid amount.");

    try {
      const parsed = ethers.utils.parseUnits(amount, tokenDecimals);
      const tx = await tokenContract.transfer(recipient, parsed);
      setTxPending(true);
      setStatus(`Tx sent: ${tx.hash} — waiting confirmation...`);
      setTxHistory(prev => [{hash: tx.hash, to: recipient, amount, status: "pending", time: Date.now()}, ...prev]);

      const receipt = await tx.wait();
      setTxPending(false);
      setStatus(`Transaction confirmed (block ${receipt.blockNumber})`);
      setTxHistory(prev => prev.map(t => t.hash === tx.hash ? {...t, status: "confirmed"} : t));
      fetchBalances();
      setActiveTab("activity");
    } catch (err) {
      console.error(err);
      setTxPending(false);
      const msg = err?.data?.message || err?.message || String(err);
      setError(`Send failed: ${msg}`);
      if (err?.transactionHash) {
        setTxHistory(prev => prev.map(t => t.hash === err.transactionHash ? {...t, status: "failed"} : t));
      }
    }
  }

  // helper copy address
  const copyAddr = async () => {
    if (account && navigator.clipboard) {
      await navigator.clipboard.writeText(account);
      setStatus("Address copied to clipboard.");
    }
  };

  // initial effect: try detect injected provider (but don't auto request accounts)
  useEffect(() => {
    if (window.ethereum) {
      const p = new ethers.providers.Web3Provider(window.ethereum, "any");
      setProvider(p);
    }
  }, []);

  // UI: small card for token
  function TokenCard() {
    return (
      <div className="card token-card">
        <div className="card-title">Assets</div>
        <div className="balance-row">
          <div>
            <div className="muted">ETH</div>
            <div className="strong">{ethBalance ? Number(ethBalance).toFixed(6) : "-"}</div>
          </div>
          <div>
            <div className="muted">{tokenSymbol || "TOKEN"}</div>
            <div className="strong">{tokenBalance ? tokenBalance : "-"}</div>
          </div>
        </div>

        <div className="actions-row">
          <button className="btn" onClick={() => setActiveTab("send")}>Send</button>
          <button className="btn outline" onClick={() => setActiveTab("receive")}>Receive</button>
        </div>
      </div>
    );
  }

  function ActivityList() {
    return (
      <div className="card">
        <div className="card-title">Recent Activity</div>
        {txHistory.length === 0 ? <div className="muted">No transactions yet.</div> :
          txHistory.map(tx => (
            <div key={tx.hash} className="tx-row">
              <div>
                <div className="strong">{tx.amount} {tokenSymbol || 'TKN'}</div>
                <div className="muted">{shortAddr(tx.to)}</div>
                <div className="tiny muted">{new Date(tx.time).toLocaleString()}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className={`status ${tx.status}`}>{tx.status}</div>
                <div className="tiny"><a href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer">View</a></div>
              </div>
            </div>
          ))
        }
      </div>
    );
  }

  /* ---------- Layout ---------- */
  return (
    <div className={darkMode ? "app dark" : "app"}>
      <header className="topbar">
        <div className="brand">
          <div className="logo">FRD</div>
          <div>
            <div className="title">FRD Wallet</div>
            <div className="muted tiny">Sepolia testnet</div>
          </div>
        </div>

        <div className="top-actions">
          <label className="toggle">
            <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
            <span>Dark</span>
          </label>

          <div className="acct">
            <div className="addr">{account ? shortAddr(account) : "Not connected"}</div>
            <button className="btn small" onClick={connectWallet}>Connect</button>
          </div>
        </div>
      </header>

      <main className="container">
        <nav className="sidebar">
          <ul>
            <li className={activeTab==="assets"?"active":""} onClick={()=>setActiveTab("assets")}>Assets</li>
            <li className={activeTab==="activity"?"active":""} onClick={()=>setActiveTab("activity")}>Activity</li>
            <li className={activeTab==="send"?"active":""} onClick={()=>setActiveTab("send")}>Send</li>
            <li className={activeTab==="receive"?"active":""} onClick={()=>setActiveTab("receive")}>Receive</li>
            <li className={activeTab==="settings"?"active":""} onClick={()=>setActiveTab("settings")}>Settings</li>
          </ul>

          <div style={{marginTop:20}}>
            <div className="muted tiny">Network</div>
            <div className="strong">Sepolia</div>
          </div>
        </nav>

        <section className="content">
          {/* top cards */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16}}>
            <TokenCard />
            <div className="card">
              <div className="card-title">Account</div>
              <div className="muted">Address</div>
              <div style={{wordBreak:'break-all'}}>{account || "-"}</div>
              <div style={{marginTop:10}}>
                <button className="btn" onClick={copyAddr}>Copy</button>
                <a className="btn outline" style={{marginLeft:8}} href={account?`https://sepolia.etherscan.io/address/${account}`:"#"} target="_blank" rel="noreferrer">View on Etherscan</a>
              </div>
            </div>
          </div>

          {/* main area */}
          <div style={{marginTop:16}}>
            {activeTab === "assets" && (
              <>
                <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16}}>
                  <div>
                    <div className="card">
                      <div className="card-title">Your Assets</div>
                      <div className="muted">Token Balances</div>
                      <div style={{marginTop:12}}>
                        <div className="token-row">
                          <div>
                            <div className="muted">Token</div>
                            <div className="strong">{tokenSymbol || "-"}</div>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div className="muted">Balance</div>
                            <div className="strong">{tokenBalance || "-"}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <ActivityList />
                  </div>

                  <div>
                    <div className="card">
                      <div className="card-title">Quick Actions</div>
                      <div style={{display:'flex',gap:8,marginTop:8}}>
                        <button className="btn" onClick={()=>setActiveTab("send")}>Send</button>
                        <button className="btn outline" onClick={()=>setActiveTab("receive")}>Receive</button>
                      </div>
                    </div>
                    <div style={{height:12}} />
                    <div className="card">
                      <div className="card-title">Token Info</div>
                      <div className="muted">Contract</div>
                      <div style={{wordBreak:'break-all'}}>{CONTRACT_ADDRESS}</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "activity" && <ActivityList />}

            {activeTab === "send" && (
              <div className="card">
                <div className="card-title">Send {tokenSymbol || "Token"}</div>
                <form onSubmit={handleSend} style={{marginTop:8}}>
                  <div style={{marginBottom:8}}>
                    <label className="muted tiny">Recipient</label>
                    <input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="0x..." />
                  </div>
                  <div style={{marginBottom:8}}>
                    <label className="muted tiny">Amount ({tokenSymbol||'TOKEN'})</label>
                    <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 1.5" />
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:8}}>
                    <button className="btn" type="submit" disabled={txPending}>{txPending ? "Sending..." : "Send"}</button>
                    <button type="button" className="btn outline" onClick={()=>{setRecipient(''); setAmount('');}}>Reset</button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "receive" && (
              <div className="card">
                <div className="card-title">Receive</div>
                <div className="muted">Your address</div>
                <div style={{wordBreak:'break-all',marginTop:8}}>{account || "Not connected"}</div>
                {account && (
                  <div style={{marginTop:12}}>
                    <QRCode value={account} size={150} />
                    <div style={{marginTop:8}}>
                      <button className="btn" onClick={copyAddr}>Copy address</button>
                      <a className="btn outline" href={`https://sepolia.etherscan.io/address/${account}`} target="_blank" rel="noreferrer" style={{marginLeft:8}}>View on Etherscan</a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="card">
                <div className="card-title">Settings</div>
                <div style={{marginTop:8}}>
                  <div className="muted tiny">App</div>
                  <div style={{marginTop:8}}>
                    <button className="btn" onClick={()=>{setTxHistory([]); setStatus('Cleared history');}}>Clear History</button>
                  </div>
                </div>
                <div style={{marginTop:12}}>
                  <div className="muted tiny">Contract Address</div>
                  <div style={{wordBreak:'break-all'}}>{CONTRACT_ADDRESS}</div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>FRD Wallet — Sepolia demo</div>
        <div className="muted tiny">Built with React + Ethers.js</div>
      </footer>

      <div className="toasts">
        {status && <div className="toast success">{status}</div>}
        {error && <div className="toast error">{error}</div>}
        {networkError && <div className="toast error">{networkError}</div>}
      </div>
    </div>
  );
}

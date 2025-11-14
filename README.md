🚀 FUSD dApp — React + Vite + Ethers.js (Sepolia Testnet)

dApp sederhana untuk:

Connect MetaMask

Menampilkan saldo ETH

Menampilkan saldo token FUSD (ERC-20 Sepolia)

Mengirim (transfer) token FUSD ke alamat lain


Project ini menggunakan:

React 18

Vite

Ethers.js v5

Vercel untuk hosting



---

📁 Struktur Project

fusd-token-dapp/
│
├── package.json
├── index.html
├── .gitignore
├── README.md
│
└── src/
    ├── main.jsx
    ├── App.jsx
    └── index.css


---

⚙️ Konfigurasi Penting

🔧 1. Set Alamat Kontrak FUSD

Buka file:

src/App.jsx

Cari baris:

const CONTRACT_ADDRESS = "REPLACE_WITH_YOUR_FUSD_CONTRACT_ADDRESS";

GANTI dengan alamat kontrak FUSD milikmu (dari Remix, jaringan Sepolia).

Contoh:

const CONTRACT_ADDRESS = "0x1234567890abcdef...";

Kalau tidak diganti → dApp tidak bisa membaca token kamu.


---

🦊 MetaMask Setup

Pastikan MetaMask sudah:

Terinstall

Di jaringan Sepolia

Wallet yang dipakai memiliki token FUSD dari deploy kontrak

Wallet memiliki sedikit Sepolia ETH untuk gas



---

🚀 Deploy ke Vercel (Gratis)

1. Login ke https://vercel.com


2. Klik New Project


3. Import repository GitHub kamu (mis: fusd-token-dapp)


4. Vercel otomatis mendeteksi:

Framework: Vite

Build Command: npm run build

Output Directory: dist



5. Klik Deploy


6. Tunggu sampai selesai → kamu akan mendapatkan domain gratis:



https://fusd-dapp.vercel.app


---

🔌 Cara Menggunakan (Setelah Live)

1. Buka website Vercel kamu


2. Klik Connect MetaMask


3. Approve access


4. Lihat:

Alamat wallet

Saldo Sepolia ETH

Saldo FUSD



5. Lakukan transfer:

Masukkan alamat penerima

Masukkan jumlah token

Klik Send

Konfirmasi transaksi di MetaMask





---

🧩 Teknologi yang Digunakan

Teknologi	Fungsi

React	UI framework
Vite	Dev & build tool
Ethers.js v5	Interaksi blockchain
MetaMask	Wallet web3
Vercel	Hosting gratis, live domain



---

🛠️ Cara Run Secara Lokal (Opsional)

Tidak wajib, hanya kalau mau jalan di laptop.

npm install
npm run dev

Website muncul di:

http://localhost:5173


---

🧪 Testing

Pastikan MetaMask pakai network Sepolia

Pastikan CONTRACT_ADDRESS benar

Pastikan token kamu punya symbol & decimals

Pastikan wallet punya saldo token sebelum test transfer



---

✨ Lisensi

Project ini bebas digunakan, dimodifikasi, dan dikembangkan.


---

🎉 Selesai!

Jika README sudah kamu copy ke GitHub, repo kamu sudah 100% lengkap.

Kalau mau, kirim link repo GitHub, nanti aku cek apakah sudah benar semua sebelum kita deploy ke Vercel.

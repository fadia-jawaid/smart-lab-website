# 🚀 SmartLab Tracker — New Laptop Setup Guide
### (نیا لیپ ٹاپ پر پروجیکٹ شفٹ اور رن کرنے کا مکمل طریقہ)

Yeh complete guide hai jisse aap is project ko kisi bhi doosre / new laptop par USB ke zariye asani se transfer aur run kar sakte hain.

---

## 💾 1. USB Transfer Tips (USB mein copy karte waqt dhyan dein)

1. **`node_modules` ko delete karke copy karein (Bohat Zaroori 💡)**:
   - Project folder ke andar mojood `node_modules` folders (root, `server`, aur `client` mein) mein hazaron choti files hoti hain jo USB copy hone mein 30 se 45 minutes leti hain.
   - Agar aap `node_modules` delete karke copy kareinge to USB mein sirf 10-20 seconds mein pura project copy ho jayega!
   - Naye laptop par hamari **`1_INSTALL_DEPENDENCIES.bat`** script chalane se sari files khud ba khud fresh install ho jayengi.
2. **Pura Folder Copy Karein**:
   - Pura `smart-lab-tracker-main` folder USB mein copy karein aur naye laptop ke Desktop ya kisi bhi drive (e.g. `D:\`) par paste kar lein.

---

## 🛠️ 2. Naye Laptop Par Kya Install Karna Hoga? (Prerequisites)

Naye laptop par sirf aur sirf **1 software** install karna zaroori hai:

### ✅ 1. Node.js (LTS Version)
* **Website**: [https://nodejs.org/](https://nodejs.org/)
* **Download**: Node.js ka **LTS (Recommended for Most Users)** version download karein aur install karein (Next > Next > Install).
* *(Node.js install hone se `npm` aur `npx` automatically install ho jate hain)*.

### ℹ️ Koi doosra database ya server install karne ki zaroorat NAHI hai:
* ❌ PostgreSQL install karne ki zaroorat **nahi** hai (Project **SQLite Local DB** use karta hai jo pehle se setup hai).
* ❌ Docker install karne ki zaroorat **nahi** hai.
* ❌ External Mosquitto Broker install karne ki zaroorat **nahi** hai (MQTT Broker code ke andar embedded hai).

*(Optional: Code dekhne ya edit karne ke liye aap **VS Code** install kar sakte hain).*

---

## ⚡ 3. Naye Laptop Par Run Karne Ka Tareeqa (2 Asan Tareeqay)

---

### ⭐ Tareeqa 1: 1-Click Automatic Method (Sabse Asan)

Aapko terminal mein lambi commands likhne ki zaroorat nahi hai. Humne 1-click batch files bana di hain:

1. **Step 1:** Folder ko naye laptop par open karein.
2. **Step 2:** **`1_INSTALL_DEPENDENCIES.bat`** par double click karein.
   - Yeh script Node.js check karegi, saare packages (Root, Server, Client) install karegi aur Prisma database client create karegi.
   - Jab likha aaye *"SETUP COMPLETED SUCCESSFULLY"*, to window close kar dein.
3. **Step 3:** **`2_START_PROJECT.bat`** par double click karein.
   - Yeh script automatically teeno (3) cheezein alag alag terminals mein start kar degi:
     1. MQTT Broker (Port 1883)
     2. Backend API Server (Port 5000)
     3. Frontend Web App (Port 5173)
   - Aur aapka browser automatically **`http://localhost:5173`** par website open kar dega! 🎉

> **⚠️ NOTE:** Jab tak aap website use kar rahe hain, in teen terminal windows ko band (close) mat karein. Kaam khatam hone par windows band kar dein.

---

### 💻 Tareeqa 2: Manual Terminal Method (VS Code ya PowerShell se)

Agar aap manually terminal se chalana chahte hain:

#### 1. Dependencies Install karein:
Terminal 1 mein (Root folder par):
```powershell
npm install
cd server
npm install
npx prisma generate
cd ../client
npm install
cd ..
```

#### 2. Services Run karein (3 Alag Alag Terminals):

* **Terminal 1 (MQTT Broker):**
  ```powershell
  cd server
  npm run broker
  ```
  *(Output: `🚀 Embedded MQTT Broker running on tcp://localhost:1883`)*

* **Terminal 2 (Backend Server):**
  ```powershell
  cd server
  npm run dev
  ```
  *(Output: `🚀 Server running on http://localhost:5000`)*

* **Terminal 3 (Frontend Web Client):**
  ```powershell
  cd client
  npm run dev
  ```
  *(Output: `➜ Local: http://localhost:5173/`)*

* Web Browser open karein aur type karein: **`http://localhost:5173`**

---

## 🔑 4. Demo Login Accounts

System mein already seeded demo accounts available hain:

| Role | Email / Roll No | Password | Access / Purpose |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@smartlab.com` | `admin123` | Full system control, student/chemical records, alert logs |
| **Lab Incharge** | `incharge@smartlab.com` | `incharge123` | Chemical scan station & checkout |
| **Student 1** | `23-ES-020` (Shinya) | `student123` | Student portal & personal history |
| **Student 2** | `21-CS-45` (Ali Hassan) | `student123` | Student portal & personal history |

---

## 🔄 5. Database Reset Karna (Agar Zaroorat Pare)

Agar kabhi aapko fresh demo data wapas chahiye ya database reset karna ho:
* Simply double-click karein: **`3_RESET_DATABASE.bat`**
* Ya server folder mein command run karein:
  ```powershell
  cd server
  npx prisma db push --force-reset
  npx prisma db seed
  ```

---

## 📡 6. ESP32 Hardware Connect Karne Ke Liye (Optional)

Agar aap ESP32 hardware device connect kar rahe hain:
1. Naye laptop par **Command Prompt (CMD)** open karein aur `ipconfig` likhein.
2. Apna **IPv4 Address** check karein (e.g. `192.168.1.15`).
3. ESP32 ke Arduino code mein MQTT Broker IP ki jagah apne laptop ka yehi IPv4 address daalein (Port: `1883`).
4. **Firewall Check**: Windows Defender Firewall mein Public Network protection ko temporarily OFF karein taake ESP32 Wi-Fi se laptop ke port 1883 par connect ho sake.

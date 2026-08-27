# SmartLab Tracker — Comprehensive System Documentation

This document provides complete details regarding the **SmartLab Tracker** system configuration, software modifications, hosting instructions, hardware constraints, and data logging protocols for **LAB A** (Chemical Management) and **LAB B** (Student Attendance).

---

## 🛠️ 1. Software Architecture & Key Changes

### A. Zero-Config Local Database Conversion
* **Previous State**: Required an external PostgreSQL server on port 5432.
* **Modification**: Converted Prisma schema (`server/prisma/schema.prisma`) to **SQLite** (`dev.db`).
* **Benefit**: The entire system runs locally on Windows out-of-the-box without Docker or PostgreSQL installation.

### B. Embedded MQTT Broker
* Created `server/src/broker.ts` using `Aedes.createBroker()` running on TCP port `1883`.
* Standardized script command `"broker": "tsx src/broker.ts"` in `server/package.json`.
* ESP32 microcontrollers connect directly to `mqtt://<YOUR_PC_IP>:1883`.

### C. Non-Blocking Server Boot
* **Issue**: The original server blocked `server.listen(5000)` for 10 seconds waiting for MQTT connection, causing frontend login requests (`POST /api/auth/login`) to hang.
* **Fix**: Refactored `connectMQTT()` in `server/src/config/mqtt.ts` and `server/src/index.ts` to connect asynchronously in the background. HTTP port 5000 starts instantly (0ms delay).

### D. SQLite Prisma Query Compatibility
* **Issue**: `mode: 'insensitive'` is PostgreSQL-specific in Prisma. Calling it under SQLite threw a `PrismaClientValidationError` and silently crashed MQTT event processing.
* **Fix**: Replaced `mode: 'insensitive'` in `server/src/services/mqttService.ts` with cross-platform JavaScript case-insensitive string matching (`.toLowerCase().includes(...)`).

### E. LAB B Attendance Schema Upgrade (`Chemical: Nil`)
* **Schema Modification**: Made `bottleId` optional (`bottleId String?`) in `Transaction` model in `schema.prisma`.
* **Attendance Handler**: When a LAB B attendance event occurs, `handleAttendanceEvent()` logs a transaction with `bottleId: null`, `purpose: "Lab B Attendance Check-in"`, and `lab: "LAB_B"`.
* **Frontend Rendering**: Updated `LogsPage.tsx` and `MyHistoryPage.tsx` so transactions with `bottleId: null` display **`Nil`** under the Chemical column and **`—`** under Quantity Used.

---

## 🚀 2. Hosting & Running the Application Locally

### Prerequisites
* Node.js (`v18+` or `v24+`) installed on Windows.
* Make sure your Windows Public Network Firewall is turned off. (Go to Firewall & Network Protection > Click on Public Network > Turn off the protection)

### Startup Order (3 Terminal Windows)

#### Terminal 1: Embedded MQTT Broker
```powershell
cd C:\Users\Shinya\Downloads\smart-lab-tracker-main\smart-lab-tracker-main\server
npm run broker
```
*Output:* `🚀 Embedded MQTT Broker running on tcp://localhost:1883`

#### Terminal 2: Backend Express API Server
```powershell
cd C:\Users\Shinya\Downloads\smart-lab-tracker-main\smart-lab-tracker-main\server
npm run dev
```
*Output:* `🚀 Server running on http://localhost:5000`

#### Terminal 3: Frontend Vite Web Client
```powershell
cd C:\Users\Shinya\Downloads\smart-lab-tracker-main\smart-lab-tracker-main\client
npm run dev
```
*Output:* `➜ Local: http://localhost:5173/`

Open your web browser at **`http://localhost:5173`**.

---

### 🔑 Default Demo Accounts

| Role | Roll No / Email | Password | Access / Purpose |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@smartlab.com` | `admin123` | System management, user/bottle setup, alert logs |
| **Lab Incharge** | `incharge@smartlab.com` | `incharge123` | Chemical checkout & scan station management |
| **Student** | `23-ES-020` (Shinya) | `student123` | Student dashboard & personal history (RFID: `2369D694`) |
| **Student** | `21-CS-45` (Ali Hassan) | `student123` | Student dashboard & history (RFID: `A3F2B1C4`) |

---

## ⚡ 3. Hardware Constraints & Pitfalls Encountered

### 1. RC522 Clone Chip Detection (`Firmware Version: 0x18`)
* **Constraint**: Commercial NXP MFRC522 chips report version `0x91`/`0x92`. Counterfeit/clone chips report `0x18` or `0x88`.
* **Gotcha**: Calling `mfrc522.PCD_Reset()` or `mfrc522.PCD_SetAntennaGain()` causes `0x18` clone chips to lock up SPI communications.
* **Fix**: Use standard `SPI.begin()` and `mfrc522.PCD_Init()` without hardware reset calls.

### 2. ESP32 Strapping Pin Conflict
* **Constraint**: `GPIO 5` is an ESP32 strapping pin used to configure internal voltage regulators at boot time.
* **Gotcha**: Connecting RC522 `SDA` to `GPIO 5` can pull the pin LOW during power-on, locking the SPI bus.
* **Fix**: Connect RC522 `SDA` to **`GPIO 15`** (`SPI.begin(18, 19, 23, 15)`).

### 3. PubSubClient Blocking Loop (`rc = -2`)
* **Constraint**: `rc = -2` means network connection to MQTT broker failed.
* **Gotcha**: Using `while (!client.connected()) delay(3000);` blocks `loop()`, causing the ESP32 to completely freeze and ignore RFID card scans.
* **Fix**: Use a **non-blocking timer** (`millis() - lastMqttRetry >= 5000`) so card scans and LCD UI updates execute independently of MQTT network status.

### 4. 3.3V Power Supply
* **Constraint**: The RC522 module operates **strictly on 3.3V**. Connecting to 5V damages the chip.

---

## 📌 4. Hardware Pinout Specifications

Below are the exact physical wiring pinout tables for both **LAB A** (Multi-Chemical System with 3 Load Cells) and **LAB B** (Attendance System with I2C LCD Display):

---

### 🧪 LAB A ESP32 — Multi-Chemical Management System (3 Load Cells)
**Peripherals**: ESP32 Dev Board + MFRC522 RFID Reader + 3x HX711 Load Cell Scale Modules

| Module | Module Pin | ESP32 GPIO Pin | Assigned Chemical / Notes |
| :--- | :--- | :--- | :--- |
| **MFRC522 RFID** | VCC | **3.3V** | ⚠️ **3.3V Power Only** (Do NOT connect to 5V!) |
| | GND | **GND** | Common Ground |
| | SDA (SS) | **GPIO 5** | D5 (SPI Slave Select) |
| | SCK | **GPIO 18** | D18 (SPI Clock) |
| | MISO | **GPIO 19** | D19 (SPI Master In Slave Out) |
| | MOSI | **GPIO 23** | D23 (SPI Master Out Slave In) |
| | RST | **GPIO 22** | D22 (Hardware Reset) |
| **Load Cell 1 (HX711)** | VCC / GND | **5V / GND** | Power & Ground |
| | DT (Data) | **GPIO 25** | D25 — **Ethanol** Data Line |
| | SCK (Clock)| **GPIO 26** | D26 — **Ethanol** Clock Line |
| **Load Cell 2 (HX711)** | VCC / GND | **5V / GND** | Power & Ground |
| | DT (Data) | **GPIO 33** | D33 — **Hydrochloric Acid** Data Line |
| | SCK (Clock)| **GPIO 32** | D32 — **Hydrochloric Acid** Clock Line |
| **Load Cell 3 (HX711)** | VCC / GND | **5V / GND** | Power & Ground |
| | DT (Data) | **GPIO 12** | D12 — **Methanol** Data Line |
| | SCK (Clock)| **GPIO 14** | D14 — **Methanol** Clock Line |

---

### 📋 LAB B ESP32 — Student Attendance System
**Peripherals**: ESP32 Dev Board + MFRC522 RFID Reader + 16x2 I2C LCD Display

| Module | Module Pin | ESP32 GPIO Pin | Function / Wiring Notes |
| :--- | :--- | :--- | :--- |
| **MFRC522 RFID** | VCC | **3.3V** | ⚠️ **3.3V Power Only** (Do NOT connect to 5V!) |
| | GND | **GND** | Common Ground |
| | SDA (SS) | **GPIO 15** | D15 (SPI Slave Select — avoids D5 boot lockup) |
| | SCK | **GPIO 18** | D18 (SPI Clock) |
| | MISO | **GPIO 19** | D19 (SPI Master In Slave Out) |
| | MOSI | **GPIO 23** | D23 (SPI Master Out Slave In) |
| | RST | **GPIO 5** | D5 (Hardware Reset Pin) |
| **16x2 I2C LCD** | VCC | **5V** | LCD Display & Backlight Power |
| | GND | **GND** | Common Ground |
| | SDA | **GPIO 21** | D21 (I2C Data — Address `0x27`) |
| | SCL | **GPIO 22** | D22 (I2C Clock) |

---

## 📡 5. Data Logging Protocols (LAB A & LAB B)

MQTT Topic for all lab events: **`lab/events`**

---

### 🧪 LAB A: Chemical Take & Return Protocol

#### Setup Requirements:
- **Hardware**: ESP32 + MFRC522 RFID Reader + HX711 Load Cell Scale.
- **Workflow**: Student scans card, takes chemical bottle from scale. ESP32 calculates weight difference and sends MQTT packet.

#### 1. Chemical Take Event:
```json
{
  "event": "taken",
  "rfidUser": "2369D694",
  "chemical": "Ethanol",
  "weight_taken": 15.5,
  "lab": "LAB_A"
}
```
* **Server Action**: Finds student **Shinya**, locates **Ethanol** bottle, logs transaction with quantity `15.5 g`, decrements inventory, and updates website logs in real-time.

#### 2. Chemical Return Event:
```json
{
  "event": "returned",
  "rfidUser": "2369D694",
  "rfidBottle": "BTL-ETOH-01",
  "weight": 1410.0,
  "lab": "LAB_A"
}
```
* **Server Action**: Finds open active checkout, calculates total quantity used, updates bottle stock, and marks status as `RETURNED`.

---

### 📋 LAB B: Student Attendance Protocol

#### Setup Requirements:
- **Hardware**: ESP32 + MFRC522 RFID Reader + 16x2 I2C LCD Display.
- **Workflow**: Student scans ID card at lab entrance. ESP32 displays confirmation on LCD and sends MQTT packet.

#### Attendance Scan Event:
```json
{
  "event": "attendance",
  "rfidUser": "2369D694",
  "lab": "LAB_B"
}
```
* **Server Action**:
  1. Updates student `lastRfidScan` timestamp in database.
  2. Inserts transaction log with `bottleId: null`, status `RETURNED`, purpose `"Lab B Attendance Check-in"`, lab `"LAB_B"`.
  3. Displays on website **Logs** tab as:
     - **Student**: Shinya (`23-ES-020`)
     - **Chemical**: `Nil`
     - **Lab**: `LAB_B`
     - **Used**: `—`
     - **Status**: `RETURNED`

---

## 💻 Complete Arduino ESP32 Firmware Codes

### Code 1: LAB B Attendance System (ESP32 + RC522 + I2C LCD)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// --- Network & MQTT ---
const char* ssid        = "YOUR_WIFI_SSID";     
const char* password    = "YOUR_WIFI_PASSWORD"; 
const char* mqtt_server = "192.168.0.106";     // PC IPv4 Address

WiFiClient espClient;
PubSubClient client(espClient);

// --- Pins ---
#define SS_PIN  15
#define RST_PIN 27

LiquidCrystal_I2C lcd(0x27, 16, 2); 
MFRC522 mfrc522(SS_PIN, RST_PIN);

// --- Timers ---
unsigned long displayMessageTimer = 0;
bool isDisplayingMessage = false;
const unsigned long MESSAGE_DURATION = 3000;
const unsigned long SCAN_COOLDOWN    = 2000;
unsigned long lastScanTime = 0;

unsigned long lastMqttRetry = 0;
const unsigned long MQTT_RETRY_INTERVAL = 5000;

void resetScreen() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Lab B Attendance");
  lcd.setCursor(0, 1);
  lcd.print("Scan ID Card...");
}

String getRFIDTag() {
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    uid += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  return uid;
}

void maintainMQTT() {
  if (client.connected()) {
    client.loop();
    return;
  }

  if (millis() - lastMqttRetry >= MQTT_RETRY_INTERVAL) {
    lastMqttRetry = millis();
    Serial.print("Connecting to MQTT [");
    Serial.print(mqtt_server);
    Serial.print("]... ");

    if (client.connect("ESP32_LabB_Device")) {
      Serial.println("✅ CONNECTED!");
    } else {
      Serial.print("❌ Failed, rc=");
      Serial.print(client.state());
      Serial.println(" (Retrying in background)");
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("SmartLab System");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");

  // SPI Pins: SCK=18, MISO=19, MOSI=23, SS=15
  SPI.begin(18, 19, 23, 15);
  delay(100);
  mfrc522.PCD_Init();
  delay(100);

  WiFi.begin(ssid, password);
  int wifiTimeout = 0;
  while (WiFi.status() != WL_CONNECTED && wifiTimeout < 20) {
    delay(500);
    wifiTimeout++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Wi-Fi Connected!");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
  }

  client.setServer(mqtt_server, 1883);
  resetScreen();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    maintainMQTT();
  }

  if (isDisplayingMessage && (millis() - displayMessageTimer >= MESSAGE_DURATION)) {
    isDisplayingMessage = false;
    resetScreen();
  }

  mfrc522.PCD_Init();

  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  if (millis() - lastScanTime < SCAN_COOLDOWN) {
    mfrc522.PICC_HaltA();
    return;
  }

  String scannedUID = getRFIDTag();
  lastScanTime = millis();

  Serial.print("💳 Attendance Card Scanned: ");
  Serial.println(scannedUID);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Success! Logged:");
  lcd.setCursor(0, 1);
  lcd.print(scannedUID);

  isDisplayingMessage = true;
  displayMessageTimer = millis();

  if (client.connected()) {
    char payload[256];
    snprintf(payload, sizeof(payload),
      "{\"event\":\"attendance\",\"rfidUser\":\"%s\",\"lab\":\"LAB_B\"}",
      scannedUID.c_str()
    );

    if (client.publish("lab/events", payload)) {
      Serial.print("📡 Published to MQTT: ");
      Serial.println(payload);
    }
  }
}
```

---

### Code 2: LAB A Multi-Chemical System (ESP32 + RC522 + 3 Load Cells)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include "HX711.h"

// --- Network & MQTT Configuration ---
const char* ssid        = "Basement";
const char* password    = "61585447";
const char* mqtt_server = "192.168.0.106"; // PC IPv4 Address

WiFiClient espClient;
PubSubClient client(espClient);

// --- Hardware Pins ---
// RFID Reader (MFRC522)
#define SS_PIN  15
#define RST_PIN 22

// Load Cell 1: Ethanol
#define LC1_DT  25
#define LC1_SCK 26
const char* CHEM1_NAME = "Ethanol";

// Load Cell 2: Hydrochloric Acid
#define LC2_DT  33
#define LC2_SCK 32
const char* CHEM2_NAME = "Hydrochloric Acid";

// Load Cell 3: Methanol
// Note: GPIO 35 is Input-Only (perfect for DT). SCK uses GPIO 14 (output).
#define LC3_DT  35
#define LC3_SCK 14
const char* CHEM3_NAME = "Methanol";

// --- Objects ---
MFRC522 mfrc522(SS_PIN, RST_PIN);
HX711 scale1;
HX711 scale2;
HX711 scale3;

// --- State Machine ---
enum SystemState { STATE_IDLE, STATE_IN_SESSION };
SystemState currentState = STATE_IDLE;

// --- Session Variables ---
String activeSessionUID = "";
float initialWeight1 = 0.0, initialWeight2 = 0.0, initialWeight3 = 0.0;
float finalWeight1   = 0.0, finalWeight2   = 0.0, finalWeight3   = 0.0;

unsigned long lastScanTime = 0; 
const unsigned long SCAN_COOLDOWN = 3000;
const float CALIBRATION_FACTOR   = 420.0;

void setup() {
  Serial.begin(115200);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");

  client.setServer(mqtt_server, 1883);

  SPI.begin(18, 19, 23, 15);
  mfrc522.PCD_Init();
  Serial.println("RFID Initialized.");

  // Initialize Load Cell 1 (Ethanol)
  scale1.begin(LC1_DT, LC1_SCK);
  scale1.set_scale(CALIBRATION_FACTOR);
  scale1.tare();

  // Initialize Load Cell 2 (Hydrochloric Acid)
  scale2.begin(LC2_DT, LC2_SCK);
  scale2.set_scale(CALIBRATION_FACTOR);
  scale2.tare();

  // Initialize Load Cell 3 (Methanol)
  scale3.begin(LC3_DT, LC3_SCK);
  scale3.set_scale(CALIBRATION_FACTOR);
  scale3.tare();

  Serial.println("\n--- SYSTEM READY: 3 Load Cells Active ---");
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32LabA")) {
      Serial.println("Connected to MQTT Broker!");
    } else {
      delay(2000);
    }
  }
}

String getRFIDTag() {
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    uid += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  mfrc522.PICC_HaltA();
  return uid;
}

void publishUsage(const char* chemical, float amountTaken) {
  char payload[256];
  snprintf(payload, sizeof(payload),
    "{\"event\":\"taken\",\"rfidUser\":\"%s\",\"chemical\":\"%s\",\"weight_taken\":%.1f,\"lab\":\"LAB_A\"}",
    activeSessionUID.c_str(), chemical, amountTaken
  );
  client.publish("lab/events", payload);
  Serial.print("📡 Published to MQTT: ");
  Serial.println(payload);
}

void loop() {
  if (!client.connected()) { reconnect(); }
  client.loop();

  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    if (millis() - lastScanTime < SCAN_COOLDOWN) {
      mfrc522.PICC_HaltA();
      return; 
    }

    String scannedUID = getRFIDTag();
    lastScanTime = millis();

    switch (currentState) {
      case STATE_IDLE:
        activeSessionUID = scannedUID;
        Serial.println("\n--- SESSION STARTED ---");
        Serial.println("User: " + activeSessionUID);

        Serial.println("Locking initial weights for all 3 load cells...");
        initialWeight1 = scale1.get_units(10);
        initialWeight2 = scale2.get_units(10);
        initialWeight3 = scale3.get_units(10);

        Serial.print("1. Ethanol Initial: "); Serial.print(initialWeight1, 1); Serial.println(" g");
        Serial.print("2. HCl Initial:     "); Serial.print(initialWeight2, 1); Serial.println(" g");
        Serial.print("3. Methanol Initial:"); Serial.print(initialWeight3, 1); Serial.println(" g");
        Serial.println("Take chemical(s). Scan card again to finish.");
        currentState = STATE_IN_SESSION;
        break;

      case STATE_IN_SESSION:
        if (scannedUID == activeSessionUID) {
          Serial.println("\n--- SESSION ENDED ---");

          finalWeight1 = scale1.get_units(10);
          finalWeight2 = scale2.get_units(10);
          finalWeight3 = scale3.get_units(10);

          float diff1 = initialWeight1 - finalWeight1;
          float diff2 = initialWeight2 - finalWeight2;
          float diff3 = initialWeight3 - finalWeight3;

          if (abs(diff1) < 0.5) diff1 = 0.0;
          if (abs(diff2) < 0.5) diff2 = 0.0;
          if (abs(diff3) < 0.5) diff3 = 0.0;

          // Publish usage for any chemical taken (> 0.5g)
          if (diff1 > 0) { publishUsage(CHEM1_NAME, diff1); }
          if (diff2 > 0) { publishUsage(CHEM2_NAME, diff2); }
          if (diff3 > 0) { publishUsage(CHEM3_NAME, diff3); }

          if (diff1 <= 0 && diff2 <= 0 && diff3 <= 0) {
            Serial.println("No chemical usage detected.");
          }

          activeSessionUID = "";
          currentState = STATE_IDLE;
          Serial.println("\n--- SYSTEM READY: Waiting for Student Login ---");
        } else {
          Serial.println("\nError: Session belongs to active user (" + activeSessionUID + ").");
        }
        break;
    }
  }
}
```

---

### Code 3: LAB B Student Attendance Check-in System (ESP32 + RC522 + 16x2 I2C LCD)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// --- Network & MQTT Configuration ---
const char* ssid        = "Basement";
const char* password    = "61585447";
const char* mqtt_server = "192.168.0.106"; 

WiFiClient espClient;
PubSubClient client(espClient);

// --- Hardware Pins ---
// RFID Reader (MFRC522)
#define SS_PIN  15
#define RST_PIN 5

// 16x2 I2C LCD Display (Address 0x27, SDA=D21, SCL=D22)
LiquidCrystal_I2C lcd(0x27, 16, 2);
MFRC522 mfrc522(SS_PIN, RST_PIN);

unsigned long lastScanTime = 0;
const unsigned long SCAN_COOLDOWN = 3000;

void setup() {
  Serial.begin(115200);

  // Initialize LCD Display
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Smart Lab Tracker");
  lcd.setCursor(0, 1);
  lcd.print("Connecting WiFi...");

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Connected!");
  delay(1000);

  client.setServer(mqtt_server, 1883);

  // Initialize SPI & MFRC522 (SS=15, RST=5)
  SPI.begin(18, 19, 23, 15);
  mfrc522.PCD_Init();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LAB B ATTENDANCE");
  lcd.setCursor(0, 1);
  lcd.print("Scan ID Card...");
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32LabB")) {
      Serial.println("✅ Connected to MQTT Broker!");
    } else {
      delay(2000);
    }
  }
}

String getRFIDTag() {
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    uid += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  return uid;
}

void publishAttendance(const String& rfidUser) {
  char payload[256];
  snprintf(payload, sizeof(payload),
    "{\"event\":\"attendance\",\"rfidUser\":\"%s\",\"lab\":\"LAB_B\"}",
    rfidUser.c_str()
  );
  client.publish("lab/events", payload);
  Serial.print("📡 Attendance Published: ");
  Serial.println(payload);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  mfrc522.PCD_Init();

  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  if (millis() - lastScanTime < SCAN_COOLDOWN) {
    mfrc522.PICC_HaltA();
    return;
  }

  String cardUID = getRFIDTag();
  lastScanTime = millis();

  Serial.print("💳 Lab B Attendance Scan: ");
  Serial.println(cardUID);

  // Update LCD Screen
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Attendance OK!");
  lcd.setCursor(0, 1);
  lcd.print("UID: " + cardUID);

  // Publish Attendance to Server (Chemical: Nil)
  publishAttendance(cardUID);

  delay(2500);

  // Reset LCD Screen for Next Student
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LAB B ATTENDANCE");
  lcd.setCursor(0, 1);
  lcd.print("Scan ID Card...");
}
```

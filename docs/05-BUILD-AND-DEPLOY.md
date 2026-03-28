# Tryllestavsprojekt: Build & Deploy Guide

This guide walks you through setting up the project locally, building both website and firmware, and deploying to hardware. It's written in "Hackaday" style — practical, hands-on, with the exact commands you need.

---

## Prerequisites

### What You Need

**For Website Development:**

- Node.js 16+ (includes npm)
- A code editor (VS Code recommended)
- A modern browser (Chrome 108+, Edge, or Samsung Internet for Web NFC)

**For Arduino Firmware:**

- Arduino CLI (command-line tool)
- Wemos D1 Mini (ESP8266) board
- PN532 or RC522 NFC reader module
- Jumper wires and breadboard
- NTAG215/216 tags for testing
- USB cable to upload sketches

**For Integration Testing:**

- A smartphone with Web NFC support (Android flagship, galaxy Note, iPhone 14+ with limited support)
- Physical NFC reader setup (PN532 + Wemos D1 Mini)

---

## Step 1: Set Up the Website

### 1.1 Clone & Navigate

```bash
# Clone the repository (if not already done)
git clone <repo-url>
cd Tryllestavsprojekt/website
```

### 1.2 Install Dependencies

```bash
npm install
```

**What this does:** Reads `package.json` and installs Vue 3, Vite, TypeScript, and other dependencies into `node_modules/`.

**Troubleshooting:**

- If you see ERESOLVE errors about peer dependencies, it's OK; the project is compatible.
- If `node_modules` is huge or corrupted, delete it and `npm install` again.

### 1.3 Run Development Server

```bash
npm run dev
```

**Output (look for):**

```
VITE v5.0.0 ready in 123 ms
➜  Local:   http://localhost:5173/
➜  press h + enter to show help
```

**What's happening:** Vite is serving your app with hot reload. Every time you edit a Vue file, the browser auto-refreshes.

### 1.4 Test It

- Open `http://localhost:5173` in your browser
- You should see the hunt progress page
- Open browser DevTools (F12) → Console for any errors
- If you see red errors, check `SETUP.md` or ask a maintainer

### 1.5 Build for Production

```bash
npm run build
```

**Output:**

```
vite v5.0.0 building for production...
✓ 123 modules transformed.
dist/index.html
dist/assets/main.abc123.js
dist/assets/style.def456.css
```

**What this does:** Minifies and bundles everything into the `dist/` folder, ready to deploy. All hunt assets from `public/hunts/` are bundled.

---

## Step 2: Set Up Arduino Development

### 2.1 Install Arduino CLI

The Arduino CLI is a command-line tool for compiling and uploading sketches.

**On Windows (PowerShell as Admin):**

```powershell
# Option A: Using winget (if you have it)
winget install Arduino.ArduinoCLI

# Option B: Manual download from https://arduino.cc/cli
# Download the .exe, add to your PATH
```

**On macOS:**

```bash
brew install arduino-cli
```

**On Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
```

**Verify installation:**

```bash
arduino-cli version
```

### 2.2 Add Wemos D1 Mini Board Support

The Wemos D1 Mini uses the ESP8266 core. Add it:

```bash
arduino-cli config init  # Initialize config (if needed)
arduino-cli core install esp8266:esp8266
```

**This may take a minute.** It downloads the ESP8266 core files.

### 2.3 Install NFC Libraries

The spot writer sketches need NFC libraries. Install them via the CLI:

```bash
# For PN532 (I2C)
arduino-cli lib install PN532

# For RC522 (SPI)
arduino-cli lib install MFRC522

# For NDEF record building
arduino-cli lib install NDEF
```

**Verify:**

```bash
arduino-cli lib list | grep -E "PN532|MFRC522|NDEF"
```

You should see all three listed.

### 2.4 Connect Wemos D1 Mini

Plug your Wemos D1 Mini into a USB port.

**Find the port:**

**Windows (PowerShell):**

```powershell
Get-SerialPort
# or check Device Manager → Ports (COM?) if the above fails
```

**macOS/Linux:**

```bash
ls /dev/ttyUSB* /dev/ttyACM*
```

**Typical outputs:**

- Windows: `COM3`, `COM6`, etc.
- macOS: `/dev/tty.wchusbserial140`
- Linux: `/dev/ttyUSB0`

**Note the port name; you'll need it in Step 2.5.**

---

## Step 3: Build & Upload Spot Writer Firmware

### 3.1 Choose Your Hardware

- **PN532 (I2C): Better for small tags** (glass ampules in wands)
  - File: `arduino/NFC_Basic/NFC_Basic.ino`
  - Wiring: D1 (SCL), D2 (SDA)

- **RC522 (SPI): Works with sticker tags** (not recommended for wands)
  - File: `arduino/RC522_Basic/RC522_Basic.ino`
  - Wiring: D5 (SCK), D7 (MOSI), D6 (MISO), D8 (SS), D3 (RST)

**We recommend PN532 for wand development.** RC522 is a fallback for prototyping with flat sticker tags.

### 3.2 Set Up Wiring

**PN532 (I2C) on Wemos D1 Mini:**

```
PN532 VCC   → D1 Mini 3V3
PN532 GND   → D1 Mini GND
PN532 SCL   → D1 Mini D1 (GPIO5)
PN532 SDA   → D1 Mini D2 (GPIO4)
```

Keep wires short (< 10 cm) and stable. Double-check: no SDA/SCL swapped!

**RC522 (SPI) on Wemos D1 Mini:**

```
RC522 VCC   → D1 Mini 3V3
RC522 GND   → D1 Mini GND
RC522 SDA   → D1 Mini D8 (GPIO15)
RC522 SCK   → D1 Mini D5 (GPIO14)
RC522 MOSI  → D1 Mini D7 (GPIO13)
RC522 MISO  → D1 Mini D6 (GPIO12)
RC522 RST   → D1 Mini D3 (GPIO0)
```

**Critical:** RC522 must run at **3.3V**, not 5V!

### 3.3 Compile the Sketch

Navigate to the sketch folder and compile:

**PN532 (I2C):**

```bash
cd Tryllestavsprojekt/arduino/NFC_Basic
arduino-cli compile --fqbn esp8266:esp8266:d1_mini .
```

**RC522 (SPI):**

```bash
cd Tryllestavsprojekt/arduino/RC522_Basic
arduino-cli compile --fqbn esp8266:esp8266:d1_mini .
```

**Expected output:**

```
Compiling sketch...
✓ Sketch compiled successfully.
```

**If compilation fails:**

- Check that all libraries are installed (Step 2.3)
- Look for missing `#include` or typos in the sketch
- Verify your board core is installed and correct (`d1_mini`)

### 3.4 Upload to Hardware

```bash
# Replace COM3 with your actual port from Step 2.4
arduino-cli upload --fqbn esp8266:esp8266:d1_mini --port COM3 .
```

**macOS example (replace `/dev/tty.wchusbserial140`):**

```bash
arduino-cli upload --fqbn esp8266:esp8266:d1_mini --port /dev/tty.wchusbserial140 .
```

**Expected output:**

```
Uploading... [==========] Done.
```

**If upload fails:**

- Check the port is correct (try different COM/tty)
- Ensure the Wemos board is selected (not Arduino Uno)
- Try pressing the reset button on the Wemos while uploading
- Check USB cable is good (some cables are power-only)

### 3.5 Open Serial Monitor

Once uploaded, open the serial monitor to see debug output:

```bash
arduino-cli monitor --port COM3 --config baudrate=115200
```

**Expected output (PN532):**

```
PN532 Initializing...
Found PN532, firmware version: 1.6
Waiting for a tag...
```

**Expected output (RC522):**

```
RC522 Initializing...
MFRC522 ready.
Waiting for a tag...
```

**Troubleshooting:**

- If you see "PN532 not detected", check I2C wiring and module orientation
- If you see garbage characters, verify baud rate is 115200
- If nothing appears, check USB port and driver installation

---

## Step 4: Test the Spot Writer with a Wand Tag

### 4.1 Prepare a Test Tag

You'll need an NTAG215 or NTAG216 tag (blank or with existing data).

**Option A: Buy tags online**

- NTAG216 sticker tags (cheap, fast)
- NTAG216 glass ampule tags (wand form factor)

**Option B: Use a card you already have**

- Some payment cards have NFC; use with caution

### 4.2 Initialize the Wand (First Time Only)

To create an official wand, it must have a metadata record. You can:

**Option 1: Using Arduino Serial Commands**

While the serial monitor is open, send:

```
setYear: 2026
```

Then tap a blank tag to the reader. The firmware will:

1. Read tag (blank → no metadata)
2. Attempt write (will refuse because no metadata)
3. Serial output: "Tag does not have x-hunt-meta. Refusing write."

This is expected — metadata must come from the website Toybox.

**Option 2: Using Website Toybox (Recommended)**

1. Open the website (`http://localhost:5173`)
2. Find the Toybox section
3. Click "Initialize New Wand"
4. Enter owner name
5. Tap blank tag to phone
6. Browser Web NFC writes metadata + record 1

The wand is now official.

### 4.3 Test Spot Collection

Once the wand is initialized (has metadata):

1. Open serial monitor (still running)
2. Set the spot ID:
   ```
   setSpot: 3
   ```
3. Tap the wand to the reader
4. Serial output should show:
   ```
   Scanning ID: 02:A1:C2:...
   Reading NDEF...
   Tag has x-hunt-meta. Proceeding.
   Searching for x-hunt:2026...
   Not found. Creating new record.
   Setting spot 3... [bit 2]
   Writing NDEF...
   Success! Spot 3 collected.
   ```
5. LED on reader (if present) blinks green

### 4.4 Verify Data on Website

1. Open website and scan the same wand
2. You should see:
   ```
   2026 Hunt Progress: 1/10 spots collected
   Collected: Spot 3
   ```

---

## Step 5: Deploy to Production

### 5.1 Website Deployment

The website is a static site; deploy to any static host:

**Option A: Netlify (Free)**

```bash
npm run build
# Then drag dist/ folder to Netlify drop zone, or:
netlify deploy --prod --dir=dist
```

**Option B: GitHub Pages**

Push your code to GitHub:

```bash
git push origin main
```

Add GitHub Actions workflow to auto-deploy on push (example in `.github/workflows/`).

**Option C: Node.js Server**

```bash
npm install -g serve
serve -s dist -l 3000
```

Then access at `http://localhost:3000`.

### 5.2 Firmware Deployment to Spots

For each physical spot reader you deploy:

1. **Check spotId and year config**

   Open the serial monitor:

   ```bash
   arduino-cli monitor --port COM3 --config baudrate=115200
   ```

2. **Set the spotId**

   Send:

   ```
   setSpot: 1
   setYear: 2026
   ```

3. **Close serial monitor and upload**

   The board will remember these settings across reboots (stored in EEPROM).

4. **Deploy to spot location**
   - Mount reader under plaque/sign
   - Feed wires through weatherproof conduit
   - Power from 5V USB adapter + extension cord

### 5.3 Hunt Asset Configuration

For the 2026 hunt:

1. Edit `website/public/hunts/2026/hunt.json`
2. Add spot definitions and images to `website/public/hunts/2026/images/`
3. Run `npm run build` to bundle
4. All spot metadata is now embedded in the website

---

## Troubleshooting Guide

### "PN532 not detected"

**Causes:**

1. I2C wiring is wrong (SDA/SCL swapped, loose, or broken)
2. PN532 module is not in I2C mode (set selector to `Channel 1 = ON`, `Channel 2 = OFF`)
3. Missing or weak pull-ups on SDA/SCL
4. Wemos doesn't have power

**Fix:**

- Verify wiring with a multimeter (continuity test)
- Check PN532 module DIP switches or jumper selector
- Try adding 4.7kΩ pull-up resistors from SDA/SCL to 3V3
- Try a different USB cable

### "Tag does not have x-hunt-meta. Refusing write."

**Cause:** The tag is not initialized as an official wand.

**Fix:**

- Initialize the tag using website Toybox (recommended)
- Or manually write metadata via serial command (advanced)

### Website shows "NFC not supported"

**Causes:**

1. Browser doesn't support Web NFC (needs Chrome 108+, Edge, or Samsung Internet)
2. HTTPS required (but `http://localhost:5173` works for dev)

**Fix:**

- Test on a supported device/browser
- Deploy website over HTTPS for production

### Serial monitor won't connect

**Causes:**

1. Wrong port selected
2. Another app is using the port
3. USB driver not installed

**Fix:**

```bash
# List all available ports
arduino-cli board list

# Kill process using the port (on Windows)
netstat -ano | findstr :COM3
taskkill /PID <PID> /F
```

---

## Development Workflow

### Making Changes to Website

1. Edit a `.vue` file in `website/src/components/` or `website/src/composables/`
2. Browser auto-refreshes due to Vite HMR
3. Check console (F12) for errors
4. When ready to test on phone: run `npm run build` and deploy

### Making Changes to Firmware

1. Edit `arduino/NFC_Basic/NFC_Basic.ino` or `arduino/RC522_Basic/RC522_Basic.ino`
2. Compile: `arduino-cli compile --fqbn esp8266:esp8266:d1_mini arduino/NFC_Basic/`
3. Upload: `arduino-cli upload --fqbn esp8266:esp8266:d1_mini --port COM3 arduino/NFC_Basic/`
4. Open serial monitor to view output
5. Test with a tag

### Adding a New Hunt Year

1. Create `website/public/hunts/2027/` folder
2. Create `website/public/hunts/2027/images/` subfolder
3. Copy and edit `website/public/hunts/2026/hunt.json`
4. Change `"year": 2026` to `"year": 2027`
5. Add new spot data and images
6. Run `npm run build`
7. Website now shows tabs for both 2026 and 2027

---

## References

- [Arduino CLI Docs](https://arduino.github.io/arduino-cli/)
- [Vite Docs](https://vitejs.dev/)
- [Web NFC API](https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API)
- [NDEF Specification](https://nfcpy.readthedocs.io/)
- Project docs: [docs/01-PROJECT-OVERVIEW.md](01-PROJECT-OVERVIEW.md), [docs/03-TECHNICAL-PROTOCOL.md](03-TECHNICAL-PROTOCOL.md)

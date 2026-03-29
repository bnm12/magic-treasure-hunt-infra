# Arduino Spot Writer — Setup & Operator Guide

This guide covers two tasks:

- **Initializing wands** — writing the metadata record to a blank NFC tag so it becomes an official magic wand
- **Configuring magic spots** — setting the spot ID and hunt year on a deployed reader

Both tasks are done from the **Management app** (`/management/`) running in Chrome on Android or a desktop browser with Web Serial support.

---

## Hardware

The spot writers run on a **LOLIN C3 Mini** (ESP32-C3) with a PN532 NFC module over I2C.

```
Pinout used by the firmware
─────────────────────────────
GPIO 8   →  SDA  (PN532)
GPIO 10  →  SCL  (PN532)
GPIO 9   →  Boot button  ← used to enable BLE
GPIO 7   →  Onboard LED  (active low)
3V3      →  VCC  (PN532)
GND      →  GND  (PN532)
```

```
C3 Mini — front view
┌─────────────────────────┐
│ EN              TX      │
│ 3                RX     │
│ 2                10 ←SCL│
│ 1                 8 ←SDA│
│ 0                 7 ←LED│
│ 4                 6     │
│ 5               GND     │
│ 3V3→VCC        VBUS     │
│      ┌──USB-C──┐        │
│ RST  └─────────┘  [9]   │ ← Boot button (BLE)
└─────────────────────────┘
```

---

## Connecting to a Spot Writer

You have two connection options: **USB** (simpler, faster) or **Bluetooth** (wireless, useful once a spot is installed).

### Option A — USB (recommended for bench setup)

1. Plug the C3 Mini into your computer or Android phone via USB-C
2. Open the Management app in Chrome
3. Go to the **Configure Spot** tab
4. Click **Connect USB**
5. Select the port that appears (usually labelled `USB JTAG/serial` or similar)
6. The terminal will show the device booting and its current config

> **Android note:** You need a USB-C OTG cable or adapter. Chrome on Android supports Web Serial.

### Option B — Bluetooth (for installed spots)

The firmware only advertises BLE when you physically press the boot button. This is intentional — it prevents the spot from being accidentally reconfigured while in use.

**To enable BLE advertising:**

1. Hold down the **GPIO9 boot button** (the right-hand button on the C3 Mini, next to the RGB LED)

```
Bottom edge of C3 Mini
        ┌────────────┐
  RST → │            │ ← [9] Hold this button
        │  USB-C  ⬤  │        for BLE
        └────────────┘
             ↑
          LED (GPIO7)
```

2. While holding the button, open the Management app and click **Connect Bluetooth**
3. Select **NFC Config** from the device list
4. You can release the button once connected — BLE stays active until disconnected

> The LED does not change when BLE is advertising (it is controlled by the NFC scanning loop). Watch the terminal instead — it will print `BLE advertising started` when ready.

---

## Initializing a Wand

A blank NTAG215 or NTAG216 tag must be initialized before it can collect spots. Initialization writes:

- **Record 1** — the companion website URL (the wand's default tap action)
- **x-hunt-meta** — the owner's name and creation year (required for spot writers to accept the wand)

### Steps

1. Open the Management app and go to the **Initialize Wand** tab
2. Enter the **owner's name** (the child's name — stored on the wand, shown on the website)
3. Select the **creation year** (the current hunt year)
4. Tap **Initialize Wand**
5. Hold the blank tag to the back of your phone

```
Phone (NFC antenna area, usually center-rear)
        ┌───────────────┐
        │               │
        │   ◎  NFC  ◎   │  ← hold tag here
        │               │
        └───────────────┘
              ↑
        NTAG216 tag
        (glass ampule or sticker)
```

6. You will see a success message and the wand is ready

> If you are initializing many wands at once, the name field clears after each successful write so you can enter the next name immediately.

---

## Configuring a Magic Spot

Each physical spot reader needs to know two things: which **spot ID** it represents and which **hunt year** it is writing for. These are stored in the device's EEPROM and survive power cycles.

### Steps

1. Connect to the spot writer (USB or Bluetooth — see above)
2. Go to the **Configure Spot** tab in the Management app
3. The terminal will automatically request the current config from the device and display it
4. Use the **Hunt Year** dropdown to select the correct year
5. Use the **Spot ID** dropdown to select the correct spot

```
Example — setting spot 3 for the 2026 hunt:

  Hunt Year  [ 2026 ▾ ]   → The Dragon's Quest
  Spot ID    [    3 ▾ ]   → The Dragon's Garden
```

6. Each selection sends the command to the device immediately and saves to EEPROM
7. The terminal confirms: `OK: spotId = 3` and `CONFIG:3,2026`

> The spot name and hunt title shown under the dropdowns come from the hunt JSON — they are just a convenience label to help you verify you have the right spot selected.

### Manual commands

If you prefer to type commands directly, use the **Send Command** field or the quick-command chips:

| Command         | Effect                                  |
| --------------- | --------------------------------------- |
| `getConfig`     | Print current spotId and huntYear       |
| `setSpot: 3`    | Set spot ID to 3 (range 1–64)           |
| `setYear: 2026` | Set hunt year to 2026 (range 2000–2100) |

---

## Verifying a Spot

After configuring, test the full loop before deploying:

1. Take an initialized wand (must have `x-hunt-meta`)
2. Hold it to the PN532 reader pad
3. Watch the terminal — a successful write looks like:

```
Tag UID(7): 04:A1:B2:C3:D4:E5:F6
Owner verified: 'Alice' (created 2026)
SUCCESS: spot 3 written to year 2026
  Payload (hex): 04 00 00 00 00 00 00 00
  Payload (binary): 00000000 ... 00000100
```

4. Open the companion website, scan the same wand, and confirm spot 3 appears as collected

### Common terminal messages

| Message                                                   | Meaning                                                 |
| --------------------------------------------------------- | ------------------------------------------------------- |
| `PN532 not detected`                                      | Check I2C wiring (SDA/SCL not swapped, power connected) |
| `Tag does not have valid wand metadata`                   | Wand is not initialized — use Initialize Wand first     |
| `Could not safely verify tag blank state; refusing write` | RF coupling was unstable during read — try again        |
| `Not NTAG21x/Ultralight (UID != 7 bytes)`                 | Wrong tag type — only NTAG215/216 are supported         |
| `BLE advertising started`                                 | Button is held, waiting for Bluetooth connection        |
| `Client connected`                                        | Bluetooth connection established, release the button    |

---

## Troubleshooting

**PN532 not detected at startup**
The firmware retries every 2 seconds and the LED toggles. Check:

- SDA → GPIO8, SCL → GPIO10 (not swapped)
- PN532 module DIP switches set to I2C mode (Channel 1 ON, Channel 2 OFF)
- Power: use 3V3, not 5V

**Bluetooth won't appear in the device list**

- The button must be held _before_ clicking Connect Bluetooth in the app
- If already connected to another device, disconnect that first
- BLE only advertises while the button is held and no client is connected

**Wand taps but nothing happens**

- Confirm the wand is initialized (scan it on the website — it should show owner name)
- Confirm the spot config is set (`getConfig` in the terminal)
- Try tapping more slowly and holding the wand still for 1–2 seconds

**Write succeeded but website shows wrong spots**

- Check the spot ID in the config matches the hunt JSON spot numbering
- Verify the hunt year matches the year folder in `public/hunts/`

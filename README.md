# WhatsApp Bot

WhatsApp Bot implementation using [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) with Bun

## Requirements

- Bun >= 1.0
- WhatsApp Account

## Installation

```bash
bun install
```

## Usage

Start with QR Login:

```bash
bun start
```

Start with Pairing Code:

```bash
bun start --use-pairing-code
```

## Project Structure

```
├── src/
│   ├── utils/
│   │   ├── atomics.ts    # Session utils
│   │   ├── message.ts    # Message utils
│   ├── index.ts         # Entry point
├── sessions/            # Auth sessions
└── wa-logs.txt         # Logs
```
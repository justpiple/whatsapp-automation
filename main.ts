import makeWASocket, {
  AnyMessageContent,
  DisconnectReason,
  WAMessageContent,
  WAMessageKey,
  delay,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  proto,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import P from "pino";
import readline from "readline";
import NodeCache from "node-cache";
import { extractMessageDetails } from "./utils/message";
import {
  getSessionPath,
  getStorePath,
  sanitizeSessionName,
} from "./utils/atomics";

// Constants
const LOGS_FILE = "wa-logs.txt";
const STORE_SAVE_INTERVAL = 10_000; // 10 seconds

// Initialize logger
const logger = P(
  { timestamp: () => `,"time":"${new Date().toJSON()}"` },
  P.destination(LOGS_FILE),
);
logger.level = "trace";

const msgRetryCounterCache = new NodeCache();

// Read line interface setup
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (text: string): Promise<string> =>
  new Promise((resolve) => rl.question(text, resolve));

async function createWhatsAppConnection(
  sessionName: string,
  store: ReturnType<typeof makeInMemoryStore>,
  usePairingCode: boolean,
) {
  const { state, saveCreds } = await useMultiFileAuthState(
    getSessionPath(sessionName),
  );

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Using WA v${version.join(".")}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: !usePairingCode,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterCache,
  });

  // Bind store to socket events
  store?.bind(sock.ev);

  // Handle pairing code if needed
  if (usePairingCode && !sock.authState.creds.registered) {
    const phoneNumber = await question("Please enter your phone number:\n");
    const code = await sock.requestPairingCode(phoneNumber);
    console.log(`Pairing code: ${code}`);
  }

  // Message sending utility
  const sendMessageWTyping = async (msg: AnyMessageContent, jid: string) => {
    await sock.presenceSubscribe(jid);
    await delay(500);

    await sock.sendPresenceUpdate("composing", jid);
    await delay(2000);

    await sock.sendPresenceUpdate("paused", jid);
    await sock.sendMessage(jid, msg);
  };

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        createWhatsAppConnection(sessionName, store, usePairingCode);
      } else {
        console.log("Connection closed. You are logged out.");
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ type, messages }) => {
    if (type === "notify") {
      for (const msg of messages) {
        try {
          const messageDetails = extractMessageDetails(msg, sock);
          console.log("Message Details:", messageDetails);

          const { from, body, reply } = messageDetails;

          if (body === "hai" && from) {
            await reply({ text: "Halo" });
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      }
    }
  });

  return sock;
}

async function getMessage(
  store: ReturnType<typeof makeInMemoryStore>,
  key: WAMessageKey,
): Promise<WAMessageContent | undefined> {
  if (store && key.remoteJid && key.id) {
    const msg = await store.loadMessage(key.remoteJid, key.id);
    return msg?.message || undefined;
  }
  return proto.Message.fromObject({});
}

async function main() {
  try {
    const usePairingCode = process.argv.includes("--use-pairing-code");

    const sessionArgIndex = process.argv.findIndex((arg) =>
      arg.startsWith("--session="),
    );

    const sessionName =
      sessionArgIndex !== -1
        ? sanitizeSessionName(
            process.argv[sessionArgIndex].split("=")[1]?.trim() || "",
          )
        : sanitizeSessionName(await question("Masukkan nama session: "));

    const store = makeInMemoryStore({ logger });
    const storePath = getStorePath(sessionName);

    store?.readFromFile(storePath);

    setInterval(() => {
      store?.writeToFile(storePath);
    }, STORE_SAVE_INTERVAL);

    await createWhatsAppConnection(sessionName, store, usePairingCode);
  } catch (error) {
    console.error("Error in main:", error);
    process.exit(1);
  }
}

// Start the application
main();

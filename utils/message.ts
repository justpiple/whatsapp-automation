import makeWASocket, {
  AnyMessageContent,
  BaileysEventMap,
  MessageType,
  WAMessageStubType,
  proto,
} from "@whiskeysockets/baileys";

export interface MessageDetails {
  from: string | null | undefined;
  sender: string | null | undefined;
  messageStubType: string;
  pushname: string | undefined;
  type: MessageType;
  body: string;
  isGroup: boolean;
  reply: (
    message: AnyMessageContent,
  ) => Promise<proto.WebMessageInfo | undefined>;
}

export const extractMessageDetails = (
  msg: BaileysEventMap["messages.upsert"]["messages"][0],
  sock: ReturnType<typeof makeWASocket>,
): MessageDetails => {
  try {
    const from = msg.key.remoteJid;
    const isGroup = !!from?.endsWith("@g.us");

    const sender = msg.key.fromMe
      ? sock.user?.id
      : isGroup
      ? msg.key.participant
      : msg.key.remoteJid;

    const messageStubType = msg.messageStubType
      ? WAMessageStubType[msg.messageStubType]
      : "MESSAGE";

    const pushname = msg.pushName ?? from?.replace(/@.+/, "");
    const type = Object.keys(msg.message || {})[0] as MessageType;
    const body = extractMessageBody(msg, type);

    const reply = async (message: AnyMessageContent) => {
      try {
        return await sock.sendMessage(from!, message, { quoted: msg });
      } catch (error) {
        console.error("Error sending reply:", error);
        throw error;
      }
    };

    return {
      from,
      sender,
      messageStubType,
      pushname,
      type,
      body,
      isGroup,
      reply,
    };
  } catch (error) {
    console.error("Error extracting message details:", error);
    throw error;
  }
};

export const extractMessageBody = (
  msg: BaileysEventMap["messages.upsert"]["messages"][0],
  type: MessageType,
): string => {
  try {
    switch (type) {
      case "conversation":
        return msg.message?.conversation || "";
      case "imageMessage":
        return msg.message?.imageMessage?.caption || "";
      case "videoMessage":
        return msg.message?.videoMessage?.caption || "";
      case "extendedTextMessage":
        return msg.message?.extendedTextMessage?.text || "";
      case "documentMessage":
        return msg.message?.documentMessage?.caption || "";
      default:
        return "";
    }
  } catch (error) {
    console.error("Error extracting message body:", error);
    return "";
  }
};

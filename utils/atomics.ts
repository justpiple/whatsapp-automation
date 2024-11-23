import path from "path";
import fs from "fs";

export const SESSION_DIR = "session";
export const STORE_DIR = "baileys_store";

export const sanitizeSessionName = (name: string): string => {
  return name.replace(/ /g, "_").replace(/[$&+,:;=?@#|'<>.^*()%!-]/g, "-");
};

const checkAndCreateDir = (dirName: string) => {
  const isAvailable = fs.existsSync(dirName);
  if (!isAvailable) fs.mkdirSync(dirName);
};

export const getStorePath = (sessionName: string): string => {
  checkAndCreateDir(STORE_DIR);
  return path.join(STORE_DIR, `${sessionName}.json`);
};

export const getSessionPath = (sessionName: string): string => {
  checkAndCreateDir(STORE_DIR);
  return path.join(SESSION_DIR, `baileys_${sessionName}`);
};

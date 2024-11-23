import path from "path";

export const SESSION_DIR = "session";
export const STORE_DIR = "baileys_store";

export const sanitizeSessionName = (name: string): string => {
  return name.replace(/ /g, "_").replace(/[$&+,:;=?@#|'<>.^*()%!-]/g, "-");
};

export const getStorePath = (sessionName: string): string => {
  return path.join(STORE_DIR, `${sessionName}.json`);
};

export const getSessionPath = (sessionName: string): string => {
  return path.join(SESSION_DIR, `baileys_${sessionName}`);
};

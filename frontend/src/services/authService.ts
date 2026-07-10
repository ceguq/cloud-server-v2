import api from "./api";

export type LoginResponse = {
  message: string;
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
};

type ClientBrowser = "Brave";

type BraveCapableNavigator = Navigator & {
  brave?: {
    isBrave?: () => boolean | Promise<boolean>;
  };
};

type LoginPayload = {
  email: string;
  password: string;
  client_browser?: ClientBrowser;
};

async function detectClientBrowser(): Promise<ClientBrowser | undefined> {
  try {
    if (typeof navigator === "undefined") return undefined;

    const brave = (navigator as BraveCapableNavigator).brave;
    if (typeof brave?.isBrave !== "function") return undefined;

    const isBrave = await Promise.race([
      Promise.resolve(brave.isBrave()),
      new Promise<boolean>((resolve) => {
        window.setTimeout(() => resolve(false), 250);
      }),
    ]);

    return isBrave ? "Brave" : undefined;
  } catch {
    return undefined;
  }
}

export const authService = {
  async login(email: string, password: string) {
    const payload: LoginPayload = {
      email,
      password,
    };

    const clientBrowser = await detectClientBrowser();
    if (clientBrowser) {
      payload.client_browser = clientBrowser;
    }

    const response = await api.post<LoginResponse>("/auth/login", payload);

    return response.data;
  },

  async logout() {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  async me() {
    const response = await api.get("/auth/me");
    return response.data;
  },
};

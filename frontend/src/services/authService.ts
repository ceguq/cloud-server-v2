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

export type ConnectedProvider = "google" | "github";

export type ProviderLinkResponse = {
  authorization_url: string;
};

export type AuthMeUser = {
  id: string | number;
  name: string;
  email: string;
  role?: string;
  has_local_password: boolean;
  connected_providers: ConnectedProvider[];
};

export type AuthMeResponse = {
  user: AuthMeUser;
};

export type UnlinkProviderResponse = {
  message: string;
  user: Pick<AuthMeUser, "has_local_password" | "connected_providers">;
};

type ClientBrowser = "Brave";

export type AccountDeleteReauthProvider = "google" | "github";

export type StartAccountDeleteReauthPayload = {
  email: string;
  provider: AccountDeleteReauthProvider;
};

export type StartAccountDeleteReauthResponse = {
  challenge: string;
  authorization_url: string;
  expires_at: string;
};

export type AccountDeleteReauthStatus =
  | "pending"
  | "verified"
  | "expired"
  | "consumed"
  | "invalid";

export type AccountDeleteReauthStatusResponse = {
  status: AccountDeleteReauthStatus;
};

export type DeleteAccountPayload = {
  email: string;
  confirm_delete: true;
  current_password?: string;
  challenge_id?: string;
};

export type DeleteAccountResponse = {
  message: string;
  status: number;
};

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

  async exchangeOAuthCode(code: string) {
    const response = await api.post<LoginResponse>("/auth/oauth/exchange", {
      code,
    });

    return response.data;
  },

  async logout() {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  async me(): Promise<AuthMeResponse> {
    const response = await api.get<AuthMeResponse>("/auth/me");
    return response.data;
  },

  async startProviderLink(provider: ConnectedProvider): Promise<ProviderLinkResponse> {
    const response = await api.post<ProviderLinkResponse>(
      `/auth/oauth/${provider}/link`,
    );

    return response.data;
  },

  async unlinkProvider(provider: ConnectedProvider): Promise<UnlinkProviderResponse> {
    const response = await api.delete<UnlinkProviderResponse>(
      `/auth/oauth/${provider}/link`,
    );

    return response.data;
  },

  async updateProfile(name: string) {
    const response = await api.patch("/profile", { name });
    return response.data;
  },

  async startAccountDeleteReauth(
    payload: StartAccountDeleteReauthPayload,
  ): Promise<StartAccountDeleteReauthResponse> {
    const response = await api.post<StartAccountDeleteReauthResponse>(
      "/account/delete-reauth",
      {
        email: payload.email,
        provider: payload.provider,
      },
    );

    return response.data;
  },

  async getAccountDeleteReauthStatus(
    challenge: string,
  ): Promise<AccountDeleteReauthStatusResponse> {
    const response = await api.get<AccountDeleteReauthStatusResponse>(
      `/account/delete-reauth/${encodeURIComponent(challenge)}/status`,
    );

    return response.data;
  },

  async deleteAccount(
    payload: DeleteAccountPayload,
  ): Promise<DeleteAccountResponse> {
    const response = await api.delete<{ message: string }>("/account", {
      data: payload,
    });

    return {
      ...response.data,
      status: response.status,
    };
  },
};

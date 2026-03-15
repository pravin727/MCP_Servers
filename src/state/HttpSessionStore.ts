import axios, { AxiosInstance } from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

export interface HttpSession {
  name: string;
  jar: CookieJar;
  client: AxiosInstance;
}

class HttpSessionStoreImpl {
  private sessions = new Map<string, HttpSession>();

  getOrCreate(name: string): HttpSession {
    const existing = this.sessions.get(name);
    if (existing) return existing;

    const jar = new CookieJar();
    const client = wrapper(
      axios.create({
        jar,
        withCredentials: true,
      }) as any,
    );

    const session: HttpSession = { name, jar, client };
    this.sessions.set(name, session);
    return session;
  }

  clear(name: string) {
    this.sessions.delete(name);
  }
}

export const HttpSessionStore = new HttpSessionStoreImpl();


const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_GET_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const OPENWA_CONFIG = {
  baseUrl: import.meta.env.OPENWA_BASE_URL,
  apiKey: import.meta.env.OPENWA_API_KEY,
};

export class OpenWAError extends Error {
  constructor(message, {
    status = null,
    data = null,
    code = null,
    retryAfter = null,
    cause = null,
  } = {}) {
    super(message);
    this.name = 'OpenWAError';
    this.status = status;
    this.data = data;
    this.code = code;
    this.retryAfter = retryAfter;
    this.cause = cause;
  }
}

class OpenWAService {
  static #instance;

  static getInstance() {
    if (!OpenWAService.#instance) {
      OpenWAService.#instance = new OpenWAService();
    }
    return OpenWAService.#instance;
  }

  constructor({ baseUrl = OPENWA_CONFIG.baseUrl, apiKey = OPENWA_CONFIG.apiKey } = {}) {
    this.baseUrl = this.#normalizeBaseUrl(baseUrl);
    this.apiKey = apiKey;
  }

  async listSessions(options = {}) {
    return this.#request('/api/sessions', {
      method: 'GET',
      ...options,
    });
  }

  async createSession(name, options = {}) {
    if (!name) {
      throw new OpenWAError('El nombre de la sesion es requerido.', { code: 'VALIDATION_ERROR' });
    }

    return this.#request('/api/sessions', {
      method: 'POST',
      body: { name },
      retries: 0,
      ...options,
    });
  }

  async startSession(sessionId, options = {}) {
    this.#assertSessionId(sessionId);

    return this.#request(`/api/sessions/${encodeURIComponent(sessionId)}/start`, {
      method: 'POST',
      retries: 1,
      ...options,
    });
  }

  async getSessionQr(sessionId, options = {}) {
    this.#assertSessionId(sessionId);

    return this.#request(`/api/sessions/${encodeURIComponent(sessionId)}/qr`, {
      method: 'GET',
      ...options,
    });
  }

  async sendText(sessionId, { chatId, text }, options = {}) {
    this.#assertSessionId(sessionId);

    if (!chatId) {
      throw new OpenWAError('El chatId es requerido.', { code: 'VALIDATION_ERROR' });
    }

    if (!text) {
      throw new OpenWAError('El texto del mensaje es requerido.', { code: 'VALIDATION_ERROR' });
    }

    return this.#request(`/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`, {
      method: 'POST',
      body: { chatId, text },
      retries: 0,
      ...options,
    });
  }

  async #request(path, options = {}) {
    this.#assertConfig();

    const {
      method = 'GET',
      body,
      headers,
      timeoutMs = DEFAULT_TIMEOUT_MS,
      retries = method === 'GET' ? DEFAULT_GET_RETRIES : 0,
      retryDelayMs = DEFAULT_RETRY_DELAY_MS,
      signal,
    } = options;

    const requestUrl = new URL(path, this.baseUrl).toString();
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      let didTimeout = false;
      const timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, timeoutMs);
      const onAbort = () => controller.abort();

      if (signal) {
        if (signal.aborted) {
          clearTimeout(timeoutId);
          throw new OpenWAError('La solicitud a OpenWA fue cancelada.', { code: 'ABORTED' });
        }
        signal.addEventListener('abort', onAbort, { once: true });
      }

      try {
        const response = await fetch(requestUrl, {
          method,
          headers: {
            Accept: 'application/json',
            'X-API-Key': this.apiKey,
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...headers,
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        const data = await this.#parseResponse(response);

        if (!response.ok) {
          throw new OpenWAError(this.#getErrorMessage(data, response.status), {
            status: response.status,
            data,
            code: data?.code || data?.error || 'OPENWA_HTTP_ERROR',
            retryAfter: response.headers.get('retry-after'),
          });
        }

        return data;
      } catch (error) {
        lastError = this.#normalizeError(error, didTimeout);

        if (attempt >= retries || !this.#shouldRetry(lastError)) {
          throw lastError;
        }

        await this.#delay(this.#getRetryDelay(retryDelayMs, attempt, lastError));
      } finally {
        clearTimeout(timeoutId);
        if (signal) {
          signal.removeEventListener('abort', onAbort);
        }
      }
    }

    throw lastError;
  }

  async #parseResponse(response) {
    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (!text) {
      return null;
    }

    if (contentType.includes('application/json')) {
      try {
        return JSON.parse(text);
      } catch (error) {
        return { message: text };
      }
    }

    return { message: text };
  }

  #getErrorMessage(data, status) {
    return data?.message || data?.error || `OpenWA respondio con estado HTTP ${status}.`;
  }

  #normalizeError(error, didTimeout = false) {
    if (error instanceof OpenWAError) {
      return error;
    }

    if (error?.name === 'AbortError') {
      if (didTimeout) {
        return new OpenWAError('La solicitud a OpenWA excedio el tiempo de espera.', {
          code: 'TIMEOUT',
          cause: error,
        });
      }

      return new OpenWAError('La solicitud a OpenWA fue cancelada.', {
        code: 'ABORTED',
        cause: error,
      });
    }

    return new OpenWAError('No se pudo conectar con OpenWA.', {
      code: 'NETWORK_ERROR',
      cause: error,
    });
  }

  #shouldRetry(error) {
    return (
      error.code === 'TIMEOUT' ||
      error.code === 'NETWORK_ERROR' ||
      RETRYABLE_STATUS_CODES.has(error.status)
    );
  }

  #getRetryDelay(baseDelayMs, attempt, error) {
    const retryAfterSeconds = this.#parseRetryAfter(error.retryAfter)
      || Number(error.data?.retryAfter || error.data?.retry_after);

    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      return retryAfterSeconds * 1000;
    }

    return baseDelayMs * (2 ** attempt);
  }

  #parseRetryAfter(retryAfter) {
    if (!retryAfter) {
      return null;
    }

    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
      return seconds;
    }

    const dateMs = Date.parse(retryAfter);
    if (Number.isNaN(dateMs)) {
      return null;
    }

    return Math.max(0, Math.ceil((dateMs - Date.now()) / 1000));
  }

  #delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  #assertConfig() {
    if (!this.baseUrl) {
      throw new OpenWAError('Falta configurar OPENWA_BASE_URL.', { code: 'MISSING_BASE_URL' });
    }

    if (!this.apiKey) {
      throw new OpenWAError('Falta configurar OPENWA_API_KEY.', { code: 'MISSING_API_KEY' });
    }
  }

  #assertSessionId(sessionId) {
    if (!sessionId) {
      throw new OpenWAError('El sessionId es requerido.', { code: 'VALIDATION_ERROR' });
    }
  }

  #normalizeBaseUrl(baseUrl) {
    return baseUrl ? baseUrl.replace(/\/+$/, '') : '';
  }
}

export default OpenWAService.getInstance();

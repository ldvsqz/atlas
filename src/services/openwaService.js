import { httpsCallable } from 'firebase/functions';
import { functions } from '../../Firebase/firebase';

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

  constructor() {
    this.callOpenWA = httpsCallable(functions, 'openWARequest');
  }

  async listSessions(options = {}) {
    return this.#call('listSessions', options);
  }

  async createSession(name, options = {}) {
    if (!name) {
      throw new OpenWAError('El nombre de la sesion es requerido.', { code: 'VALIDATION_ERROR' });
    }

    return this.#call('createSession', { name, ...options });
  }

  async startSession(sessionId, options = {}) {
    this.#assertSessionId(sessionId);
    return this.#call('startSession', { sessionId, ...options });
  }

  async getSessionQr(sessionId, options = {}) {
    this.#assertSessionId(sessionId);
    return this.#call('getSessionQr', { sessionId, ...options });
  }

  async sendText(sessionId, { chatId, text }, options = {}) {
    this.#assertSessionId(sessionId);

    if (!chatId) {
      throw new OpenWAError('El chatId es requerido.', { code: 'VALIDATION_ERROR' });
    }

    if (!text) {
      throw new OpenWAError('El texto del mensaje es requerido.', { code: 'VALIDATION_ERROR' });
    }

    return this.#call('sendText', { sessionId, chatId, text, ...options });
  }

  async #call(action, payload = {}) {
    try {
      const response = await this.callOpenWA({ action, ...payload });
      return response.data;
    } catch (error) {
      throw new OpenWAError(error.message || 'No se pudo completar la solicitud a OpenWA.', {
        code: error.code || 'OPENWA_FUNCTION_ERROR',
        data: error.details || null,
        cause: error,
      });
    }
  }

  #assertSessionId(sessionId) {
    if (!sessionId) {
      throw new OpenWAError('El sessionId es requerido.', { code: 'VALIDATION_ERROR' });
    }
  }
}

export default OpenWAService.getInstance();

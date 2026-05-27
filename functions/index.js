const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');
const { defineSecret, defineString } = require('firebase-functions/params');
const { onSchedule } = require('firebase-functions/v2/scheduler');

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const OPENWA_API_KEY = defineSecret('OPENWA_API_KEY');
const OPENWA_BASE_URL = defineString('OPENWA_BASE_URL', {
  default: 'http://34.71.177.92:2785',
});
const OPENWA_SESSION_NAME = defineString('OPENWA_SESSION_NAME', {
  default: 'iris',
});

const USERS_COLLECTION = 'users';
const NOTIFIED_COLLECTION = 'notificados';
const COUNTRY_CODE = '506';
const REQUEST_TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 500;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

exports.notifyMembershipStatus = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'America/Costa_Rica',
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '256MiB',
    secrets: [OPENWA_API_KEY],
  },
  async () => {
    const now = new Date();
    const sessionName = getOpenWASessionName();
    const stats = {
      checked: 0,
      skippedWithoutPhone: 0,
      skippedWithoutUntil: 0,
      expiredNotified: 0,
      activeNotified: 0,
      alreadyNotified: 0,
      alreadyActive: 0,
      failed: 0,
    };

    logger.info('Starting membership notification cron.', {
      sessionName,
      now: now.toISOString(),
    });

    const usersSnapshot = await db
      .collection(USERS_COLLECTION)
      .where('rol', '!=', 0)
      .get();

    for (const userDoc of usersSnapshot.docs) {
      stats.checked += 1;
      const user = { uid: userDoc.id, ...userDoc.data() };

      try {
        const phone = formatPhoneForOpenWA(user.phone);
        if (!phone) {
          stats.skippedWithoutPhone += 1;
          logger.info('Skipping member without phone.', {
            uid: user.uid,
            name: user.name || null,
          });
          continue;
        }

        const untilDate = getDateFromFirestoreValue(user.until);
        if (!untilDate) {
          stats.skippedWithoutUntil += 1;
          logger.warn('Skipping member without valid membership date.', {
            uid: user.uid,
            name: user.name || null,
          });
          continue;
        }

        const notificationRef = db.collection(NOTIFIED_COLLECTION).doc(user.uid);
        const notificationSnapshot = await notificationRef.get();
        const notification = notificationSnapshot.exists ? notificationSnapshot.data() : {};
        const isExpired = untilDate < now;
        const wasNotified = notification.notified === true;

        if (isExpired) {
          if (wasNotified) {
            stats.alreadyNotified += 1;
            continue;
          }

          await sendTextMessage(sessionName, {
            chatId: phone,
            text: buildExpiredMessage(user.name, untilDate),
          });

          await notificationRef.set(
            buildNotificationPayload(user, phone, untilDate, {
              notified: true,
              lastExpiredNotifiedAt: FieldValue.serverTimestamp(),
            }),
            { merge: true },
          );

          stats.expiredNotified += 1;
          continue;
        }

        if (!wasNotified) {
          stats.alreadyActive += 1;
          continue;
        }

        await sendTextMessage(sessionName, {
          chatId: phone,
          text: buildActiveMessage(user.name, untilDate),
        });

        await notificationRef.set(
          buildNotificationPayload(user, phone, untilDate, {
            notified: false,
            lastActiveNotifiedAt: FieldValue.serverTimestamp(),
          }),
          { merge: true },
        );

        stats.activeNotified += 1;
      } catch (error) {
        stats.failed += 1;
        logger.error('Failed to process member notification.', {
          uid: user.uid,
          name: user.name || null,
          error: serializeError(error),
        });
      }
    }

    logger.info('Finished membership notification cron.', stats);
    return stats;
  },
);

async function sendTextMessage(sessionName, { chatId, text }) {
  return openWARequest(`/api/sessions/${encodeURIComponent(sessionName)}/messages/send-text`, {
    method: 'POST',
    body: { chatId, text },
    retries: 0,
  });
}

async function openWARequest(path, { method = 'GET', body, retries = 2 } = {}) {
  const baseUrl = getOpenWABaseUrl();
  const apiKey = OPENWA_API_KEY.value();
  const url = new URL(path, baseUrl).toString();
  let lastError;

  if (!apiKey) {
    throw new Error('OPENWA_API_KEY is not configured.');
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          'X-API-Key': apiKey,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await parseOpenWAResponse(response);

      if (!response.ok) {
        const error = new Error(getOpenWAErrorMessage(data, response.status));
        error.status = response.status;
        error.data = data;
        error.retryAfter = response.headers.get('retry-after');
        throw error;
      }

      return data;
    } catch (error) {
      lastError = error;

      if (attempt >= retries || !shouldRetryOpenWA(error)) {
        throw error;
      }

      await delay(getRetryDelayMs(error, attempt));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError;
}

async function parseOpenWAResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return { message: text };
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text };
  }
}

function getOpenWAErrorMessage(data, status) {
  return data?.message || data?.error || `OpenWA responded with HTTP ${status}.`;
}

function shouldRetryOpenWA(error) {
  return error.name === 'AbortError'
    || RETRYABLE_STATUS_CODES.has(error.status)
    || error.cause?.code === 'ECONNRESET';
}

function getRetryDelayMs(error, attempt) {
  const retryAfterMs = parseRetryAfterMs(error.retryAfter);
  if (retryAfterMs !== null) {
    return retryAfterMs;
  }

  return RETRY_DELAY_MS * (2 ** attempt);
}

function parseRetryAfterMs(retryAfter) {
  if (!retryAfter) {
    return null;
  }

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const dateMs = Date.parse(retryAfter);
  if (Number.isNaN(dateMs)) {
    return null;
  }

  return Math.max(0, dateMs - Date.now());
}

function buildNotificationPayload(user, phone, untilDate, overrides) {
  return {
    uid: user.uid,
    name: user.name || '',
    phone,
    lastUntil: admin.firestore.Timestamp.fromDate(untilDate),
    updatedAt: FieldValue.serverTimestamp(),
    ...overrides,
  };
}

function buildExpiredMessage(name, untilDate) {
  return `Hola, ${getDisplayName(name)}. Esperamos que estés muy bien. Tu membresía venció el ${formatDate(untilDate)}. Te invitamos a renovarla para continuar con tus entrenamientos.`;
}

function buildActiveMessage(name, untilDate) {
  return `Hola, ${getDisplayName(name)}. Tu membresía está activa hasta el ${formatDate(untilDate)}. Ya podés continuar entrenando con normalidad.`;
}

function getDisplayName(name) {
  return name || 'atleta';
}

function formatDate(date) {
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Costa_Rica',
  }).format(date);
}

function formatPhoneForOpenWA(phone) {
  if (!phone) {
    return null;
  }

  const cleaned = phone.toString().replace(/\D/g, '');
  if (!cleaned) {
    return null;
  }

  const fullNumber = cleaned.startsWith(COUNTRY_CODE)
    ? cleaned
    : `${COUNTRY_CODE}${cleaned}`;

  return `${fullNumber}@c.us`;
}

function getDateFromFirestoreValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6));
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getOpenWABaseUrl() {
  return OPENWA_BASE_URL.value().replace(/\/+$/, '');
}

function getOpenWASessionName() {
  return OPENWA_SESSION_NAME.value() || 'iris';
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function serializeError(error) {
  return {
    message: error.message,
    name: error.name,
    status: error.status || null,
    data: error.data || null,
  };
}

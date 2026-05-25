import { Injectable, effect, inject, signal } from '@angular/core';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Event payload shape received from the backend's SSE endpoint
 * (`GET /events`). Keep in sync with `DomainEvent.java`.
 */
export interface DomainEvent {
  id: string;
  type: string;
  at: string;
  actionId: number | null;
  userId: number | null;
  payload: Record<string, unknown>;
}

/**
 * Live event stream client backed by the browser's `EventSource`.
 *
 * <h3>Why a singleton, signal-driven service</h3>
 * One {@link EventSource} per browser tab is enough — every page subscribes
 * to the same {@link lastEvent} signal and filters by topic via {@link on}.
 * Auth changes drive (re)connection through an `effect` so logging in/out
 * tears the stream down without leaking sockets.
 *
 * <h3>Reconnect strategy</h3>
 * `EventSource` reconnects on its own for normal network drops, but it
 * gives up on 401/4xx. We watch `onerror` and rebuild the socket with
 * exponential backoff capped at 30 s. If the token has expired (401),
 * `AuthService.isAuthenticated()` returns false and `AuthService.logout()`
 * fires, which will null the token and the effect tears the stream down.
 */
@Injectable({ providedIn: 'root' })
export class EventsService {
  private auth = inject(AuthService);

  readonly connected = signal(false);
  /** Last event received. Components watch this with `effect()`. */
  readonly lastEvent = signal<DomainEvent | null>(null);

  private es: EventSource | null = null;
  private retry = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  /** Topic listeners. Keys can be exact types ("action.created") or prefixes ending in `.` ("action."). */
  private listeners = new Map<string, Set<(e: DomainEvent) => void>>();

  constructor() {
    effect(() => {
      const tok = this.auth.token();
      if (tok && this.auth.isAuthenticated()) this.connect(tok);
      else this.disconnect();
    });
  }

  /**
   * Subscribe to a topic. Pass either an exact type
   * (`"action.created"`) or a prefix ending in `.` (`"action."`).
   * Returns an unsubscribe function — call it in `ngOnDestroy`.
   */
  on(topic: string, handler: (event: DomainEvent) => void): () => void {
    let set = this.listeners.get(topic);
    if (!set) {
      set = new Set();
      this.listeners.set(topic, set);
    }
    set.add(handler);
    return () => {
      set!.delete(handler);
      if (set!.size === 0) this.listeners.delete(topic);
    };
  }

  private connect(token: string): void {
    // Re-use the existing connection if it's still healthy.
    if (this.es && this.es.readyState !== EventSource.CLOSED) return;

    const url = `${environment.apiUrl}/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    this.es = es;

    es.onopen = () => {
      this.connected.set(true);
      this.retry = 0;
    };

    // Generic message handler — fires when the server sends an event with no `event:` name field.
    es.onmessage = (msg) => this.handleRaw(msg.data);

    // We named our events server-side ("action.created", "post.created", …),
    // so EventSource dispatches them as custom event listeners. Each topic
    // we care about MUST be registered explicitly here, or the browser
    // silently drops it (`onmessage` only fires for unnamed events). Add
    // new event types here whenever a new backend topic is introduced.
    const named = [
      'hello',
      'action.created', 'action.updated', 'action.closed', 'action.deleted', 'action.seats.changed',
      'registration.created', 'registration.cancelled',
      'proposal.created', 'proposal.status.changed',
      'post.created', 'post.deleted',
      'comment.created', 'comment.deleted',
      'reaction.changed',
      'chat.message.sent',
    ];
    for (const name of named) {
      es.addEventListener(name, (msg) => this.handleRaw((msg as MessageEvent).data));
    }

    es.onerror = () => {
      this.connected.set(false);
      // EventSource will auto-retry for transient errors, but if the
      // server returned 401 we end up in CLOSED state — manually reconnect
      // with backoff in that case.
      if (es.readyState === EventSource.CLOSED) {
        this.scheduleReconnect();
      }
    };
  }

  private handleRaw(raw: unknown): void {
    if (typeof raw !== 'string') return;
    let parsed: DomainEvent;
    try {
      parsed = JSON.parse(raw) as DomainEvent;
    } catch {
      return;
    }
    this.lastEvent.set(parsed);

    // Exact listeners
    const exact = this.listeners.get(parsed.type);
    if (exact) for (const fn of exact) fn(parsed);

    // Prefix listeners (e.g. "action.") — anyone subscribing to a family.
    for (const [topic, set] of this.listeners.entries()) {
      if (topic.endsWith('.') && parsed.type.startsWith(topic)) {
        for (const fn of set) fn(parsed);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.retryTimer) return;
    const delay = Math.min(30_000, 500 * Math.pow(2, this.retry++));
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      const tok = this.auth.getToken();
      if (tok && this.auth.isAuthenticated()) this.connect(tok);
    }, delay);
  }

  private disconnect(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.es) {
      this.es.close();
      this.es = null;
    }
    this.connected.set(false);
    this.retry = 0;
  }
}

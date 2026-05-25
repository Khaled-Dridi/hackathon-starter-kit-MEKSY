import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { AuthService } from '../core/auth.service';
import { EventsService, DomainEvent } from '../core/events.service';
import { FeedPost, FeedService, ReactionType } from '../core/feed.service';
import { MediaPickerComponent, MediaSelection } from './media-picker.component';

/**
 * Discussion wall embedded under each action.
 *
 * <h3>Order of things on screen</h3>
 * 1. Composer (write text, optionally pick media, post)
 * 2. Stream of posts, newest first. Each post: author chip + body +
 *    embedded media + reaction bar + comments thread + delete (own).
 *
 * <h3>Real-time</h3>
 * Subscribes to `post.*`, `comment.*`, `reaction.changed` events scoped
 * to the current actionId and debounces a refresh (200 ms) — same pattern
 * as actions-list and the rest of the app.
 */
@Component({
  selector: 'app-action-feed',
  standalone: true,
  imports: [DatePipe, FormsModule, MediaPickerComponent],
  template: `
    <section class="feed">
      <header class="feed__head">
        <h2>Discussion</h2>
        <span class="meta">{{ posts().length }} {{ posts().length === 1 ? 'post' : 'posts' }}</span>
      </header>

      <!-- Composer -->
      <div class="composer">
        <div class="composer__row">
          <span class="avatar" [style.background]="navy">{{ initials(myEmail()) }}</span>
          <textarea class="composer__input"
                    [(ngModel)]="draftBody" rows="2"
                    placeholder="Share something with the people coming to this action…"></textarea>
        </div>

        @if (mediaOpen()) {
          <div class="composer__media">
            <app-media-picker [value]="draftMedia" (valueChange)="draftMedia = $event" />
          </div>
        }

        <div class="composer__actions">
          <button type="button" class="link-btn" (click)="mediaOpen.set(!mediaOpen())">
            <i class="pi pi-image"></i>
            {{ mediaOpen() ? 'Hide media' : 'Add image / video' }}
          </button>
          <div class="composer__right">
            @if (submitError()) {
              <span class="err-inline">{{ submitError() }}</span>
            }
            <button class="btn btn--primary btn--sm" type="button"
                    [disabled]="!canPost() || submitting()"
                    (click)="submit()">
              @if (submitting()) { Posting… } @else { Post }
            </button>
          </div>
        </div>
      </div>

      <!-- Posts -->
      @if (loading()) {
        <p class="muted" style="padding: 24px 0;">Loading discussion…</p>
      } @else if (posts().length === 0) {
        <p class="empty">
          No posts yet. Be the first to start the conversation.
        </p>
      } @else {
        <ul class="post-list">
          @for (p of posts(); track p.id) {
            <li class="post">
              <div class="post__head">
                <span class="avatar" [style.background]="navy">{{ initials(p.authorEmail) }}</span>
                <div class="post__author">
                  <span class="post__name">{{ p.authorEmail }}</span>
                  <span class="post__time">{{ p.createdAt | date:'MMM d, HH:mm' }}</span>
                </div>
                @if (p.authorId === myUserId() || isAdmin()) {
                  <button type="button" class="post__del" (click)="deletePost(p)"
                          title="Delete post">
                    <i class="pi pi-trash"></i>
                  </button>
                }
              </div>

              @if (p.body) {
                <p class="post__body">{{ p.body }}</p>
              }

              @if (p.mediaUrl) {
                <div class="post__media">
                  @if (p.mediaType === 'video' && isYoutube(p.mediaUrl)) {
                    <iframe [src]="youtubeEmbed(p.mediaUrl)" frameborder="0"
                            allow="encrypted-media; picture-in-picture"
                            allowfullscreen></iframe>
                  } @else if (p.mediaType === 'video') {
                    <video [src]="p.mediaUrl" controls></video>
                  } @else {
                    <img [src]="p.mediaUrl" alt="" loading="lazy" />
                  }
                </div>
              }

              <!-- Reaction bar -->
              <div class="reactions">
                @for (r of REACTIONS; track r.type) {
                  <button type="button" class="react-btn"
                          [class.is-mine]="p.myReaction === r.dbKey"
                          (click)="toggleReaction(p, r.type, r.dbKey)"
                          [title]="r.label">
                    <span class="react-emoji">{{ r.emoji }}</span>
                    @if (p.reactionCounts[r.dbKey]) {
                      <span class="react-count">{{ p.reactionCounts[r.dbKey] }}</span>
                    }
                  </button>
                }
              </div>

              <!-- Comments -->
              <div class="comments">
                @if (p.comments.length > 0) {
                  @for (c of p.comments; track c.id) {
                    <div class="comment">
                      <span class="avatar avatar--sm" [style.background]="navy">{{ initials(c.authorEmail) }}</span>
                      <div class="comment__body">
                        <div class="comment__head">
                          <span class="comment__name">{{ c.authorEmail }}</span>
                          <span class="comment__time">{{ c.createdAt | date:'MMM d, HH:mm' }}</span>
                          @if (c.authorId === myUserId() || isAdmin()) {
                            <button type="button" class="comment__del" (click)="deleteComment(p, c.id)"
                                    title="Delete comment">
                              <i class="pi pi-times"></i>
                            </button>
                          }
                        </div>
                        <p class="comment__text">{{ c.body }}</p>
                      </div>
                    </div>
                  }
                }
                <div class="comment-composer">
                  <span class="avatar avatar--sm" [style.background]="navy">{{ initials(myEmail()) }}</span>
                  <input type="text" class="comment-input"
                         [(ngModel)]="commentDrafts[p.id]"
                         placeholder="Write a comment…"
                         (keydown.enter)="sendComment(p)" />
                  <button class="btn btn--secondary btn--sm" type="button"
                          [disabled]="!commentDrafts[p.id]?.trim() || commentBusy() === p.id"
                          (click)="sendComment(p)">
                    Send
                  </button>
                </div>
              </div>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .feed { display: flex; flex-direction: column; gap: 16px; }
    .feed__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      border-top: 1px solid var(--border);
      padding-top: 24px;
    }
    .feed__head h2 {
      font-size: 20px;
      letter-spacing: -0.01em;
      font-weight: 600;
      color: var(--navy);
      margin: 0;
    }
    .meta { color: var(--text-muted); font-size: 13px; }

    /* Composer */
    .composer {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 14px 16px;
    }
    .composer__row { display: flex; gap: 12px; align-items: flex-start; }
    .composer__input {
      flex: 1;
      border: 0;
      background: transparent;
      resize: vertical;
      font: 14px/1.55 'Inter', system-ui, sans-serif;
      color: var(--text);
      min-height: 40px;
    }
    .composer__input:focus { outline: 0; }
    .composer__media { margin-top: 12px; }
    .composer__actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .composer__right { display: flex; align-items: center; gap: 10px; }
    .err-inline { color: #8B1F1F; font-size: 12px; }

    .link-btn {
      appearance: none;
      background: transparent;
      border: 0;
      color: var(--navy);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      padding: 0;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .link-btn:hover { text-decoration: underline; }
    .link-btn i { font-size: 12px; }

    /* Avatar */
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      color: white;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12.5px;
      font-weight: 600;
      letter-spacing: 0.04em;
      flex-shrink: 0;
    }
    .avatar--sm { width: 26px; height: 26px; font-size: 10.5px; }

    /* Posts */
    .post-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
    .post {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 14px 16px;
    }
    .post__head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .post__author { display: flex; flex-direction: column; line-height: 1.2; flex: 1; min-width: 0; }
    .post__name { color: var(--text); font-weight: 500; font-size: 13.5px; }
    .post__time { color: var(--text-muted); font-size: 12px; }
    .post__del {
      appearance: none; background: transparent; border: 0;
      color: var(--text-subtle); cursor: pointer;
      width: 28px; height: 28px; border-radius: 50%;
    }
    .post__del:hover { background: var(--surface); color: #8B1F1F; }
    .post__del i { font-size: 12px; }

    .post__body { margin: 0 0 12px; font-size: 14.5px; line-height: 1.55; color: var(--text); white-space: pre-wrap; }
    .post__media {
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--surface-2);
      margin-bottom: 12px;
      max-height: 480px;
    }
    .post__media img, .post__media video, .post__media iframe {
      width: 100%;
      max-height: 480px;
      display: block;
      object-fit: contain;
      background: #000;
      border: 0;
    }
    .post__media iframe { aspect-ratio: 16 / 9; height: auto; }

    /* Reactions */
    .reactions {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      padding-top: 8px;
      border-top: 1px solid var(--border);
    }
    .react-btn {
      appearance: none;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 999px;
      padding: 4px 10px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 13px;
      color: var(--text-muted);
      transition: background 0.12s, border-color 0.12s;
    }
    .react-btn:hover { background: var(--surface); }
    .react-btn.is-mine {
      background: var(--yellow-soft);
      border-color: rgba(244, 228, 67, 0.6);
      color: var(--navy);
      font-weight: 500;
    }
    .react-emoji { font-size: 15px; line-height: 1; }
    .react-count { font-variant-numeric: tabular-nums; font-size: 12.5px; }

    /* Comments */
    .comments { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }
    .comment { display: flex; gap: 10px; align-items: flex-start; }
    .comment__body {
      flex: 1;
      background: var(--surface);
      padding: 8px 12px 10px;
      border-radius: 14px;
      min-width: 0;
    }
    .comment__head {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 2px;
    }
    .comment__name { color: var(--navy); font-weight: 500; font-size: 12.5px; }
    .comment__time { color: var(--text-muted); font-size: 11.5px; }
    .comment__del {
      margin-left: auto;
      appearance: none; background: transparent; border: 0;
      color: var(--text-subtle); cursor: pointer;
      width: 20px; height: 20px; border-radius: 50%;
    }
    .comment__del:hover { color: #8B1F1F; }
    .comment__del i { font-size: 10px; }
    .comment__text { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--text); white-space: pre-wrap; }

    .comment-composer {
      display: flex;
      gap: 10px;
      align-items: center;
      padding-top: 4px;
    }
    .comment-input {
      flex: 1;
      height: 36px;
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface);
      font: 13px 'Inter', system-ui, sans-serif;
      color: var(--text);
    }
    .comment-input:focus {
      outline: 0;
      background: var(--white);
      border-color: var(--navy);
    }

    .empty {
      padding: 36px 0;
      text-align: center;
      color: var(--text-muted);
      font-size: 13.5px;
    }
  `]
})
export class ActionFeedComponent implements OnInit, OnChanges, OnDestroy {
  @Input() actionId!: number;

  private feed = inject(FeedService);
  private auth = inject(AuthService);
  private events = inject(EventsService);
  private sanitizer = inject(DomSanitizer);

  readonly navy = '#202C50';

  /** Static metadata for the reaction bar, in display order. */
  readonly REACTIONS: { type: ReactionType; dbKey: string; emoji: string; label: string }[] = [
    { type: 'LIKE',  dbKey: 'like',  emoji: '👍', label: 'Like' },
    { type: 'LOVE',  dbKey: 'love',  emoji: '❤️', label: 'Love' },
    { type: 'HAHA',  dbKey: 'haha',  emoji: '😂', label: 'Haha' },
    { type: 'WOW',   dbKey: 'wow',   emoji: '😮', label: 'Wow' },
    { type: 'SAD',   dbKey: 'sad',   emoji: '😢', label: 'Sad' },
    { type: 'ANGRY', dbKey: 'angry', emoji: '😡', label: 'Angry' },
  ];

  readonly posts = signal<FeedPost[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly mediaOpen = signal(false);
  readonly commentBusy = signal<number | null>(null);

  draftBody = '';
  draftMedia: MediaSelection | null = null;
  /** One per post id — keyed inputs for comment composers. */
  commentDrafts: Record<number, string> = {};

  readonly myUserId = computed(() => {
    const sub = this.auth.payload()?.sub;
    return sub ? Number(sub) : null;
  });
  readonly myEmail = computed(() => this.auth.email() ?? 'me@local');
  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));

  /**
   * Plain method, NOT a `computed()` — depends on `draftBody` / `draftMedia`
   * which are non-signal properties bound via ngModel. A computed signal
   * would only re-run when signals it reads change, so it'd stay at its
   * initial value (false) forever and the Post button would never enable.
   * Method form is re-evaluated by Angular every change-detection cycle.
   */
  canPost(): boolean {
    return this.draftBody.trim().length > 0 || !!this.draftMedia;
  }

  /** SSE refresh handles + debounce. */
  private offEvents: Array<() => void> = [];
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.refresh();
    const relevant = (ev: DomainEvent) =>
      ev.actionId !== null && ev.actionId === this.actionId;
    this.offEvents.push(
      this.events.on('post.',     (ev) => { if (relevant(ev)) this.scheduleRefresh(); }),
      this.events.on('comment.',  (ev) => { if (relevant(ev)) this.scheduleRefresh(); }),
      this.events.on('reaction.', (ev) => { if (relevant(ev)) this.scheduleRefresh(); }),
    );
  }

  ngOnChanges(c: SimpleChanges): void {
    if (c['actionId'] && !c['actionId'].firstChange) this.refresh();
  }

  ngOnDestroy(): void {
    this.offEvents.forEach((off) => off());
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.refresh();
    }, 200);
  }

  refresh(): void {
    this.feed.list(this.actionId).subscribe({
      next: (data) => { this.posts.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  submit(): void {
    if (!this.canPost() || this.submitting()) return;
    this.submitting.set(true);
    this.submitError.set(null);
    this.feed.createPost(this.actionId, {
      body: this.draftBody.trim() || undefined,
      mediaUrl: this.draftMedia?.url ?? null,
      mediaType: this.draftMedia?.kind ?? null,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.draftBody = '';
        this.draftMedia = null;
        this.mediaOpen.set(false);
        // Optimistic: SSE will also refresh, but doing one here keeps the
        // post visible to the author even if SSE is briefly down.
        this.refresh();
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(err?.error?.message ?? 'Could not post.');
      },
    });
  }

  deletePost(p: FeedPost): void {
    if (!confirm('Delete this post?')) return;
    this.feed.deletePost(p.id).subscribe({
      next: () => this.refresh(),
    });
  }

  toggleReaction(p: FeedPost, type: ReactionType, dbKey: string): void {
    // Click the same emoji you already chose → clear it. Otherwise set/replace.
    const action$ = p.myReaction === dbKey
      ? this.feed.clearReaction(p.id)
      : this.feed.setReaction(p.id, type);
    action$.subscribe({ next: () => this.refresh() });
  }

  sendComment(p: FeedPost): void {
    const draft = (this.commentDrafts[p.id] ?? '').trim();
    if (!draft) return;
    this.commentBusy.set(p.id);
    this.feed.addComment(p.id, draft).subscribe({
      next: () => {
        this.commentBusy.set(null);
        this.commentDrafts[p.id] = '';
        this.refresh();
      },
      error: () => this.commentBusy.set(null),
    });
  }

  deleteComment(p: FeedPost, commentId: number): void {
    if (!confirm('Delete this comment?')) return;
    this.feed.deleteComment(commentId).subscribe({ next: () => this.refresh() });
  }

  // ---- media renderer helpers ----

  isYoutube(url: string): boolean {
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/)/.test(url);
  }

  youtubeEmbed(url: string): SafeResourceUrl {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
    const embed = m ? `https://www.youtube.com/embed/${m[1]}` : url;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embed);
  }

  // ---- avatar helper ----

  initials(email: string | null | undefined): string {
    if (!email) return '??';
    const local = email.split('@')[0];
    const parts = local.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return local.slice(0, 2).toUpperCase();
  }
}

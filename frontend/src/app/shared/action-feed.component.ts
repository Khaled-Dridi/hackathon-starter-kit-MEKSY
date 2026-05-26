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
import { I18nService } from '../core/i18n.service';
import { MediaPickerComponent, MediaSelection } from './media-picker.component';

@Component({
  selector: 'app-action-feed',
  standalone: true,
  imports: [DatePipe, FormsModule, MediaPickerComponent],
  template: `
    <section class="feed">
      <header class="feed__head">
        <h2 class="section-title">{{ i18n.t('feed.title') }}</h2>
        <span class="muted" style="font-size: 0.875rem;">{{ posts().length }} {{ posts().length === 1 ? i18n.t('feed.posts.singular') : i18n.t('feed.posts.plural') }}</span>
      </header>

      <div class="feed-composer">
        <div class="feed-composer__row">
          <span class="avatar avatar--md" [class]="avatarColor(myEmail())">{{ initials(myEmail()) }}</span>
          <textarea class="feed-composer__input"
                    [(ngModel)]="draftBody" rows="2"
                    [placeholder]="i18n.t('feed.composer.placeholder')"></textarea>
        </div>

        @if (mediaOpen()) {
          <div class="feed-composer__media">
            <app-media-picker [value]="draftMedia" (valueChange)="draftMedia = $event" />
          </div>
        }

        <div class="feed-composer__actions">
          <button type="button" class="feed-link-btn" (click)="mediaOpen.set(!mediaOpen())">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            {{ mediaOpen() ? i18n.t('feed.composer.hideMedia') : i18n.t('feed.composer.addMedia') }}
          </button>
          <div class="feed-composer__right">
            @if (submitError()) {
              <span class="err-inline">{{ submitError() }}</span>
            }
            <button class="btn btn--primary btn--sm" type="button"
                    [disabled]="!canPost() || submitting()"
                    [class.btn--loading]="submitting()"
                    (click)="submit()">
              {{ i18n.t('feed.composer.post') }}
            </button>
          </div>
        </div>
      </div>

      @if (loading()) {
        <p class="muted" style="padding: 24px 0;">{{ i18n.t('feed.loading') }}</p>
      } @else if (posts().length === 0) {
        <p class="feed-empty">
          {{ i18n.t('feed.empty') }}
        </p>
      } @else {
        <ul class="feed-post-list">
          @for (p of posts(); track p.id) {
            <li class="feed-post">
              <div class="feed-post__head">
                <span class="avatar avatar--md" [class]="avatarColor(p.authorEmail)">{{ initials(p.authorEmail) }}</span>
                <div class="feed-post__author">
                  <span class="feed-post__name">{{ p.authorEmail }}</span>
                  <span class="feed-post__time">{{ p.createdAt | date:'MMM d, HH:mm':'':i18n.locale() }}</span>
                </div>
                @if (p.authorId === myUserId() || isAdmin()) {
                  <button type="button" class="feed-post__del" (click)="deletePost(p)" [title]="i18n.t('feed.post.delete.aria')" [attr.aria-label]="i18n.t('feed.post.delete.aria')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>
                }
              </div>

              @if (p.body) {
                <p class="feed-post__body">{{ p.body }}</p>
              }

              @if (p.mediaUrl) {
                <div class="feed-post__media">
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

              <div class="feed-reactions">
                @for (r of REACTIONS; track r.type) {
                  <button type="button" class="feed-react-btn"
                          [class.is-mine]="p.myReaction === r.dbKey"
                          (click)="toggleReaction(p, r.type, r.dbKey)"
                          [title]="i18n.t(r.labelKey)">
                    <span class="feed-react-emoji">{{ r.emoji }}</span>
                    @if (p.reactionCounts[r.dbKey]) {
                      <span class="feed-react-count">{{ p.reactionCounts[r.dbKey] }}</span>
                    }
                  </button>
                }
              </div>

              <div class="feed-comments">
                @if (p.comments.length > 0) {
                  @for (c of p.comments; track c.id) {
                    <div class="feed-comment">
                      <span class="avatar avatar--sm" [class]="avatarColor(c.authorEmail)">{{ initials(c.authorEmail) }}</span>
                      <div class="feed-comment__body">
                        <div class="feed-comment__head">
                          <span class="feed-comment__name">{{ c.authorEmail }}</span>
                          <span class="feed-comment__time">{{ c.createdAt | date:'MMM d, HH:mm':'':i18n.locale() }}</span>
                          @if (c.authorId === myUserId() || isAdmin()) {
                            <button type="button" class="feed-comment__del" (click)="deleteComment(p, c.id)" [title]="i18n.t('feed.comment.delete.aria')" [attr.aria-label]="i18n.t('feed.comment.delete.aria')">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          }
                        </div>
                        <p class="feed-comment__text">{{ c.body }}</p>
                      </div>
                    </div>
                  }
                }
                <div class="feed-comment-composer">
                  <span class="avatar avatar--sm" [class]="avatarColor(myEmail())">{{ initials(myEmail()) }}</span>
                  <input type="text" class="feed-comment-input"
                         [(ngModel)]="commentDrafts[p.id]"
                         [placeholder]="i18n.t('feed.comment.placeholder')"
                         (keydown.enter)="sendComment(p)" />
                  <button class="btn btn--secondary btn--sm" type="button"
                          [disabled]="!commentDrafts[p.id]?.trim() || commentBusy() === p.id"
                          [class.btn--loading]="commentBusy() === p.id"
                          (click)="sendComment(p)">
                    {{ i18n.t('feed.comment.send') }}
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
    .feed { display: flex; flex-direction: column; gap: 16px; margin-top: 32px; }
    .feed__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      border-top: 1px solid var(--line);
      padding-top: 24px;
      margin: 0;
    }
    .feed__head h2 { margin: 0; }

    .feed-composer {
      display: block;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r-card);
      padding: 16px 18px;
      box-shadow: var(--sh-card);
    }
    .feed-composer__row { display: flex; gap: 12px; align-items: flex-start; }
    .feed-composer__input {
      flex: 1;
      border: 0;
      background: transparent;
      resize: vertical;
      font: 0.9375rem/1.55 var(--font-sans);
      color: var(--ink);
      min-height: 44px;
      padding: 8px 0;
    }
    .feed-composer__input:focus { outline: 0; }
    .feed-composer__input::placeholder { color: var(--muted-2); }
    .feed-composer__media { margin-top: 12px; }
    .feed-composer__actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .feed-composer__right { display: flex; align-items: center; gap: 10px; }
    .err-inline { color: var(--danger); font-size: 0.8125rem; }

    .feed-link-btn {
      background: transparent;
      border: 0;
      color: var(--ink);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      padding: 6px 10px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background var(--t-hover) var(--ease);
    }
    .feed-link-btn:hover { background: var(--bg); }

    .feed-post-list {
      list-style: none; padding: 0; margin: 0;
      display: flex; flex-direction: column; gap: 14px;
    }
    .feed-post {
      display: block;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r-card);
      padding: 18px 20px;
      box-shadow: var(--sh-card);
    }
    .feed-post__head {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .feed-post__author {
      display: flex; flex-direction: column; line-height: 1.25;
      flex: 1; min-width: 0;
    }
    .feed-post__name { color: var(--ink); font-weight: 600; font-size: 0.9375rem; }
    .feed-post__time { color: var(--muted); font-size: 0.8125rem; }
    .feed-post__del {
      background: transparent; border: 0;
      color: var(--muted-2); cursor: pointer;
      width: 32px; height: 32px; border-radius: 8px;
      display: inline-flex; align-items: center; justify-content: center;
      transition: background var(--t-hover) var(--ease), color var(--t-hover) var(--ease);
    }
    .feed-post__del:hover { background: var(--danger-bg); color: var(--danger); }

    .feed-post__body {
      margin: 0 0 14px;
      font-size: 0.9375rem;
      line-height: 1.6;
      color: var(--ink);
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .feed-post__media {
      border-radius: 12px;
      overflow: hidden;
      background: var(--surface-2);
      margin-bottom: 14px;
      max-height: 480px;
      border: 1px solid var(--line);
    }
    .feed-post__media img,
    .feed-post__media video,
    .feed-post__media iframe {
      width: 100%;
      max-height: 480px;
      display: block;
      object-fit: contain;
      background: #000;
      border: 0;
    }
    .feed-post__media iframe { aspect-ratio: 16 / 9; height: auto; }

    .feed-reactions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      padding-top: 12px;
      border-top: 1px solid var(--line);
    }
    .feed-react-btn {
      background: var(--bg);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 5px 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8125rem;
      color: var(--ink);
      transition: all var(--t-hover) var(--ease);
    }
    .feed-react-btn:hover { background: var(--surface); border-color: var(--line-2); }
    .feed-react-btn.is-mine {
      background: var(--surface);
      border-color: var(--accent);
      color: var(--ink);
      box-shadow: 0 0 0 2px rgba(244,228,67,.35);
    }
    .feed-react-emoji { font-size: 1rem; line-height: 1; }
    .feed-react-count { font-variant-numeric: tabular-nums; font-size: 0.8125rem; font-weight: 500; }

    .feed-comments {
      display: flex; flex-direction: column;
      gap: 10px;
      margin-top: 14px;
      padding-left: 0;
    }
    .feed-comment {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }
    .feed-comment__body {
      flex: 1;
      background: var(--bg);
      padding: 8px 12px 10px;
      border-radius: 14px;
      min-width: 0;
    }
    .feed-comment__head {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 2px;
    }
    .feed-comment__name { color: var(--ink); font-weight: 600; font-size: 0.8125rem; }
    .feed-comment__time { color: var(--muted); font-size: 0.75rem; }
    .feed-comment__del {
      margin-left: auto;
      background: transparent; border: 0;
      color: var(--muted-2); cursor: pointer;
      width: 22px; height: 22px; border-radius: 6px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .feed-comment__del:hover { background: var(--danger-bg); color: var(--danger); }
    .feed-comment__text {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--ink);
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .feed-comment-composer {
      display: flex;
      gap: 10px;
      align-items: center;
      padding-top: 4px;
    }
    .feed-comment-input {
      flex: 1;
      min-width: 0;
      height: 36px;
      padding: 0 14px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--bg);
      font: 0.875rem var(--font-sans);
      color: var(--ink);
    }
    .feed-comment-input:focus {
      outline: 0;
      background: var(--surface);
      border-color: var(--ink);
      box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--accent);
    }
    .feed-comment-input::placeholder { color: var(--muted-2); }

    .feed-empty {
      padding: 36px 0;
      text-align: center;
      color: var(--muted);
      font-size: 0.9375rem;
    }
  `]
})
export class ActionFeedComponent implements OnInit, OnChanges, OnDestroy {
  @Input() actionId!: number;

  readonly i18n = inject(I18nService);
  private feed = inject(FeedService);
  private auth = inject(AuthService);
  private events = inject(EventsService);
  private sanitizer = inject(DomSanitizer);

  // labelKey points into the dictionary; title attribute pulls live via i18n.t().
  readonly REACTIONS: { type: ReactionType; dbKey: string; emoji: string; labelKey: string }[] = [
    { type: 'LIKE',  dbKey: 'like',  emoji: '👍', labelKey: 'feed.react.like' },
    { type: 'LOVE',  dbKey: 'love',  emoji: '❤️', labelKey: 'feed.react.love' },
    { type: 'HAHA',  dbKey: 'haha',  emoji: '😂', labelKey: 'feed.react.haha' },
    { type: 'WOW',   dbKey: 'wow',   emoji: '😮', labelKey: 'feed.react.wow' },
    { type: 'SAD',   dbKey: 'sad',   emoji: '😢', labelKey: 'feed.react.sad' },
    { type: 'ANGRY', dbKey: 'angry', emoji: '😡', labelKey: 'feed.react.angry' },
  ];

  readonly posts = signal<FeedPost[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly mediaOpen = signal(false);
  readonly commentBusy = signal<number | null>(null);

  draftBody = '';
  draftMedia: MediaSelection | null = null;
  commentDrafts: Record<number, string> = {};

  readonly myUserId = computed(() => {
    const sub = this.auth.payload()?.sub;
    return sub ? Number(sub) : null;
  });
  readonly myEmail = computed(() => this.auth.email() ?? 'me@local');
  readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));

  canPost(): boolean {
    return this.draftBody.trim().length > 0 || !!this.draftMedia;
  }

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
        this.refresh();
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(err?.error?.message ?? this.i18n.t('feed.err.post'));
      },
    });
  }

  deletePost(p: FeedPost): void {
    if (!confirm(this.i18n.t('feed.post.delete.confirm'))) return;
    this.feed.deletePost(p.id).subscribe({
      next: () => this.refresh(),
    });
  }

  toggleReaction(p: FeedPost, type: ReactionType, dbKey: string): void {
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
    if (!confirm(this.i18n.t('feed.comment.delete.confirm'))) return;
    this.feed.deleteComment(commentId).subscribe({ next: () => this.refresh() });
  }

  isYoutube(url: string): boolean {
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/)/.test(url);
  }

  youtubeEmbed(url: string): SafeResourceUrl {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
    const embed = m ? `https://www.youtube.com/embed/${m[1]}` : url;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embed);
  }

  initials(email: string | null | undefined): string {
    if (!email) return '??';
    const local = email.split('@')[0];
    const parts = local.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return local.slice(0, 2).toUpperCase();
  }

  avatarColor(email: string | null | undefined): string {
    if (!email) return 'avatar--c6';
    const hash = Array.from(email).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
    const i = Math.abs(hash) % 6 + 1;
    return `avatar--c${i}`;
  }
}

import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';

import { CharityAction } from '../core/actions.service';

/**
 * Brand-styled pin icons rendered as inline SVG (no external asset
 * dependency). Two variants: the standard navy pin for listed actions,
 * and a yellow-accented pin for the draft (being-placed) pin in pick mode.
 *
 * The pin is 28×38 with the anchor at the tip (bottom-centre). The popup
 * anchor sits above the pin's head so it doesn't overlap the pin.
 */
function brandPinIcon(opts: { accent: string; ring: string }): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 38" width="28" height="38">
      <defs>
        <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.8"/>
          <feOffset dy="1"/>
          <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z"
            fill="#202C50" stroke="${opts.ring}" stroke-width="1.5" filter="url(#s)"/>
      <circle cx="14" cy="14" r="5.5" fill="${opts.accent}"/>
    </svg>`;
  return L.divIcon({
    className: 'inetum-pin',
    html: svg,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
  });
}

const ACTION_PIN = brandPinIcon({ accent: '#F4E443', ring: '#FFFFFF' });
const DRAFT_PIN  = brandPinIcon({ accent: '#FFFFFF', ring: '#F4E443' });

/**
 * Reusable Leaflet map showing one or many actions as pins, with an
 * optional pick mode for the admin form (click / search / geolocate to
 * place a pin).
 *
 * <h3>Why OpenStreetMap standard tiles</h3>
 * Tried CartoDB Voyager first for English worldwide labels, but its raster
 * tiles are deliberately spartan — they hide most POI labels and building
 * detail for cleanliness. The product reviewer wanted Google-Maps-style
 * richness (building footprints, shop names, schools, hospitals). Standard
 * OSM tiles have all of that and are free, no API key. Trade-off: labels
 * render in the local language (French in France, Arabic in Tunisia) — for
 * a French-internal tool that's actually correct behaviour.
 *
 * <h3>Three modes (no flag needed — driven by inputs)</h3>
 * <ul>
 *   <li><b>List mode</b> — pass {@link actions}; pins drop, popups link to detail,
 *       map auto-fits the bounds of all pinned actions.</li>
 *   <li><b>Single-action mode</b> — pass an array of one action; map centres
 *       on it with a fixed zoom.</li>
 *   <li><b>Pick mode</b> — pass {@link pickable}{@code = true}. Renders a
 *       search box + "use my location" button above the map. Clicking the
 *       map, searching, or geolocating drops/moves a draft pin and emits
 *       {@link picked}.</li>
 * </ul>
 *
 * <h3>Marker icons — inline SVG, no asset dependency</h3>
 * Leaflet's default PNG markers depend on a brittle URL resolution that
 * fails across SPA routes and stays broken in browser caches even after
 * fixing the path. We sidestep the whole class of bugs by rendering pins
 * as inline SVG via {@link L.divIcon}. Bonus: they're crisp at any zoom,
 * brand-aligned (Inetum navy with a yellow dot), and need zero assets.
 */
@Component({
  selector: 'app-action-map',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (pickable) {
      <div class="map-toolbar" (keydown.enter)="$event.preventDefault()">
        <div class="search">
          <i class="pi pi-search" aria-hidden="true"></i>
          <input type="text" class="search__input"
                 [ngModel]="query"
                 (ngModelChange)="onQueryChange($event)"
                 (keydown.enter)="search()"
                 (focus)="onSearchFocus()"
                 (blur)="onSearchBlur()"
                 placeholder="Type a place — e.g. Paris 11ᵉ, Lyon Bellecour, Tunis Sidi Bou Saïd"
                 aria-label="Search a place"
                 autocomplete="off" />
          @if (searching()) {
            <span class="search__spin" aria-hidden="true"></span>
          }
          @if (query && !searching()) {
            <button type="button" class="search__clear" (click)="clearQuery()"
                    aria-label="Clear search">
              <i class="pi pi-times"></i>
            </button>
          }

          @if (showResults() && results().length > 0) {
            <ul class="search-results" role="listbox">
              @for (r of results(); track r.place_id) {
                <li>
                  <button type="button" (mousedown)="pickResult(r)">
                    <i class="pi pi-map-marker"></i>
                    <span>{{ r.display_name }}</span>
                  </button>
                </li>
              }
            </ul>
          }
        </div>
        <button type="button" class="map-btn map-btn--ghost"
                (click)="recenterOnPin()" [disabled]="!lastAppliedPick"
                title="Recenter map on the pin">
          <i class="pi pi-arrow-circle-down"></i> Recenter
        </button>
        <button type="button" class="map-btn map-btn--ghost"
                (click)="useMyLocation()" [disabled]="locating()"
                title="Use my current location">
          <i class="pi pi-compass"></i>
          @if (locating()) { Locating… } @else { My location }
        </button>
      </div>

      @if (searchError()) {
        <p class="map-msg map-msg--err">{{ searchError() }}</p>
      }
    }

    <div #mapEl class="action-map" [style.height.px]="height"></div>
  `,
  styles: [`
    :host { display: block; }

    .map-toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .search {
      position: relative;
      flex: 1;
      min-width: 240px;
    }
    .search i.pi-search {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-subtle);
      font-size: 13px;
    }
    .search__input {
      width: 100%;
      height: 40px;
      padding: 0 36px 0 36px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      background: var(--white);
      font: 14px 'Inter', system-ui, sans-serif;
      color: var(--text);
    }
    .search__input:focus {
      outline: 0;
      border-color: var(--navy);
      box-shadow: 0 0 0 3px rgba(32,44,80,0.08);
    }
    .search__clear {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      border: 0;
      background: transparent;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      color: var(--text-subtle);
    }
    .search__clear:hover { background: var(--surface); color: var(--navy); }
    .search__clear i { font-size: 10px; }
    .search__spin {
      position: absolute;
      right: 12px;
      top: 50%;
      width: 14px;
      height: 14px;
      margin-top: -7px;
      border: 2px solid var(--surface-2);
      border-top-color: var(--navy);
      border-radius: 50%;
      animation: search-spin 0.7s linear infinite;
    }
    @keyframes search-spin { to { transform: rotate(360deg); } }

    .map-btn {
      height: 40px;
      padding: 0 14px;
      border-radius: var(--radius);
      border: 1px solid var(--navy);
      background: var(--navy);
      color: var(--white);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .map-btn:hover:not(:disabled) { background: var(--navy-hover); border-color: var(--navy-hover); }
    .map-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .map-btn i { font-size: 12px; }
    .map-btn--ghost {
      background: var(--white);
      color: var(--navy);
    }
    .map-btn--ghost:hover:not(:disabled) {
      background: var(--surface);
      color: var(--navy);
    }

    /* Autocomplete dropdown sits absolutely under the input. */
    .search-results {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 1100;
      list-style: none;
      padding: 0;
      margin: 0;
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      max-height: 280px;
      overflow-y: auto;
      box-shadow: 0 8px 24px rgba(32,44,80,0.12);
    }
    .search-results li:not(:last-child) { border-bottom: 1px solid var(--border); }
    .search-results button {
      width: 100%;
      text-align: left;
      padding: 10px 14px;
      background: transparent;
      border: 0;
      cursor: pointer;
      font: 13px/1.4 'Inter', system-ui, sans-serif;
      color: var(--text);
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .search-results button:hover { background: var(--surface); }
    .search-results i {
      color: var(--text-subtle);
      font-size: 12px;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .map-msg {
      margin: 0 0 10px;
      padding: 8px 12px;
      border-radius: var(--radius);
      font-size: 12.5px;
    }
    .map-msg--err {
      background: #FBEDED;
      color: #8B1F1F;
    }

    .action-map {
      width: 100%;
      border-radius: var(--radius-lg);
      overflow: hidden;
      background: var(--surface-2);
    }
    /* Inline-SVG pin: kill any default background Leaflet adds. */
    ::ng-deep .inetum-pin {
      background: transparent !important;
      border: 0 !important;
    }
    ::ng-deep .inetum-pin svg { display: block; }
    /* Brand the leaflet popup so it doesn't feel bolted-on */
    ::ng-deep .leaflet-popup-content-wrapper {
      border-radius: var(--radius);
      box-shadow: 0 4px 16px rgba(32, 44, 80, 0.12);
    }
    ::ng-deep .leaflet-popup-content {
      margin: 12px 14px;
      font: 13px/1.5 'Inter', system-ui, sans-serif;
      color: var(--text);
    }
    ::ng-deep .leaflet-popup-content .pop-title {
      font-weight: 600;
      color: var(--navy);
      margin: 0 0 4px;
      font-size: 13.5px;
    }
    ::ng-deep .leaflet-popup-content .pop-meta {
      color: var(--text-muted);
      font-size: 12px;
      margin: 0 0 8px;
    }
    ::ng-deep .leaflet-popup-content .pop-link {
      display: inline-block;
      color: var(--navy);
      text-decoration: none;
      font-weight: 500;
      font-size: 12.5px;
      border-bottom: 1px solid var(--navy);
      padding-bottom: 1px;
    }
    ::ng-deep .leaflet-container a.leaflet-popup-close-button { color: var(--text-subtle); }
  `]
})
export class ActionMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  /** Actions to plot. Only those with both latitude and longitude become pins. */
  @Input() actions: CharityAction[] = [];

  /** Map container height in pixels. */
  @Input() height = 480;

  /** If true, clicking the map drops a draft pin and emits {@link picked}. */
  @Input() pickable = false;

  /** Initial position for the draft pin in pick mode. */
  @Input() initialPick: { lat: number; lng: number } | null = null;

  /** Emitted in pick mode each time the user clicks the map, drags the pin,
   *  picks a search result, or uses their geolocation. */
  @Output() picked = new EventEmitter<{ lat: number; lng: number }>();

  private router = inject(Router);

  private map: L.Map | null = null;
  private pinsLayer: L.LayerGroup | null = null;
  private draftMarker: L.Marker | null = null;
  /**
   * Tracks the last initialPick we acted on, so ngOnChanges can ignore
   * Angular's new-object-reference-every-cycle noise and skip work when
   * the actual coordinates didn't change. Also drives the "Recenter on pin"
   * button's enabled state (template reads it directly).
   */
  lastAppliedPick: { lat: number; lng: number } | null = null;
  /** Default centre — middle of metropolitan France, zoom shows the whole country. */
  private static readonly FRANCE_CENTRE: L.LatLngTuple = [46.6, 2.5];
  private static readonly FRANCE_ZOOM = 6;

  // ---- Pick-mode UI state ----
  query = '';
  readonly results = signal<NominatimResult[]>([]);
  readonly searching = signal(false);
  readonly locating = signal(false);
  readonly searchError = signal<string | null>(null);
  /** Whether to show the autocomplete dropdown — hides on input blur. */
  readonly showResults = signal(false);

  /** Debounce timer for type-ahead Nominatim calls. */
  private autocompleteTimer: ReturnType<typeof setTimeout> | null = null;
  /** Aborts the previous in-flight Nominatim request when a newer one starts. */
  private autocompleteAbort: AbortController | null = null;
  /** Don't suggest until the user has typed something meaningful. */
  private static readonly AUTOCOMPLETE_MIN_LEN = 3;
  private static readonly AUTOCOMPLETE_DEBOUNCE_MS = 350;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl.nativeElement, {
      center: ActionMapComponent.FRANCE_CENTRE,
      zoom: ActionMapComponent.FRANCE_ZOOM,
      scrollWheelZoom: true,
      attributionControl: true,
      worldCopyJump: true,
    });

    // OpenStreetMap standard tiles — richest POI / building / street-name
    // coverage of any free raster provider. Labels are local-language.
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    ).addTo(this.map);

    this.pinsLayer = L.layerGroup().addTo(this.map);

    if (this.pickable) {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.setDraftMarker(e.latlng.lat, e.latlng.lng);
        // Remember locally so the next ngOnChanges round (which fires
        // because the parent's signal updated) doesn't see this as a new
        // value and re-centre the map.
        this.lastAppliedPick = { lat: e.latlng.lat, lng: e.latlng.lng };
        this.picked.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      if (this.initialPick) {
        this.setDraftMarker(this.initialPick.lat, this.initialPick.lng);
        // Centre the map ONCE on init. Don't ever re-centre afterwards or
        // the user can't zoom — every interaction would snap back to 15.
        this.map.setView([this.initialPick.lat, this.initialPick.lng], 15);
        this.lastAppliedPick = { ...this.initialPick };
      }
    }

    this.refreshPins();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    if (changes['actions']) this.refreshPins();
    if (changes['initialPick'] && this.pickable) {
      const next = this.initialPick;
      const prev = this.lastAppliedPick;
      // Skip when the parent re-emits the same coordinates wrapped in a
      // fresh object reference (very common with `signal()`-backed getters).
      const unchanged = (!next && !prev)
        || (next && prev && next.lat === prev.lat && next.lng === prev.lng);
      if (unchanged) return;
      if (next) {
        this.setDraftMarker(next.lat, next.lng);
        // First-time placement only — center the map and pick a useful zoom.
        // Subsequent picks just move the marker; the user keeps their zoom.
        if (!prev) this.map.setView([next.lat, next.lng], 15);
      } else if (this.draftMarker) {
        this.draftMarker.remove();
        this.draftMarker = null;
      }
      this.lastAppliedPick = next ? { lat: next.lat, lng: next.lng } : null;
    }
  }

  ngOnDestroy(): void {
    if (this.autocompleteTimer) clearTimeout(this.autocompleteTimer);
    if (this.autocompleteAbort) this.autocompleteAbort.abort();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  // ===========================================================================
  // Pick-mode helpers: search, autocomplete, geolocation
  // ===========================================================================

  /** Fired by ngModelChange — debounces autocomplete calls. */
  onQueryChange(v: string): void {
    this.query = v;
    this.searchError.set(null);
    if (this.autocompleteTimer) clearTimeout(this.autocompleteTimer);
    if (v.trim().length < ActionMapComponent.AUTOCOMPLETE_MIN_LEN) {
      this.results.set([]);
      return;
    }
    this.autocompleteTimer = setTimeout(
      () => this.runAutocomplete(),
      ActionMapComponent.AUTOCOMPLETE_DEBOUNCE_MS
    );
  }

  /** Show the dropdown when the user focuses the input (if we have results). */
  onSearchFocus(): void {
    this.showResults.set(true);
  }

  /**
   * Hide the dropdown on blur, but delayed so the click on a result
   * (which fires on `mousedown` slightly before blur) still registers.
   */
  onSearchBlur(): void {
    setTimeout(() => this.showResults.set(false), 150);
  }

  clearQuery(): void {
    this.query = '';
    this.results.set([]);
    this.searchError.set(null);
  }

  /**
   * Explicit search — fires on Enter. If a single result comes back, jump
   * straight to it; otherwise show the dropdown.
   */
  async search(): Promise<void> {
    const q = this.query.trim();
    if (!q) return;
    this.searching.set(true);
    this.searchError.set(null);
    try {
      const data = await this.fetchSuggestions(q, 5);
      if (data.length === 0) {
        this.searchError.set('No results. Try a more specific place name.');
      } else if (data.length === 1) {
        this.pickResult(data[0]);
      } else {
        this.results.set(data);
        this.showResults.set(true);
      }
    } catch {
      this.searchError.set('Could not reach the geocoding service. Try again in a moment.');
    } finally {
      this.searching.set(false);
    }
  }

  /** Type-ahead autocomplete — silent on errors so we don't nag during typing. */
  private async runAutocomplete(): Promise<void> {
    const q = this.query.trim();
    if (q.length < ActionMapComponent.AUTOCOMPLETE_MIN_LEN) return;
    this.searching.set(true);
    try {
      const data = await this.fetchSuggestions(q, 6);
      this.results.set(data);
      this.showResults.set(true);
    } catch {
      // Don't surface an error per keystroke — it's noisy. The explicit
      // "Search" path still surfaces errors.
      this.results.set([]);
    } finally {
      this.searching.set(false);
    }
  }

  /**
   * Single source of truth for Nominatim calls — handles aborts so a
   * faster keystroke wins the race over an older in-flight request.
   */
  private async fetchSuggestions(q: string, limit: number): Promise<NominatimResult[]> {
    if (this.autocompleteAbort) this.autocompleteAbort.abort();
    this.autocompleteAbort = new AbortController();
    const url = 'https://nominatim.openstreetmap.org/search'
      + `?format=json&addressdetails=0&limit=${limit}&q=${encodeURIComponent(q)}`;
    const resp = await fetch(url, {
      signal: this.autocompleteAbort.signal,
      headers: { 'Accept-Language': 'en' },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json() as NominatimResult[];
  }

  /** Recenter the map on the currently-placed pin. Preserves or bumps zoom. */
  recenterOnPin(): void {
    if (!this.map || !this.lastAppliedPick) return;
    const z = this.map.getZoom();
    this.map.setView(
      [this.lastAppliedPick.lat, this.lastAppliedPick.lng],
      Math.max(z, 15)  // bump up if zoomed-out, never zoom out
    );
  }

  /** Pick a Nominatim result — center the map, drop the pin, clear the list. */
  pickResult(r: NominatimResult): void {
    if (!this.map) return;
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    // Search results are an explicit "jump here" intent, so centring is fine.
    this.map.setView([lat, lng], 15);
    this.setDraftMarker(lat, lng);
    this.lastAppliedPick = { lat, lng };
    this.picked.emit({ lat, lng });
    this.results.set([]);
    this.query = r.display_name;
  }

  /** Ask the browser for the user's current location. */
  useMyLocation(): void {
    if (!('geolocation' in navigator)) {
      this.searchError.set('Geolocation is not supported in this browser.');
      return;
    }
    this.locating.set(true);
    this.searchError.set(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.locating.set(false);
        if (!this.map) return;
        const { latitude, longitude } = pos.coords;
        // Geolocation is an explicit "go to me" intent — centring is fine.
        this.map.setView([latitude, longitude], 15);
        this.setDraftMarker(latitude, longitude);
        this.lastAppliedPick = { lat: latitude, lng: longitude };
        this.picked.emit({ lat: latitude, lng: longitude });
      },
      (err) => {
        this.locating.set(false);
        const msg =
          err.code === err.PERMISSION_DENIED ? 'Permission denied — allow location access and try again.'
          : err.code === err.POSITION_UNAVAILABLE ? 'Your position is unavailable right now.'
          : err.code === err.TIMEOUT ? 'Locating timed out. Try again.'
          : 'Could not get your location.';
        this.searchError.set(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 }
    );
  }

  // ===========================================================================
  // Pin rendering
  // ===========================================================================

  /** Wipe pins + redraw from current `actions`. */
  private refreshPins(): void {
    if (!this.map || !this.pinsLayer) return;
    this.pinsLayer.clearLayers();

    const located = this.actions.filter(
      (a) => a.latitude !== null && a.longitude !== null
    );
    if (located.length === 0) return;

    for (const a of located) {
      const marker = L.marker(
        [a.latitude as number, a.longitude as number],
        { icon: ACTION_PIN, title: a.title }
      );
      marker.bindPopup(this.popupHtml(a));
      marker.on('popupopen', (e) => {
        // Wire the "View action" link inside the popup HTML to Angular router.
        const link = (e.popup.getElement() as HTMLElement | null)
          ?.querySelector<HTMLAnchorElement>('a.pop-link');
        if (link) {
          link.addEventListener('click', (ev) => {
            ev.preventDefault();
            this.router.navigate(['/actions', a.id]);
          });
        }
      });
      marker.addTo(this.pinsLayer!);
    }

    // Fit map to bounds when many pins, otherwise centre on the single one.
    if (located.length === 1) {
      this.map.setView([located[0].latitude as number, located[0].longitude as number], 13);
    } else {
      const bounds = L.latLngBounds(
        located.map((a) => [a.latitude as number, a.longitude as number] as L.LatLngTuple)
      );
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }

  private popupHtml(a: CharityAction): string {
    const date = new Date(a.actionDate);
    const dateStr = date.toLocaleString('en-GB', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const seats = `${a.registeredCount} / ${a.capacity}`;
    const statusBit = a.isClosed
      ? 'Closed'
      : a.seatsRemaining === 0 ? 'Full'
      : a.seatsRemaining <= 3 ? `${a.seatsRemaining} seats left`
      : 'Open';
    // Escape the title to be safe against XSS (admin-controlled but still).
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
    return `
      <p class="pop-title">${esc(a.title)}</p>
      <p class="pop-meta">${esc(dateStr)} &middot; ${esc(statusBit)} &middot; ${seats} registered</p>
      <a href="#" class="pop-link">View action &rarr;</a>
    `;
  }

  private setDraftMarker(lat: number, lng: number): void {
    if (!this.map) return;
    if (this.draftMarker) {
      this.draftMarker.setLatLng([lat, lng]);
    } else {
      this.draftMarker = L.marker([lat, lng], {
        draggable: true,
        icon: DRAFT_PIN,
        title: 'Drag to fine-tune',
      }).addTo(this.map);
      this.draftMarker.on('dragend', () => {
        const pos = this.draftMarker!.getLatLng();
        this.lastAppliedPick = { lat: pos.lat, lng: pos.lng };
        this.picked.emit({ lat: pos.lat, lng: pos.lng });
      });
    }
  }
}

/** Subset of Nominatim's response we actually use. */
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

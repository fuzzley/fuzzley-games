import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';
import { ThemeMenuComponent } from './theme-menu.component';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset['theme'] = 'pastel';
  });

  it('starts from the palette index.html already chose', () => {
    expect(TestBed.inject(ThemeService).current()).toBe('pastel');
  });

  it('falls back to Classic felt when the page has no valid palette', () => {
    document.documentElement.dataset['theme'] = 'neon';
    expect(TestBed.inject(ThemeService).current()).toBe('classic');
  });

  it('applies and remembers a chosen palette', () => {
    const theme = TestBed.inject(ThemeService);
    theme.select('midnight');
    TestBed.tick();
    expect(document.documentElement.dataset['theme']).toBe('midnight');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('midnight');
  });
});

describe('ThemeMenuComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.dataset['theme'] = 'classic';
    await TestBed.configureTestingModule({ imports: [ThemeMenuComponent] }).compileComponents();
  });

  it('opens the list, switches palette and closes again', () => {
    const fixture = TestBed.createComponent(ThemeMenuComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const panel = el.querySelector<HTMLElement>('.panel')!;
    expect(panel.hidden).toBe(true);

    el.querySelector<HTMLButtonElement>('.trigger')!.click();
    fixture.detectChanges();
    expect(panel.hidden).toBe(false);

    const casino = Array.from(el.querySelectorAll<HTMLButtonElement>('.option')).find((option) =>
      option.textContent?.includes('Casino night'),
    )!;
    casino.click();
    fixture.detectChanges();
    expect(TestBed.inject(ThemeService).current()).toBe('casino');
    expect(casino.getAttribute('aria-pressed')).toBe('true');
    expect(panel.hidden).toBe(true);
  });

  it('closes on Escape and hands focus back to its button', () => {
    const fixture = TestBed.createComponent(ThemeMenuComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const trigger = el.querySelector<HTMLButtonElement>('.trigger')!;

    trigger.click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('.option')!.focus();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(el.querySelector<HTMLElement>('.panel')!.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
    fixture.nativeElement.remove();
  });
});

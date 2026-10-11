import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { describe, it, expect, beforeEach } from 'vitest';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have title 'Fuzzley Games'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Fuzzley Games');
  });

  it('should increment clickCount signal when incrementCounter is called', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.clickCount()).toBe(0);
    expect(app.doubleCount()).toBe(0);

    app.incrementCounter();
    expect(app.clickCount()).toBe(1);
    expect(app.doubleCount()).toBe(2);

    app.resetCounter();
    expect(app.clickCount()).toBe(0);
    expect(app.doubleCount()).toBe(0);
  });
});

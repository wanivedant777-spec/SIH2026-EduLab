/* EduLab Nova - Non-Punitive Focus Integrity Telemetry Service */

class FocusTrackerService {
  constructor() {
    this.blurEventsCount = 0;
    this.totalBlurDurationSeconds = 0;
    this.blurStartTime = null;
    this.eventLogs = [];
    this.listeners = new Set();
    this.isTracking = false;
  }

  start() {
    if (this.isTracking) return;
    this.isTracking = true;

    this.handleBlur = () => {
      this.blurStartTime = Date.now();
      this.blurEventsCount += 1;
      const logEntry = {
        id: `ev_${Date.now()}`,
        type: 'window_blur',
        timestamp: new Date().toLocaleTimeString(),
        note: 'Window focus lost / tab switched',
      };
      this.eventLogs.unshift(logEntry);
      this.notify();
    };

    this.handleFocus = () => {
      if (this.blurStartTime) {
        const durationSec = Math.round((Date.now() - this.blurStartTime) / 1000);
        this.totalBlurDurationSeconds += durationSec;
        const logEntry = {
          id: `ev_${Date.now()}`,
          type: 'window_focus',
          timestamp: new Date().toLocaleTimeString(),
          note: `Window restored after ${durationSec}s`,
          durationSec,
        };
        this.eventLogs.unshift(logEntry);
        this.blurStartTime = null;
        this.notify();
      }
    };

    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('focus', this.handleFocus);
  }

  stop() {
    if (!this.isTracking) return;
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('focus', this.handleFocus);
    this.isTracking = false;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach((fn) => fn(state));
  }

  getState() {
    return {
      blurEventsCount: this.blurEventsCount,
      totalBlurDurationSeconds: this.totalBlurDurationSeconds,
      eventLogs: [...this.eventLogs],
    };
  }

  reset() {
    this.blurEventsCount = 0;
    this.totalBlurDurationSeconds = 0;
    this.blurStartTime = null;
    this.eventLogs = [];
    this.notify();
  }
}

export const focusTracker = new FocusTrackerService();

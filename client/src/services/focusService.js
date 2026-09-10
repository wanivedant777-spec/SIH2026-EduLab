/* EduLab Nova - Non-Punitive Focus Integrity Telemetry Service */

class FocusTrackerService {
  constructor() {
    this.blurEventsCount = 0;
    this.totalBlurDurationSeconds = 0;
    this.blurStartTime = null;
    this.pasteAttemptsCount = 0;
    this.copyAttemptsCount = 0;
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

  recordIntegrityEvent({ type, note, practicalId, studentId }) {
    if (type === 'paste_blocked') {
      this.pasteAttemptsCount += 1;
    } else if (type === 'copy_blocked') {
      this.copyAttemptsCount += 1;
    }

    const logEntry = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type, // 'paste_blocked' | 'copy_blocked'
      timestamp: new Date().toLocaleTimeString(),
      isoTimestamp: new Date().toISOString(),
      note: note || (type === 'paste_blocked' ? 'External paste blocked (Academic Integrity Mode)' : 'Solution code copy/cut blocked (Academic Integrity Mode)'),
      practical_id: practicalId || null,
      student_id: studentId || null,
    };

    this.eventLogs.unshift(logEntry);
    this.notify();
    return logEntry;
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
      pasteAttemptsCount: this.pasteAttemptsCount,
      copyAttemptsCount: this.copyAttemptsCount,
      eventLogs: [...this.eventLogs],
    };
  }

  reset() {
    this.blurEventsCount = 0;
    this.totalBlurDurationSeconds = 0;
    this.blurStartTime = null;
    this.pasteAttemptsCount = 0;
    this.copyAttemptsCount = 0;
    this.eventLogs = [];
    this.notify();
  }
}

export const focusTracker = new FocusTrackerService();

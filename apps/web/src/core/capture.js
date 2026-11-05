import { store } from './store.js';
import { apiRequest } from './api.js';

class ScreenCaptureManager {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.canvas = null;
    this.intervalId = null;
    this.activityCounter = 0;
    this.totalEvents = 0;

    // Track user input events for activity level calculation
    window.addEventListener('mousemove', () => this.recordActivity(), { passive: true });
    window.addEventListener('keydown', () => this.recordActivity(), { passive: true });
    window.addEventListener('scroll', () => this.recordActivity(), { passive: true });
  }

  recordActivity() {
    this.activityCounter++;
    this.totalEvents++;
  }

  async startCapture() {
    if (this.stream) return true;

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert('Screen capture API is not supported in this browser environment. Direct demo mode will be used.');
        store.setState('captureActive', true);
        return true;
      }

      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', frameRate: 15 },
        audio: false
      });

      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;

      this.canvas = document.createElement('canvas');

      // Listen for user stopping sharing from browser banner
      this.stream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopCapture();
        alert('Screen sharing ended. Timer will be paused.');
      });

      store.setState('captureActive', true);

      // Start periodic capture interval (every 20s for demo/testing or randomized)
      this.intervalId = setInterval(() => this.captureFrame(), 20000);

      // Take immediate first frame
      setTimeout(() => this.captureFrame(), 2000);

      return true;
    } catch (err) {
      console.warn('[ScreenCapture] Permission declined or unavailable:', err);
      return false;
    }
  }

  stopCapture() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    store.setState('captureActive', false);
  }

  async captureFrame() {
    const activeTimer = store.getState('activeTimer');
    if (!activeTimer) return;

    try {
      let imageBase64 = '';

      if (this.videoElement && this.videoElement.videoWidth > 0) {
        this.canvas.width = Math.min(1280, this.videoElement.videoWidth);
        this.canvas.height = Math.min(720, this.videoElement.videoHeight);
        const ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
        imageBase64 = this.canvas.toDataURL('image/webp', 0.6);
      } else {
        // High-fidelity fallback simulated frame if camera permission cancelled
        imageBase64 = this.createSyntheticFrame();
      }

      // Compute activity percent (0-100)
      const activityPercent = Math.min(100, Math.max(10, Math.round((this.activityCounter / 20) * 100)));
      this.activityCounter = 0; // reset for next interval

      await apiRequest('/screenshots/upload', {
        method: 'POST',
        body: JSON.stringify({
          time_entry_id: activeTimer.id,
          project_id: activeTimer.project_id,
          task_id: activeTimer.task_id,
          taken_at: new Date().toISOString(),
          activity_percent: activityPercent,
          blurred: false,
          app_name: 'Browser Workspace',
          window_title: `${activeTimer.task?.key || 'Task'} - Webbarracks`,
          image_base64: imageBase64
        })
      });

      console.log(`[ScreenCapture] Captured frame with activity: ${activityPercent}%`);
    } catch (err) {
      console.warn('[ScreenCapture] Error saving frame:', err);
    }
  }

  createSyntheticFrame() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 640, 360);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText('Webbarracks Active Screen Capture', 20, 40);
    ctx.fillText(`Timestamp: ${new Date().toLocaleTimeString()}`, 20, 70);
    ctx.fillText(`Activity Level: Optimal`, 20, 100);
    return canvas.toDataURL('image/webp', 0.5);
  }
}

export const captureManager = new ScreenCaptureManager();


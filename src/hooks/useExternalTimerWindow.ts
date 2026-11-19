import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDurationBadge, type FocusTimerState } from './useFocusTimer';

export type ExternalWindowMode = 'none' | 'doc-pip' | 'popup' | 'video-pip';

interface DocumentPictureInPictureAPI {
  window: Window | null;
  requestWindow: (options?: {
    width?: number;
    height?: number;
    disallowReturnToOpener?: boolean;
  }) => Promise<Window>;
}

interface WindowWithDocPiP extends Window {
  documentPictureInPicture?: DocumentPictureInPictureAPI;
}

interface CanvasWithCaptureStream extends HTMLCanvasElement {
  captureStream: (frameRate?: number) => MediaStream;
}

export interface ExternalTimerWindowController {
  externalMode: ExternalWindowMode;
  isExternalOpen: boolean;
  canPopOut: boolean;
  externalContainer: HTMLElement | null;
  externalError: string | null;
  openExternalWindow: () => Promise<boolean>;
  closeExternalWindow: () => void;
}

function detectMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 768;
  const mobileUa =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent || '',
    );
  return coarse || narrow || mobileUa;
}

function copyStylesToDocument(targetDoc: Document): void {
  targetDoc.title = 'PicoTask // Timer';

  const headNodes = document.head.querySelectorAll('link[rel="stylesheet"], style');
  headNodes.forEach((node) => {
    targetDoc.head.appendChild(node.cloneNode(true));
  });

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n');
      if (rules) {
        const styleEl = targetDoc.createElement('style');
        styleEl.textContent = rules;
        targetDoc.head.appendChild(styleEl);
      }
    } catch {
      // Cross-origin stylesheets (Google Fonts) are cloned via <link> tags above
    }
  }
}

function drawCanvasTimer(
  canvas: HTMLCanvasElement,
  timer: FocusTimerState,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.imageSmoothingEnabled = false;

  // Outer PICO-8 Navy frame + Peach housing (crisp 580x360 compact 1.61:1 canvas)
  ctx.fillStyle = '#1D2B53';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#FFCCAA';
  ctx.fillRect(8, 8, w - 16, h - 16);

  // Top Navy Header Bar (no browser domain bar)
  ctx.fillStyle = '#1D2B53';
  ctx.fillRect(8, 8, w - 16, 54);

  // Status pixel square
  const dotColor = timer.isRunning
    ? '#008751'
    : timer.isCompleted
      ? '#FF004D'
      : timer.elapsedSeconds > 0
        ? '#FFA300'
        : '#29ADFF';
  ctx.fillStyle = '#FFF1E8';
  ctx.fillRect(22, 25, 20, 20);
  ctx.fillStyle = dotColor;
  ctx.fillRect(26, 29, 12, 12);

  // Session title
  ctx.fillStyle = '#FFF1E8';
  ctx.font = 'bold 20px "Press Start 2P", monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const title = (timer.sessionTitle.trim() || 'FOCUS').toUpperCase().slice(0, 14);
  ctx.fillText(title, 52, 36);

  // Inner Cream Readout Well
  ctx.fillStyle = '#1D2B53';
  ctx.fillRect(20, 74, w - 40, h - 94);
  ctx.fillStyle = '#FFF1E8';
  ctx.fillRect(26, 80, w - 52, h - 106);

  // Mode + Status Row
  ctx.fillStyle = '#5F574F';
  ctx.font = 'bold 16px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(timer.targetSeconds === null ? 'STOPWATCH' : 'TIMER', 42, 110);

  const statusText = timer.isRunning
    ? 'RUNNING'
    : timer.isCompleted
      ? 'DONE!'
      : timer.elapsedSeconds > 0
        ? 'PAUSED'
        : 'READY';
  ctx.fillStyle = timer.isCompleted
    ? '#FF004D'
    : timer.isRunning
      ? '#008751'
      : '#1D2B53';
  ctx.textAlign = 'right';
  ctx.fillText(statusText, w - 42, 110);

  // Digital Readout + Final-10s Alert Color
  const formatted = formatDurationBadge(timer.displaySeconds);
  const fontSize = formatted.length > 5 ? 54 : 78;
  const isFinalCountdown =
    timer.targetSeconds !== null &&
    timer.isRunning &&
    timer.displaySeconds > 0 &&
    timer.displaySeconds <= 10;
  const hasProgressBar = timer.targetSeconds !== null && timer.targetSeconds > 0;

  ctx.fillStyle = timer.isCompleted || isFinalCountdown ? '#FF004D' : '#1D2B53';
  ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(formatted, w / 2, hasProgressBar ? 206 : 222);

  // 8-Bit Countdown Progress Bar inside Cream Readout Well
  if (hasProgressBar && timer.targetSeconds !== null) {
    const remainingRatio = Math.max(
      0,
      Math.min(1, timer.displaySeconds / timer.targetSeconds),
    );
    const barX = 42;
    const barY = 296;
    const barW = w - 84;
    const barH = 18;

    ctx.fillStyle = '#1D2B53';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#FFCCAA';
    ctx.fillRect(barX + 3, barY + 3, barW - 6, barH - 6);

    const fillW = Math.round((barW - 6) * remainingRatio);
    if (fillW > 0) {
      ctx.fillStyle =
        isFinalCountdown || timer.isCompleted
          ? '#FF004D'
          : remainingRatio <= 0.25
            ? '#FFA300'
            : '#008751';
      ctx.fillRect(barX + 3, barY + 3, fillW, barH - 6);
    }
  }
}

/**
 * Manages an external OS-level floating timer window for desktop users that can
 * be dragged and resized outside the browser tab or app window:
 * 1. Clean Canvas Video Picture-in-Picture (`<video>.requestPictureInPicture()`) with
 *    no browser URL/domain bar and MediaSession Play/Pause support.
 * 2. Document Picture-in-Picture fallback (`window.documentPictureInPicture`).
 * 3. Detached Pop-out Window fallback (`window.open(..., 'popup=yes,resizable=yes')`).
 *
 * Disabled and hidden automatically on mobile devices/viewports.
 */
export function useExternalTimerWindow(
  timer: FocusTimerState,
): ExternalTimerWindowController {
  const [externalMode, setExternalMode] = useState<ExternalWindowMode>('none');
  const [externalContainer, setExternalContainer] = useState<HTMLElement | null>(null);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() => detectMobileDevice());

  const timerRef = useRef(timer);
  timerRef.current = timer;

  const externalWindowRef = useRef<Window | null>(null);
  const externalIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanupExternalResources = useCallback(() => {
    if (externalIntervalRef.current !== null) {
      if (externalWindowRef.current) {
        try {
          externalWindowRef.current.clearInterval(externalIntervalRef.current);
        } catch {
          // Ignore if window already closed
        }
      } else {
        window.clearInterval(externalIntervalRef.current);
      }
      externalIntervalRef.current = null;
    }

    if (externalWindowRef.current && !externalWindowRef.current.closed) {
      try {
        externalWindowRef.current.close();
      } catch {
        // Ignore
      }
    }
    externalWindowRef.current = null;

    if (
      document.pictureInPictureElement &&
      document.pictureInPictureElement === videoRef.current
    ) {
      void document.exitPictureInPicture().catch(() => {});
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.remove();
      videoRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    canvasRef.current = null;
    setExternalContainer(null);
    setExternalMode('none');
  }, []);

  // Track mobile/coarse-pointer state and close external window if switched to mobile
  useEffect(() => {
    const pointerQuery = window.matchMedia('(pointer: coarse)');

    function updateMobileState() {
      const mobile = detectMobileDevice();
      setIsMobile(mobile);
      if (mobile) {
        cleanupExternalResources();
      }
    }

    updateMobileState();
    window.addEventListener('resize', updateMobileState);
    pointerQuery.addEventListener('change', updateMobileState);
    return () => {
      window.removeEventListener('resize', updateMobileState);
      pointerQuery.removeEventListener('change', updateMobileState);
    };
  }, [cleanupExternalResources]);

  // Close external window cleanly when main app closes or reloads
  useEffect(() => {
    function handleMainUnload() {
      cleanupExternalResources();
    }
    window.addEventListener('pagehide', handleMainUnload);
    window.addEventListener('beforeunload', handleMainUnload);
    return () => {
      window.removeEventListener('pagehide', handleMainUnload);
      window.removeEventListener('beforeunload', handleMainUnload);
      cleanupExternalResources();
    };
  }, [cleanupExternalResources]);

  // Keep canvas refreshed while Video PiP is open
  useEffect(() => {
    if (externalMode !== 'video-pip' || !canvasRef.current) return;
    drawCanvasTimer(canvasRef.current, timerRef.current);
  }, [
    externalMode,
    timer.displaySeconds,
    timer.elapsedSeconds,
    timer.isRunning,
    timer.isCompleted,
    timer.sessionTitle,
    timer.targetSeconds,
  ]);

  // Bind MediaSession metadata + play/pause controls during video-pip mode
  useEffect(() => {
    if (externalMode !== 'video-pip' || !('mediaSession' in navigator)) return;

    const session = navigator.mediaSession;
    session.playbackState = timer.isRunning ? 'playing' : 'paused';

    if ('MediaMetadata' in window) {
      session.metadata = new MediaMetadata({
        title: timer.sessionTitle.trim() || 'Focus Timer',
        artist: 'PicoTask',
      });
    }

    const handleToggle = () => {
      timerRef.current.toggleRunning();
    };

    try {
      session.setActionHandler('play', handleToggle);
      session.setActionHandler('pause', handleToggle);
    } catch {
      // Ignore if action handler unsupported
    }

    return () => {
      try {
        session.setActionHandler('play', null);
        session.setActionHandler('pause', null);
      } catch {
        // Ignore
      }
    };
  }, [externalMode, timer.isRunning, timer.sessionTitle]);

  const attachToWindow = useCallback(
    (win: Window, mode: 'doc-pip' | 'popup') => {
      externalWindowRef.current = win;
      win.document.body.innerHTML = '';
      win.document.head.innerHTML = '';
      copyStylesToDocument(win.document);

      win.document.documentElement.style.height = '100%';
      win.document.body.style.margin = '0';
      win.document.body.style.padding = '0';
      win.document.body.style.height = '100%';
      win.document.body.style.overflow = 'hidden';
      win.document.body.style.backgroundColor = '#FFCCAA';
      win.document.body.style.color = '#1D2B53';

      const mount = win.document.createElement('div');
      mount.id = 'pico-external-timer-root';
      mount.style.width = '100%';
      mount.style.height = '100%';
      win.document.body.appendChild(mount);

      // Keep timer readout synced even if the main browser tab is backgrounded
      externalIntervalRef.current = win.setInterval(() => {
        timerRef.current.syncElapsed();
      }, 250);

      const handleExternalClose = () => {
        externalWindowRef.current = null;
        cleanupExternalResources();
      };

      win.addEventListener('pagehide', handleExternalClose);
      win.addEventListener('beforeunload', handleExternalClose);

      setExternalContainer(mount);
      setExternalMode(mode);
      setExternalError(null);
    },
    [cleanupExternalResources],
  );

  const openVideoPiP = useCallback(async (): Promise<boolean> => {
    if (
      !('requestPictureInPicture' in HTMLVideoElement.prototype) ||
      typeof HTMLCanvasElement.prototype.captureStream !== 'function'
    ) {
      return false;
    }

    const canvas = document.createElement('canvas') as CanvasWithCaptureStream;
    canvas.width = 580;
    canvas.height = 360;
    drawCanvasTimer(canvas, timerRef.current);

    const stream = canvas.captureStream(10);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    video.style.position = 'fixed';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    document.body.appendChild(video);

    canvasRef.current = canvas;
    videoRef.current = video;
    streamRef.current = stream;

    try {
      await video.play();
      drawCanvasTimer(canvas, timerRef.current);
      await video.requestPictureInPicture();

      // Keep stream alive & redraw periodically while PiP is active
      externalIntervalRef.current = window.setInterval(() => {
        timerRef.current.syncElapsed();
        if (canvasRef.current) {
          drawCanvasTimer(canvasRef.current, timerRef.current);
        }
      }, 250);

      video.addEventListener('pause', () => {
        if (document.pictureInPictureElement === video) {
          void video.play().catch(() => {});
        }
      });

      video.addEventListener(
        'leavepictureinpicture',
        () => {
          cleanupExternalResources();
        },
        { once: true },
      );

      setExternalMode('video-pip');
      setExternalError(null);
      return true;
    } catch {
      cleanupExternalResources();
      return false;
    }
  }, [cleanupExternalResources]);

  const openExternalWindow = useCallback(async (): Promise<boolean> => {
    setExternalError(null);

    if (isMobile) {
      cleanupExternalResources();
      return false;
    }

    if (externalMode !== 'none') {
      cleanupExternalResources();
      return false;
    }

    // 1. Clean Video Picture-in-Picture (no browser domain/URL bar, OS-resizable)
    const videoPipStarted = await openVideoPiP();
    if (videoPipStarted) return true;

    // 2. Fallback: Document Picture-in-Picture
    const winWithPiP = window as WindowWithDocPiP;
    if (winWithPiP.documentPictureInPicture?.requestWindow) {
      try {
        const pipWin = await winWithPiP.documentPictureInPicture.requestWindow({
          width: 180,
          height: 112,
        });
        attachToWindow(pipWin, 'doc-pip');
        return true;
      } catch {
        // Fall through to popup
      }
    }

    // 3. Fallback: Detached pop-out window (Firefox / Safari desktop)
    const popup = window.open(
      '',
      'picotask-floating-timer',
      'popup=yes,width=188,height=120,left=80,top=80,resizable=yes',
    );
    if (popup) {
      attachToWindow(popup, 'popup');
      return true;
    }

    setExternalError(
      'Allow Picture-in-Picture or pop-ups to float outside the tab.',
    );
    return false;
  }, [
    attachToWindow,
    cleanupExternalResources,
    externalMode,
    isMobile,
    openVideoPiP,
  ]);

  return {
    externalMode,
    isExternalOpen: externalMode !== 'none',
    canPopOut: !isMobile,
    externalContainer,
    externalError,
    openExternalWindow,
    closeExternalWindow: cleanupExternalResources,
  };
}

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
  externalContainer: HTMLElement | null;
  externalError: string | null;
  openExternalWindow: () => Promise<boolean>;
  closeExternalWindow: () => void;
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

  // Outer PICO-8 Peach housing + Navy border
  ctx.fillStyle = '#1D2B53';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#FFCCAA';
  ctx.fillRect(6, 6, w - 12, h - 12);

  // Top Navy Title Bar
  ctx.fillStyle = '#1D2B53';
  ctx.fillRect(6, 6, w - 12, 34);

  // Status pixel dot
  const dotColor = timer.isRunning
    ? '#008751'
    : timer.isCompleted
      ? '#FF004D'
      : timer.elapsedSeconds > 0
        ? '#FFA300'
        : '#29ADFF';
  ctx.fillStyle = '#FFF1E8';
  ctx.fillRect(14, 17, 12, 12);
  ctx.fillStyle = dotColor;
  ctx.fillRect(16, 19, 8, 8);

  // Session title
  ctx.fillStyle = '#FFF1E8';
  ctx.font = 'bold 14px "Press Start 2P", monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const title = (timer.sessionTitle.trim() || 'FOCUS').toUpperCase().slice(0, 14);
  ctx.fillText(title, 34, 24);

  // Inner Cream Readout Well
  ctx.fillStyle = '#1D2B53';
  ctx.fillRect(16, 48, w - 32, h - 64);
  ctx.fillStyle = '#FFF1E8';
  ctx.fillRect(20, 52, w - 40, h - 72);

  // Mode + Status Row
  ctx.fillStyle = '#5F574F';
  ctx.font = 'bold 11px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(timer.targetSeconds === null ? 'STOPWATCH' : 'TIMER', 30, 70);

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
  ctx.fillText(statusText, w - 30, 70);

  // Giant Digital Readout
  const formatted = formatDurationBadge(timer.displaySeconds);
  ctx.fillStyle = timer.isCompleted ? '#FF004D' : '#1D2B53';
  ctx.font = 'bold 34px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(formatted, w / 2, 120);
}

/**
 * Manages an external OS-level floating timer window that can be dragged outside
 * the browser tab or app window:
 * 1. Document Picture-in-Picture (`window.documentPictureInPicture`) on supported desktop browsers.
 * 2. Detached Pop-out Window (`window.open(..., 'popup=yes')`) on other desktop browsers.
 * 3. Canvas Video Picture-in-Picture (`<video>.requestPictureInPicture()`) on mobile / blocked popups.
 */
export function useExternalTimerWindow(
  timer: FocusTimerState,
): ExternalTimerWindowController {
  const [externalMode, setExternalMode] = useState<ExternalWindowMode>('none');
  const [externalContainer, setExternalContainer] = useState<HTMLElement | null>(null);
  const [externalError, setExternalError] = useState<string | null>(null);

  const timerRef = useRef(timer);
  timerRef.current = timer;

  const externalWindowRef = useRef<Window | null>(null);
  const externalIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanupExternalResources = useCallback(() => {
    if (externalIntervalRef.current !== null && externalWindowRef.current) {
      try {
        externalWindowRef.current.clearInterval(externalIntervalRef.current);
      } catch {
        // Ignore if window already closed
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

  // Redraw canvas whenever timer updates in video-pip mode
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

  // Bind MediaSession play/pause controls during video-pip mode
  useEffect(() => {
    if (externalMode !== 'video-pip' || !('mediaSession' in navigator)) return;

    const session = navigator.mediaSession;
    session.playbackState = timer.isRunning ? 'playing' : 'paused';

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
  }, [externalMode, timer.isRunning]);

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
    canvas.width = 320;
    canvas.height = 180;
    drawCanvasTimer(canvas, timerRef.current);

    const stream = canvas.captureStream(4);
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
      await video.requestPictureInPicture();
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

    if (externalMode !== 'none') {
      cleanupExternalResources();
      return false;
    }

    const winWithPiP = window as WindowWithDocPiP;

    // 1. Desktop Document Picture-in-Picture (always-on-top interactive window)
    if (winWithPiP.documentPictureInPicture?.requestWindow) {
      try {
        const pipWin = await winWithPiP.documentPictureInPicture.requestWindow({
          width: 256,
          height: 158,
        });
        attachToWindow(pipWin, 'doc-pip');
        return true;
      } catch {
        // Fall through to popup / video PiP
      }
    }

    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

    // 2. Mobile fallback: Canvas Video Picture-in-Picture floats over other apps
    if (isCoarsePointer) {
      const pipStarted = await openVideoPiP();
      if (pipStarted) return true;
    }

    // 3. Desktop fallback (Firefox / Safari): Detached interactive pop-out window
    const popup = window.open(
      '',
      'picotask-floating-timer',
      'popup=yes,width=264,height=172,left=80,top=80,resizable=yes',
    );
    if (popup) {
      attachToWindow(popup, 'popup');
      return true;
    }

    // 4. Last fallback if popup was blocked on desktop
    const videoPipStarted = await openVideoPiP();
    if (videoPipStarted) return true;

    setExternalError(
      'Allow pop-ups or Picture-in-Picture to float outside the tab.',
    );
    return false;
  }, [attachToWindow, cleanupExternalResources, externalMode, openVideoPiP]);

  return {
    externalMode,
    isExternalOpen: externalMode !== 'none',
    externalContainer,
    externalError,
    openExternalWindow,
    closeExternalWindow: cleanupExternalResources,
  };
}

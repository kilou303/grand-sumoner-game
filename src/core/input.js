'use strict';
// Entrées : souris / tactile (converties en coordonnées internes) et clavier.
(function () {
  const I = (GS.Input = {
    x: -1,
    y: -1,
    down: false,
    pressed: false, // appui ce frame
    released: false, // relâché ce frame
    click: null, // {x,y} si "clic" (appui + relâche sans glisser)
    dragY: 0, // déplacement vertical ce frame pendant un appui
    wheel: 0,
    keys: {},
    keysPressed: {},
    moved: false,
  });

  let startX = 0;
  let startY = 0;
  let lastY = 0;
  let dragDist = 0;
  let pendingDrag = 0;

  const toLocal = (e) => {
    const r = GS.R.canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * GS.W, ((e.clientY - r.top) / r.height) * GS.H];
  };

  I.init = () => {
    const cv = GS.R.canvas;
    cv.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      GS.Audio && GS.Audio.unlock();
      const [x, y] = toLocal(e);
      I.x = x;
      I.y = y;
      I.down = true;
      I.pressed = true;
      startX = x;
      startY = y;
      lastY = y;
      dragDist = 0;
      try {
        cv.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
    });
    cv.addEventListener('pointermove', (e) => {
      const [x, y] = toLocal(e);
      I.x = x;
      I.y = y;
      I.moved = true;
      if (I.down) {
        pendingDrag += y - lastY;
        lastY = y;
        dragDist = Math.max(dragDist, Math.hypot(x - startX, y - startY));
      }
    });
    const up = (e) => {
      if (!I.down) return;
      const [x, y] = toLocal(e);
      I.x = x;
      I.y = y;
      I.down = false;
      I.released = true;
      if (dragDist < 6) I.click = { x, y };
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', () => {
      I.down = false;
    });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        I.wheel += Math.sign(e.deltaY);
      },
      { passive: false }
    );
    window.addEventListener('keydown', (e) => {
      GS.Audio && GS.Audio.unlock();
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!I.keys[e.code]) I.keysPressed[e.code] = true;
      I.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      I.keys[e.code] = false;
    });
    window.addEventListener('blur', () => {
      I.keys = {};
      I.down = false;
    });
  };

  I.beginFrame = () => {
    I.dragY = pendingDrag;
    pendingDrag = 0;
    I.dragging = I.down && dragDist >= 6;
  };

  I.endFrame = () => {
    I.pressed = false;
    I.released = false;
    I.click = null;
    I.wheel = 0;
    I.keysPressed = {};
    I.moved = false;
  };

  const MAP = {
    confirm: ['Enter', 'Space', 'KeyZ', 'NumpadEnter'],
    back: ['Escape', 'Backspace', 'KeyX'],
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
  };
  I.hit = (action) => (MAP[action] || [action]).some((k) => I.keysPressed[k]);
  I.held = (action) => (MAP[action] || [action]).some((k) => I.keys[k]);

  // Clic dans un rectangle ce frame ?
  I.clicked = (x, y, w, h) => !!I.click && GS.U.inRect(I.click.x, I.click.y, x, y, w, h);
  I.over = (x, y, w, h) => GS.U.inRect(I.x, I.y, x, y, w, h);
  // Un clic quelque part ce frame (pour "toucher pour continuer").
  I.tapped = () => !!I.click || I.hit('confirm');
  I.consume = () => {
    I.click = null;
    I.keysPressed = {};
  };
})();

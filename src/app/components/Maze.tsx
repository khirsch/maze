import { useCallback, useEffect, useRef } from "react";

const COLS = 15;
const ROWS = 15;
const GLIDE_SPEED = 0.18;
const MAX_CELL_SIZE = 32;
const PADDING = 24;

type Walls = { top: boolean; right: boolean; bottom: boolean; left: boolean };
type Cell = { walls: Walls; visited: boolean };
type Position = { x: number; y: number };

type ScatterSeg = { x1: number; y1: number; x2: number; y2: number; vx: number; vy: number; alpha: number };
type AssembleSeg = { x1: number; y1: number; x2: number; y2: number; tx1: number; ty1: number; tx2: number; ty2: number };
type Anim = { phase: "scatter"; segs: ScatterSeg[] } | { phase: "assemble"; segs: AssembleSeg[] } | null;

function getCellSize() {
  const maxW = (window.innerWidth - PADDING * 2) / COLS;
  const maxH = (window.innerHeight - PADDING * 2) / ROWS;
  return Math.floor(Math.min(maxW, maxH, MAX_CELL_SIZE));
}

function generateMaze(cols: number, rows: number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      walls: { top: true, right: true, bottom: true, left: true },
      visited: false,
    }))
  );
  const stack: Position[] = [{ x: 0, y: 0 }];
  grid[0][0].visited = true;
  while (stack.length > 0) {
    const { x, y } = stack[stack.length - 1];
    const neighbors: Position[] = [];
    if (y > 0        && !grid[y - 1][x].visited) neighbors.push({ x, y: y - 1 });
    if (x < cols - 1 && !grid[y][x + 1].visited) neighbors.push({ x: x + 1, y });
    if (y < rows - 1 && !grid[y + 1][x].visited) neighbors.push({ x, y: y + 1 });
    if (x > 0        && !grid[y][x - 1].visited) neighbors.push({ x: x - 1, y });
    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      grid[next.y][next.x].visited = true;
      const dx = next.x - x;
      const dy = next.y - y;
      if (dy === -1) { grid[y][x].walls.top = false;    grid[next.y][next.x].walls.bottom = false; }
      if (dx ===  1) { grid[y][x].walls.right = false;  grid[next.y][next.x].walls.left = false; }
      if (dy ===  1) { grid[y][x].walls.bottom = false; grid[next.y][next.x].walls.top = false; }
      if (dx === -1) { grid[y][x].walls.left = false;   grid[next.y][next.x].walls.right = false; }
      stack.push(next);
    }
  }
  return grid;
}

// Returns deduplicated wall segments: top + left per cell, plus right edge and bottom edge
function getMazeSegments(maze: Cell[][], cs: number): Array<[number, number, number, number]> {
  const segs: Array<[number, number, number, number]> = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const { walls } = maze[y][x];
      const px = x * cs, py = y * cs;
      if (walls.top)  { const o = y === 0        ?  1 : 0; segs.push([px, py + o, px + cs, py + o]); }
      if (walls.left) { const o = x === 0        ?  1 : 0; segs.push([px + o, py, px + o, py + cs]); }
      if (x === COLS - 1 && walls.right)  segs.push([px + cs - 1, py, px + cs - 1, py + cs]);
      if (y === ROWS - 1 && walls.bottom) segs.push([px, py + cs - 1, px + cs, py + cs - 1]);
    }
  }
  return segs;
}

function drawSegments(ctx: CanvasRenderingContext2D, segs: Array<[number,number,number,number]>, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of segs) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawIcon(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, alpha = 1) {
  const r = cs * 0.28;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.moveTo(x,     y - r);
  ctx.lineTo(x + r, y    );
  ctx.lineTo(x,     y + r);
  ctx.lineTo(x - r, y    );
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function MazeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const csRef = useRef(getCellSize());
  const mazeRef = useRef<Cell[][]>(generateMaze(COLS, ROWS));
  const targetRef = useRef<Position>({ x: 0, y: 0 });
  const visualRef = useRef({ x: csRef.current / 2, y: csRef.current / 2 });
  const animRef = useRef<Anim>(null);

  const startScatter = useCallback((maze: Cell[][], cs: number) => {
    const cx = (COLS * cs) / 2;
    const cy = (ROWS * cs) / 2;
    const rawSegs = getMazeSegments(maze, cs);
    const segs: ScatterSeg[] = rawSegs.map(([x1, y1, x2, y2]) => {
      const mx = (x1 + x2) / 2 - cx;
      const my = (y1 + y2) / 2 - cy;
      const len = Math.sqrt(mx * mx + my * my) || 1;
      const speed = 1.5 + Math.random() * 2.5;
      return {
        x1, y1, x2, y2,
        vx: (mx / len) * speed + (Math.random() - 0.5),
        vy: (my / len) * speed + (Math.random() - 0.5),
        alpha: 1,
      };
    });
    animRef.current = { phase: "scatter", segs };
  }, []);

  const startAssemble = useCallback((maze: Cell[][], cs: number) => {
    const cx = (COLS * cs) / 2;
    const cy = (ROWS * cs) / 2;
    const rawSegs = getMazeSegments(maze, cs);
    const segs: AssembleSeg[] = rawSegs.map(([tx1, ty1, tx2, ty2]) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.min(COLS, ROWS) * cs * (0.1 + Math.random() * 0.3);
      const ox = Math.cos(angle) * radius;
      const oy = Math.sin(angle) * radius;
      return { x1: cx + ox, y1: cy + oy, x2: cx + ox, y2: cy + oy, tx1, ty1, tx2, ty2 };
    });
    animRef.current = { phase: "assemble", segs };
  }, []);

  const move = useCallback((dx: number, dy: number) => {
    if (animRef.current !== null) return;
    const { x, y } = targetRef.current;
    const walls = mazeRef.current[y][x].walls;
    if (dx ===  1 && walls.right)  return;
    if (dx === -1 && walls.left)   return;
    if (dy ===  1 && walls.bottom) return;
    if (dy === -1 && walls.top)    return;
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;
    targetRef.current = { x: nx, y: ny };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      csRef.current = getCellSize();
      const cs = csRef.current;
      const dpr = window.devicePixelRatio ?? 1;
      const cssW = COLS * cs;
      const cssH = ROWS * cs;
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { x, y } = targetRef.current;
      visualRef.current = { x: x * cs + cs / 2, y: y * cs + cs / 2 };
    };

    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      const cs = csRef.current;
      const visual = visualRef.current;
      const { x: tx, y: ty } = targetRef.current;
      const targetPx = tx * cs + cs / 2;
      const targetPy = ty * cs + cs / 2;

      visual.x += (targetPx - visual.x) * GLIDE_SPEED;
      visual.y += (targetPy - visual.y) * GLIDE_SPEED;
      if (Math.abs(visual.x - targetPx) < 0.4) visual.x = targetPx;
      if (Math.abs(visual.y - targetPy) < 0.4) visual.y = targetPy;

      // Trigger scatter when player reaches the end
      if (animRef.current === null && tx === COLS - 1 && ty === ROWS - 1 && visual.x === targetPx && visual.y === targetPy) {
        startScatter(mazeRef.current, cs);
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, COLS * cs, ROWS * cs);

      const anim = animRef.current;

      if (anim === null) {
        drawIcon(ctx, visual.x, visual.y, cs);
        drawSegments(ctx, getMazeSegments(mazeRef.current, cs));
      } else if (anim.phase === "scatter") {
        let allGone = true;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        for (const seg of anim.segs) {
          seg.vx *= 1.06;
          seg.vy *= 1.06;
          seg.x1 += seg.vx; seg.y1 += seg.vy;
          seg.x2 += seg.vx; seg.y2 += seg.vy;
          seg.alpha -= 0.025;
          if (seg.alpha > 0) {
            allGone = false;
            ctx.globalAlpha = seg.alpha;
            ctx.beginPath();
            ctx.moveTo(seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        if (allGone) {
          // Reset maze and begin assemble
          mazeRef.current = generateMaze(COLS, ROWS);
          targetRef.current = { x: 0, y: 0 };
          visualRef.current = { x: cs / 2, y: cs / 2 };
          startAssemble(mazeRef.current, cs);
        }
      } else if (anim.phase === "assemble") {
        let allDone = true;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (const seg of anim.segs) {
          seg.x1 += (seg.tx1 - seg.x1) * 0.1;
          seg.y1 += (seg.ty1 - seg.y1) * 0.1;
          seg.x2 += (seg.tx2 - seg.x2) * 0.1;
          seg.y2 += (seg.ty2 - seg.y2) * 0.1;
          const d = Math.abs(seg.x1 - seg.tx1) + Math.abs(seg.y1 - seg.ty1);
          if (d > 0.5) allDone = false;
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.stroke();

        const visual2 = visualRef.current;
        drawIcon(ctx, visual2.x, visual2.y, cs);

        if (allDone) animRef.current = null;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current!);
      window.removeEventListener("resize", resize);
    };
  }, [startScatter, startAssemble]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowUp"    || e.key === "w") move(0, -1);
      if (e.key === "ArrowDown"  || e.key === "s") move(0,  1);
      if (e.key === "ArrowLeft"  || e.key === "a") move(-1, 0);
      if (e.key === "ArrowRight" || e.key === "d") move(1,  0);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [move]);

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= 10) e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
      Math.abs(dx) > Math.abs(dy) ? move(dx > 0 ? 1 : -1, 0) : move(0, dy > 0 ? 1 : -1);
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [move]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center select-none">
      <canvas ref={canvasRef} />
      <a
        href="https://katlandin.com"
        className="mt-6 text-black"
        aria-label="Home"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12L12 3l9 9"/>
          <path d="M9 21V12h6v9"/>
          <path d="M3 12v9h18v-9"/>
        </svg>
      </a>
    </div>
  );
}

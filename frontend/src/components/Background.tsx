import { useEffect, useRef } from "react";

export default function Background() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;

        const ACC = "rgba(96,196,255,";

        function resize() {
            canvas!.width = window.innerWidth;
            canvas!.height = window.innerHeight;
        }
        resize();
        window.addEventListener("resize", resize);

        const N = 55;
        const particles = Array.from({ length: N }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.28,
            vy: (Math.random() - 0.5) * 0.28,
            r: Math.random() * 1.4 + 0.4,
            a: Math.random() * 0.5 + 0.15,
        }));

        const radar = {
            radius: 72,
            angle: 0,
            speed: 0.012,
            blips: [
                { a: 0.9, d: 0.45 },
                { a: 2.1, d: 0.7 },
                { a: 3.8, d: 0.3 },
                { a: 5.0, d: 0.6 },
            ],
        };

        function drawParticles(W: number, H: number) {
            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = W;
                if (p.x > W) p.x = 0;
                if (p.y < 0) p.y = H;
                if (p.y > H) p.y = 0;
            });

            const D2 = 130 * 130;
            for (let i = 0; i < N; i++) {
                for (let j = i + 1; j < N; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    if (dx * dx + dy * dy < D2) {
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const alpha = (1 - dist / 130) * 0.12;
                        ctx.beginPath();
                        ctx.strokeStyle = ACC + alpha + ")";
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            particles.forEach((p) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = ACC + p.a + ")";
                ctx.fill();
            });
        }

        function drawRadar(W: number, H: number) {
            const rx = W * 0.82;
            const ry = H * 0.22;
            radar.angle = (radar.angle + radar.speed) % (Math.PI * 2);
            const { radius, angle } = radar;

            ctx.beginPath();
            ctx.arc(rx, ry, radius, 0, Math.PI * 2);
            ctx.strokeStyle = ACC + "0.18)";
            ctx.lineWidth = 1;
            ctx.stroke();

            [0.66, 0.33].forEach((f) => {
                ctx.beginPath();
                ctx.arc(rx, ry, radius * f, 0, Math.PI * 2);
                ctx.strokeStyle = ACC + "0.08)";
                ctx.lineWidth = 0.5;
                ctx.stroke();
            });

            ctx.strokeStyle = ACC + "0.07)";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(rx - radius, ry);
            ctx.lineTo(rx + radius, ry);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(rx, ry - radius);
            ctx.lineTo(rx, ry + radius);
            ctx.stroke();

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.arc(rx, ry, radius - 1, angle - 1.1, angle, false);
            ctx.closePath();
            const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, radius);
            grad.addColorStop(0, ACC + "0)");
            grad.addColorStop(0.6, ACC + "0.06)");
            grad.addColorStop(1, ACC + "0.20)");
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx + Math.cos(angle) * radius, ry + Math.sin(angle) * radius);
            ctx.strokeStyle = ACC + "0.7)";
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();

            radar.blips.forEach((b) => {
                const diff = ((b.a - angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
                const alpha = diff < 0.6 ? 0.9 : Math.max(0, 0.9 - (diff - 0.6) * 0.4);
                if (alpha < 0.02) return;
                const bx = rx + Math.cos(b.a) * radius * b.d;
                const by = ry + Math.sin(b.a) * radius * b.d;
                ctx.beginPath();
                ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = ACC + alpha + ")";
                ctx.fill();
                if (alpha > 0.5) {
                    ctx.beginPath();
                    ctx.arc(bx, by, 5, 0, Math.PI * 2);
                    ctx.fillStyle = ACC + alpha * 0.25 + ")";
                    ctx.fill();
                }
            });

            ctx.beginPath();
            ctx.arc(rx, ry, 2, 0, Math.PI * 2);
            ctx.fillStyle = ACC + "0.6)";
            ctx.fill();
        }

        let rafId: number;
        function frame() {
            const W = canvas!.width;
            const H = canvas!.height;
            ctx.clearRect(0, 0, W, H);
            drawParticles(W, H);
            drawRadar(W, H);
            rafId = requestAnimationFrame(frame);
        }
        frame();

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(rafId);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            {/* Existing layers */}
            <div className="absolute inset-0 bg-grid-lines animate-grid-drift" />
            <div className="absolute -top-40 -left-40 w-[580px] h-[580px] rounded-full bg-accent/5 blur-3xl animate-orb-a" />
            <div className="absolute -bottom-52 -right-32 w-[520px] h-[520px] rounded-full bg-accent/[3] blur-3xl animate-orb-b" />
            <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-accent2/[3] blur-3xl animate-orb-c" />

            {/* Canvas: particles + radar */}
            <canvas ref={canvasRef} className="absolute inset-0" />

            {/* Data streams */}
            {[
                { left: "12%", dur: "5s", delay: "0s" },
                { left: "27%", dur: "6.5s", delay: "1.2s" },
                { left: "43%", dur: "4.8s", delay: "2.7s" },
                { left: "61%", dur: "7s", delay: "0.5s" },
                { left: "78%", dur: "5.5s", delay: "3.3s" },
                { left: "89%", dur: "6s", delay: "1.8s" },
            ].map((s, i) => (
                <div
                    key={i}
                    className="absolute top-0 w-px"
                    style={{
                        left: s.left,
                        height: "120px",
                        background: "linear-gradient(to bottom, transparent 0%, rgba(96,196,255,0.6) 50%, transparent 100%)",
                        animation: `stream-fall ${s.dur} ease-in ${s.delay} infinite`,
                    }}
                />
            ))}

            {/* Horizontal scan line */}
            <div
                className="absolute left-0 right-0 h-px"
                style={{
                    background: "linear-gradient(to right, transparent 0%, rgba(96,196,255,0.25) 20%, rgba(96,196,255,0.5) 50%, rgba(96,196,255,0.25) 80%, transparent 100%)",
                    animation: "scan-sweep 8s ease-in-out infinite",
                }}
            />

            {/* Corner brackets */}
            {(["tl", "tr", "bl", "br"] as const).map((pos, i) => (
                <div
                    key={pos}
                    className="absolute w-9 h-9"
                    style={{
                        ...(pos.includes("t") ? { top: 18 } : { bottom: 18 }),
                        ...(pos.includes("l") ? { left: 18 } : { right: 18 }),
                        animation: `corner-pulse 3s ease-in-out ${i * 0.75}s infinite`,
                    }}
                >
                    {/* vertical bar */}
                    <div
                        className="absolute w-0.5 rounded-sm"
                        style={{
                            height: 36,
                            background: "rgba(96,196,255,0.55)",
                            ...(pos.includes("t") ? { top: 0 } : { bottom: 0 }),
                            ...(pos.includes("l") ? { left: 0 } : { right: 0 }),
                        }}
                    />
                    {/* horizontal bar */}
                    <div
                        className="absolute h-0.5 rounded-sm"
                        style={{
                            width: 36,
                            background: "rgba(96,196,255,0.55)",
                            ...(pos.includes("t") ? { top: 0 } : { bottom: 0 }),
                            ...(pos.includes("l") ? { left: 0 } : { right: 0 }),
                        }}
                    />
                </div>
            ))}

            {/* Scanlines + vignette */}
            <div className="absolute inset-0 bg-scanlines" />
            <div className="absolute inset-0 bg-vignette" />

            {/* HUD overlays */}
            <div
                className="absolute top-6 left-6 font-mono text-[10px] tracking-[0.15em]"
                style={{ color: "rgba(96,196,255,0.4)", animation: "label-fade 4s ease-in-out infinite" }}
            >
                SYS::ACTIVE
            </div>
            <div className="absolute bottom-6 right-6 flex items-center gap-2 font-mono text-[11px] tracking-[0.1em]" style={{ color: "rgba(96,196,255,0.7)" }}>
                <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "#60c4ff", animation: "dot-blink 2s ease-in-out infinite" }}
                />
                ONLINE
            </div>
        </div>
    );
}
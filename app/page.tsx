/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

const CSS = `
.lp{
  --cream:#EAE1CF; --surface:#F5EFE1; --surface2:#E3D9C2; --ink:#1E1B16; --muted:#847B6A;
  --gold:#EBA92C; --terra:#CE3B2A; --forest:#2E7B4E; --dusk:#5B5080;
  --night:#241F33; --line:#D4C9B0; --success:#2E7B4E; --sky:#2A56A8;
  --primary-soft:#F4D6CD; --secondary-soft:#D6E0F2; --accent-soft:#F8E9C4; --success-soft:#D6E7D6;
  --shadow:4px 4px 0 var(--ink); --shadow-sm:3px 3px 0 var(--ink);
  position:relative; z-index:0; min-height:100dvh; overflow-x:hidden; color:var(--ink);
  font-family:var(--font-heading), system-ui, sans-serif; font-size:17px; line-height:1.6;
  -webkit-font-smoothing:antialiased;
  /* elevated canvas — soft retro color-mesh on warm cream */
  background:
    radial-gradient(38% 30% at 8% 6%, rgba(235,169,44,.28), transparent 60%),
    radial-gradient(40% 32% at 96% 14%, rgba(42,86,168,.16), transparent 62%),
    radial-gradient(44% 34% at 84% 52%, rgba(206,59,42,.14), transparent 64%),
    radial-gradient(42% 34% at 6% 60%, rgba(46,123,78,.16), transparent 64%),
    radial-gradient(46% 36% at 92% 92%, rgba(235,169,44,.20), transparent 64%),
    linear-gradient(180deg,#ece2cd,#e7ddc7);
  background-attachment:fixed;
}
.lp *{box-sizing:border-box}
.lp::before{content:""; position:fixed; inset:0; pointer-events:none; z-index:1; opacity:.28;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}
/* twinkling pixel stars in the hero sky */
.lp .stars{position:absolute; inset:0 0 38% 0; z-index:2; pointer-events:none}
.lp .star{position:absolute; width:2px; height:2px; background:#fff;
  box-shadow:0 0 5px 1px rgba(255,255,255,.6); animation:lptwinkle 3s ease-in-out infinite}
@keyframes lptwinkle{0%,100%{opacity:.18; transform:scale(1)} 50%{opacity:.95; transform:scale(1.6)}}
.lp .pressstart{margin-top:16px; font-family:var(--font-display); font-weight:600; font-size:14px;
  letter-spacing:1px; color:var(--gold); text-shadow:2px 2px 0 rgba(0,0,0,.55); animation:lpblink 1.1s steps(2) infinite}
.lp a{color:inherit; text-decoration:none}
.lp h1,.lp h2,.lp h3{font-family:var(--font-display), ui-monospace, monospace; line-height:1.02; letter-spacing:.5px; margin:0}
.lp .wrap{max-width:1100px; margin:0 auto; padding:0 22px; position:relative; z-index:2}
.lp .narrow{max-width:720px}
.lp .eyebrow{display:inline-flex; align-items:center; gap:8px; font-weight:700; font-size:12px; letter-spacing:1.5px; text-transform:uppercase}
.lp .btn{display:inline-flex; align-items:center; justify-content:center; gap:8px; height:54px; padding:0 32px;
  border:2px solid var(--ink); border-radius:8px; font-weight:800; font-size:16px; cursor:pointer;
  box-shadow:var(--shadow); transition:transform .08s ease, box-shadow .08s ease}
.lp .btn:active{transform:translate(4px,4px); box-shadow:0 0 0 var(--ink)}
.lp .btn-gold{background:var(--gold); color:var(--ink);
  box-shadow:var(--shadow), inset 0 3px 0 rgba(255,255,255,.45), inset 0 -3px 0 rgba(0,0,0,.16)}

/* hero = a contained retro monitor (bordered, not full-bleed) so the art stays crisp */
.lp .hero{position:relative; display:flex; justify-content:center; align-items:center;
  padding:clamp(52px,8vh,94px) clamp(16px,5vw,56px) 42px}
.lp .hero-monitor{width:100%; max-width:1140px}
.lp .hero-screen{position:relative; border-radius:9px; overflow:hidden; aspect-ratio:16/9}
.lp .hero-img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center 48%}
.lp .hero-copy{position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center;
  align-items:flex-start; text-align:left; color:#fff; padding:clamp(22px,4vw,54px);
  background:linear-gradient(90deg, rgba(20,17,28,.82) 0%, rgba(20,17,28,.5) 40%, transparent 68%)}
.lp .hero .eyebrow{color:#fff; border:2px solid rgba(255,255,255,.3); background:rgba(255,255,255,.08);
  padding:6px 12px; border-radius:7px}
.lp .hero h1{font-size:clamp(34px,4.6vw,58px); margin-top:16px; color:#fff; text-shadow:3px 3px 0 rgba(0,0,0,.55)}
.lp .hero h1 b{color:var(--gold); font-weight:700}
.lp .hero p.sub{max-width:430px; margin:14px 0 0; font-size:clamp(14px,1.5vw,17px); font-weight:600;
  color:rgba(255,255,255,.92); line-height:1.5}
.lp .hero .cta{display:flex; gap:14px; justify-content:flex-start; flex-wrap:wrap; margin-top:24px}
.lp .trust{margin-top:13px; font-size:12px; color:rgba(255,255,255,.72); font-weight:600; letter-spacing:.3px}
@media(max-width:680px){
  .lp .hero{padding:28px 14px}
  .lp .hero-screen{aspect-ratio:4/5}
  .lp .hero-copy{justify-content:flex-end; align-items:center; text-align:center;
    background:linear-gradient(0deg, rgba(20,17,28,.92) 0%, rgba(20,17,28,.5) 46%, rgba(20,17,28,.15) 100%)}
  .lp .hero p.sub{max-width:none}
  .lp .hero .cta{justify-content:center}
}

.lp section.band{padding:96px 0; position:relative; z-index:2}
.lp .kicker{display:inline-flex; align-items:center; gap:7px; font-family:var(--font-display); font-weight:600;
  font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:var(--ink); background:var(--surface);
  border:2px solid var(--ink); border-radius:6px; padding:6px 12px; box-shadow:var(--shadow-sm)}
.lp .kicker::before{content:"▸"; color:var(--terra); font-size:13px}
.lp h2.big{font-size:clamp(34px,5vw,56px); margin-top:16px; text-shadow:3px 3px 0 rgba(30,27,22,.07)}
.lp .lede{font-size:clamp(18px,2.2vw,22px); color:var(--muted); font-weight:500; margin-top:18px; line-height:1.55}

.lp .probs{display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:44px; text-align:left}
.lp .prob{background:var(--surface); border:2px solid var(--ink); border-radius:16px; padding:24px; box-shadow:var(--shadow); height:100%}
.lp .prob .ic{display:grid; place-items:center; width:44px; height:44px; border:2px solid var(--ink); border-radius:11px; background:var(--cream); color:var(--terra); margin-bottom:15px}
.lp .prob .ic svg{width:22px; height:22px}
.lp .prob h3{font-size:21px}
.lp .prob p{margin:9px 0 0; color:var(--muted); font-size:15px; font-weight:500; line-height:1.5}

.lp .reframe{background:var(--night); color:var(--cream); border-radius:26px; margin:0 22px; text-align:center; overflow:hidden; position:relative}
.lp .reframe .wrap{padding:88px 22px}
.lp .reframe h2{color:#fff; font-size:clamp(32px,4.6vw,52px)}
.lp .reframe p{color:rgba(255,255,255,.84); font-size:clamp(18px,2.2vw,22px); font-weight:500; max-width:640px; margin:22px auto 0}
.lp .reframe .glow{position:absolute; width:420px; height:420px; border-radius:50%; filter:blur(80px); background:radial-gradient(var(--dusk),transparent 70%); top:-120px; right:-80px; opacity:.6}

.lp .feats{margin-top:46px}
.lp .feat{display:grid; gap:26px; align-items:center; max-width:1000px; margin:0 auto; padding:36px 0; border-top:2px solid rgba(30,27,22,.10)}
.lp .feat:first-child{border-top:none}
.lp .feat-tx{text-align:left}
.lp .feat-tx .fnum{font-family:var(--font-display), ui-monospace, monospace; font-size:clamp(30px,5vw,44px); color:var(--terra); line-height:.82}
.lp .feat-tx h3{font-size:clamp(22px,3.4vw,30px); margin-top:10px; line-height:1.1}
.lp .feat-tx p{margin-top:11px; color:var(--muted); font-size:clamp(15px,2vw,17px); font-weight:500; line-height:1.55; max-width:440px}
.lp .feat-viz{display:flex; justify-content:center}
.lp .feat-viz > *{width:100%; max-width:382px}
@media(min-width:861px){
  .lp .feat{grid-template-columns:1fr 1fr; gap:60px; padding:48px 0}
  .lp .feat.flip .feat-viz{order:-1}
}

.lp .vague{display:inline-block; background:#fff; border:2px solid var(--ink); border-radius:11px; padding:11px 14px; font-weight:600; font-size:14px; box-shadow:var(--shadow-sm); margin-bottom:-4px; position:relative; z-index:2; max-width:86%}
.lp .vague .tag{font-family:var(--font-display); font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:3px}
.lp .vague .cursor{display:inline-block; width:2px; height:1em; background:var(--terra); vertical-align:-2px; margin-left:1px; animation:lpblink 1s steps(2) infinite}
@keyframes lpblink{50%{opacity:0}}

.lp .plan{border:2px solid var(--ink); border-radius:14px; overflow:hidden; box-shadow:var(--shadow); background:var(--surface); text-align:left}
.lp .plan .cover{height:138px; position:relative; overflow:hidden}
.lp .plan .cover img{width:100%; height:100%; object-fit:cover; display:block}
.lp .plan .cover::after{content:""; position:absolute; inset:0; background:linear-gradient(transparent 52%,rgba(30,27,22,.46))}
.lp .plan .cover b{position:absolute; left:14px; right:14px; bottom:10px; font-family:var(--font-display); color:#fff; font-size:20px; line-height:1.05; text-shadow:2px 2px 0 rgba(0,0,0,.45); z-index:1}
.lp .plan .body{padding:15px}
.lp .plan .meta{display:flex; gap:8px; flex-wrap:wrap; font-size:12.5px; font-weight:700}
.lp .plan .meta span{display:inline-flex; align-items:center; gap:5px; border:2px solid var(--line); border-radius:7px; padding:4px 9px; background:#fff; color:var(--ink)}
.lp .plan .opts{margin-top:12px; display:flex; flex-direction:column; gap:8px}
.lp .opt{border:2px solid var(--line); border-radius:10px; padding:11px 12px; background:#fff}
.lp .opt .top{display:flex; justify-content:space-between; align-items:flex-start; gap:10px}
.lp .opt h4{font-family:var(--font-heading); font-weight:800; font-size:15px; margin:0; line-height:1.2}
.lp .opt small{display:block; color:var(--muted); font-weight:600; font-size:12.5px; margin-top:2px}
.lp .keen{display:inline-flex; align-items:center; gap:5px; border:2px solid var(--line); border-radius:7px; padding:5px 9px; font-weight:800; font-size:12.5px; background:var(--surface); white-space:nowrap}
.lp .keen.on{background:var(--sky); color:#fff; border-color:var(--ink)}
.lp .keen svg{width:13px; height:13px}
.lp .plan .who{margin-top:13px; display:flex; align-items:center; gap:9px; font-size:13px; font-weight:700; color:var(--muted)}
.lp .stack{display:flex}
.lp .stack img{width:30px; height:30px; border-radius:50%; border:2px solid var(--ink); margin-left:-9px; object-fit:cover; background:#fff}
.lp .stack img:first-child{margin-left:0}

.lp .vizframe{border:2px solid var(--ink); border-radius:16px; background:var(--surface); box-shadow:var(--shadow); padding:18px; text-align:left}
.lp .vizframe.vf-blue{background:var(--secondary-soft)}
.lp .vizframe.vf-green{background:var(--success-soft)}
.lp .vizframe.vf-yellow{background:var(--accent-soft)}
.lp .vizframe.vf-red{background:var(--primary-soft)}
.lp .vizframe .vh{font-family:var(--font-display); font-size:12.5px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:7px}
.lp .vizframe .vh svg{width:15px; height:15px; color:var(--terra)}
.lp .datevote{display:flex; flex-direction:column; gap:8px; margin-top:13px}
.lp .dv{display:flex; justify-content:space-between; align-items:center; border:2px solid var(--line); border-radius:10px; padding:10px 12px; font-weight:700; font-size:14px; background:#fff}
.lp .dv.best{background:#e7efe1; border-color:var(--ink)}
.lp .dv .bt-tag{display:inline-flex; align-items:center; gap:5px; font-weight:800; font-size:12px; color:var(--forest)}
.lp .dv .bt-tag svg{width:13px; height:13px}
.lp .dv .free{color:var(--muted); font-weight:700; font-size:13px}
.lp .itin{display:flex; flex-direction:column; gap:11px; margin-top:13px}
.lp .itin .row{display:flex; align-items:center; gap:12px}
.lp .itin .num{font-family:var(--font-display); font-size:15px; color:var(--terra); width:16px; flex:0 0 auto}
.lp .itin img{width:46px; height:46px; border:2px solid var(--ink); border-radius:10px; object-fit:cover; flex:0 0 auto}
.lp .itin .t b{display:block; font-weight:800; font-size:14.5px; line-height:1.1}
.lp .itin .t small{color:var(--muted); font-weight:600; font-size:12.5px}
.lp .disc{display:flex; flex-direction:column; gap:10px; margin-top:13px}
.lp .disc .d{display:flex; align-items:center; gap:12px; border:2px solid var(--ink); border-radius:12px; padding:9px; background:#fff; box-shadow:var(--shadow-sm)}
.lp .disc .d img{width:46px; height:46px; border:2px solid var(--ink); border-radius:9px; object-fit:cover; flex:0 0 auto}
.lp .disc .d b{display:block; font-weight:800; font-size:14.5px; line-height:1.15}
.lp .disc .d small{color:var(--muted); font-weight:700; font-size:12.5px}
.lp .loggrid{display:grid; grid-template-columns:1fr 1fr; gap:11px; margin-top:13px}
.lp .minicard{aspect-ratio:4/3; border:2px solid var(--ink); border-radius:11px; overflow:hidden; position:relative}
.lp .minicard img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover}
.lp .minicard::after{content:""; position:absolute; inset:0; background:linear-gradient(transparent 48%,rgba(30,27,22,.5))}
.lp .minicard b{position:absolute; left:9px; bottom:7px; right:9px; z-index:1; font-family:var(--font-display); color:#fff; font-size:12px; line-height:1.05; text-shadow:1px 1px 0 rgba(0,0,0,.5)}

.lp .cards{display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:46px}
.lp .acard{border:2px solid var(--ink); border-radius:12px; overflow:hidden; box-shadow:var(--shadow); aspect-ratio:3/4; position:relative}
.lp .acard img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover}
.lp .acard::after{content:""; position:absolute; inset:0; background:linear-gradient(transparent 44%,rgba(30,27,22,.55))}
.lp .acard b{position:absolute; left:12px; right:12px; bottom:30px; z-index:1; font-family:var(--font-display); color:#fff; font-size:17px; text-shadow:2px 2px 0 rgba(0,0,0,.5); line-height:1.06}
.lp .acard small{position:absolute; left:12px; bottom:12px; z-index:1; color:rgba(255,255,255,.88); font-weight:700; font-size:11px; text-shadow:1px 1px 0 rgba(0,0,0,.5)}

.lp .nots{background:var(--ink); color:var(--cream); border-radius:26px; margin:0 22px; text-align:center}
.lp .nots .wrap{padding:84px 22px}
.lp .nots h2{color:#fff; font-size:clamp(30px,4.4vw,48px)}
.lp .nogrid{display:flex; flex-wrap:wrap; gap:12px; justify-content:center; margin-top:34px}
.lp .no{border:2px solid rgba(255,255,255,.28); border-radius:8px; padding:10px 16px; font-weight:800; font-size:15px; color:#fff}
.lp .no b{color:var(--terra); font-family:var(--font-display); margin-right:6px}
.lp .nots p.kept{margin-top:30px; color:rgba(255,255,255,.8); font-weight:600; font-size:18px}

.lp .final{text-align:center}
.lp .final .ctacard{background:linear-gradient(135deg,var(--dusk),var(--terra)); border:2px solid var(--ink); border-radius:20px; box-shadow:var(--shadow); padding:64px 30px; color:#fff; position:relative; overflow:hidden}
.lp .final h2{color:#fff; font-size:clamp(30px,5vw,52px); text-shadow:3px 3px 0 rgba(0,0,0,.32)}
.lp .final p{font-weight:600; margin-top:14px; font-size:18px; color:rgba(255,255,255,.92)}
.lp .final .btn{margin-top:30px}
.lp .final .fine{margin-top:16px; font-size:13px; color:rgba(255,255,255,.8)}

.lp .foot{text-align:center; padding:50px 22px 70px; color:var(--muted); font-weight:600; font-size:14px}
.lp .foot .wm{font-family:var(--font-display); font-size:22px; color:var(--ink)}
.lp .foot .wm b{color:var(--terra)}

.lp .reveal{opacity:1; transform:none}
.lp.js-motion .reveal{opacity:0; transform:translateY(22px); transition:opacity .6s ease, transform .6s ease}
.lp.js-motion .reveal.in{opacity:1; transform:none}

/* ---- retro device screens around app demos ---- */
.lp .screen{background:var(--night); border:3px solid var(--ink); border-radius:14px; padding:9px; box-shadow:var(--shadow); position:relative; overflow:hidden}
.lp .screen-bar{display:flex; align-items:center; gap:6px; padding:2px 5px 8px}
.lp .screen-bar .led{width:8px; height:8px; border-radius:50%; background:#5b5e6b; flex:0 0 auto}
.lp .screen-bar .led:nth-child(1){background:var(--terra)}
.lp .screen-bar .led:nth-child(2){background:var(--gold)}
.lp .screen-bar .led:nth-child(3){background:var(--success); animation:lpled 1.4s steps(2) infinite}
.lp .screen-bar em{margin-left:auto; font-family:var(--font-display); font-style:normal; font-size:10px; letter-spacing:1px; color:rgba(255,255,255,.5); text-transform:uppercase}
.lp .screen-body{position:relative; border-radius:9px; overflow:hidden}
.lp .screen .vizframe,.lp .screen .plan{box-shadow:none}
.lp .screen::after{content:""; position:absolute; left:0; right:0; top:0; height:42%; pointer-events:none; z-index:6;
  background:linear-gradient(rgba(255,255,255,.07), transparent); animation:lpsweep 4.6s linear infinite}
@keyframes lpsweep{0%{transform:translateY(-110%)} 100%{transform:translateY(300%)}}
@keyframes lpled{50%{opacity:.2}}

@media(max-width:860px){
  .lp .cards{grid-template-columns:1fr 1fr}
  .lp section.band{padding:72px 0}
}
@media(max-width:780px){ .lp .probs{grid-template-columns:1fr} }
@media(prefers-reduced-motion:reduce){
  .lp.js-motion .reveal{opacity:1; transform:none; transition:none}
  .lp .vague .cursor, .lp .star, .lp .pressstart, .lp .screen::after, .lp .screen-bar .led:nth-child(3){animation:none}
}
`;

export default function Home() {
  const rootRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLImageElement>(null);

  const blip = () => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const a = new AC();
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(620, a.currentTime);
      o.frequency.setValueAtTime(880, a.currentTime + 0.05);
      g.gain.setValueAtTime(0.05, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.13);
      o.connect(g);
      g.connect(a.destination);
      o.start();
      o.stop(a.currentTime + 0.14);
    } catch {
      /* audio unavailable — no-op */
    }
  };

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const root = rootRef.current;
    if (!root) return;
    root.classList.add("js-motion");

    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    root.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <main className="lp" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* HERO */}
      <header className="hero">
        <div className="screen hero-monitor">
          <div className="screen-bar"><i className="led" /><i className="led" /><i className="led" /><em>AIventure · title screen</em></div>
          <div className="hero-screen">
            <img className="hero-img" ref={heroRef} src="/img/hero-cliff-3.png" alt="" />
            <div className="hero-copy">
              <span className="eyebrow">◇ The anti-social-media app</span>
              <h1>Less scrolling.<br />More <b>living</b>.</h1>
              <p className="sub">AIventure turns “we should hang out” into a real plan — and your crew out the door. Then it remembers it for you.</p>
              <div className="cta">
                <Link className="btn btn-gold" href="/tour" onPointerDown={blip}>Start an adventure</Link>
              </div>
              <div className="pressstart">▶ Press start</div>
              <p className="trust">Free to join any plan · No download · No feed</p>
            </div>
          </div>
        </div>
      </header>

      {/* THREE PROBLEMS */}
      <section className="band">
        <div className="wrap" style={{ textAlign: "center" }}>
          <div className="kicker reveal">The problem</div>
          <h2 className="big reveal">Three reasons nothing ever happens.</h2>
          <div className="probs reveal">
            <div className="prob">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
              <h3>It dies in the chat</h3>
              <p>“We should hang out” rots in the group chat. And if it survives, it’s 40 messages of “who’s in?” and “what time again?” — nobody actually running it.</p>
            </div>
            <div className="prob">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg></div>
              <h3>The scroll ate the plan</h3>
              <p>“Social” media quietly swapped living for watching — hours a day on everyone else’s life instead of going and having your own.</p>
            </div>
            <div className="prob">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg></div>
              <h3>You’re out of ideas</h3>
              <p>The same three spots on repeat — or no clue what to do at all. With the crew, or just you on a quiet Sunday.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="reframe reveal">
        <div className="glow" />
        <div className="wrap">
          <h2>So we built AIventure.</h2>
          <p>Tell it roughly what you’re after. It comes back with real, grounded things to do — often somewhere you’d never have found on your own. Share one link and your crew’s in. Works for six people or just you; a Tuesday coffee or a two-week trip. Then it keeps the memory. <strong>No feed. No performing. No admin.</strong></p>
        </div>
      </section>

      {/* FIVE WINS */}
      <section className="band">
        <div className="wrap" style={{ textAlign: "center" }}>
          <div className="kicker reveal">What you get</div>
          <h2 className="big reveal">The whole adventure, handled.</h2>
          <div className="feats">

            <div className="feat reveal">
              <div className="feat-tx">
                <div className="fnum">01</div>
                <h3>A real plan from a vague idea</h3>
                <p>Describe the vibe. AIventure comes back with grounded, bookable things to do — the time, the place and the logistics already sorted.</p>
              </div>
              <div className="feat-viz">
                <div className="screen"><div className="screen-bar"><i className="led" /><i className="led" /><i className="led" /><em>Plan</em></div><div className="screen-body">
                <div>
                  <div className="vague"><span className="tag">you type</span>something with the boys Saturday, hike then a pint<span className="cursor" /></div>
                  <div className="plan">
                    <div className="cover"><img src="/img/cover-hike.png" alt="" /><b>Something with the boys, Saturday</b></div>
                    <div className="body">
                      <div className="meta"><span>◷ Sat 6 Jun · 4pm</span><span>◎ Hampstead Heath</span></div>
                      <div className="opts">
                        <div className="opt"><div className="top"><div><h4>Sunset hike on the Heath</h4><small>Parliament Hill · easy 4km</small></div><span className="keen on"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.35-9.5-8.5C.5 9 2 5.5 5.5 5.5c2 0 3.2 1.2 3.7 2 .6-.8 1.7-2 3.8-2C16.5 5.5 18 9 16 12.5 13.5 16.65 12 21 12 21z" /></svg>Keen 3</span></div></div>
                        <div className="opt"><div className="top"><div><h4>The Southampton Arms</h4><small>Cask ale pub · ~£6/pint</small></div><span className="keen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 21s-7-4.35-9.5-8.5C.5 9 2 5.5 5.5 5.5c2 0 3.2 1.2 3.7 2 .6-.8 1.7-2 3.8-2C16.5 5.5 18 9 16 12.5 13.5 16.65 12 21 12 21z" /></svg>Keen 2</span></div></div>
                      </div>
                      <div className="who"><div className="stack"><img src="/img/avatars/a1.png" alt="" /><img src="/img/avatars/a2.png" alt="" /><img src="/img/avatars/a3.png" alt="" /></div>Josh, Conor + 3 in</div>
                    </div>
                  </div>
                </div>
                </div></div>
              </div>
            </div>

            <div className="feat flip reveal">
              <div className="feat-tx">
                <div className="fnum">02</div>
                <h3>The whole crew, zero admin</h3>
                <p>One link to invite, votes to decide, and availability that finds the day everyone’s actually free. No 200-message thread, no chasing.</p>
              </div>
              <div className="feat-viz">
                <div className="screen"><div className="screen-bar"><i className="led" /><i className="led" /><i className="led" /><em>Crew</em></div><div className="screen-body">
                <div className="vizframe vf-blue">
                  <div className="vh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>Who’s coming</div>
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="stack"><img src="/img/avatars/a1.png" alt="" /><img src="/img/avatars/a2.png" alt="" /><img src="/img/avatars/a3.png" alt="" /><img src="/img/avatars/a4.png" alt="" /><img src="/img/avatars/a5.png" alt="" /></div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--muted)" }}>5 in · 1 maybe</span>
                  </div>
                  <div className="vh" style={{ marginTop: 18 }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>Best day to go</div>
                  <div className="datevote">
                    <div className="dv best"><span>Sat 6 Jun</span><span className="bt-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M5 12l5 5 9-11" /></svg>Best · 5 free</span></div>
                    <div className="dv"><span>Sun 7 Jun</span><span className="free">3 free</span></div>
                    <div className="dv"><span>Fri 12 Jun</span><span className="free">2 free</span></div>
                  </div>
                </div>
                </div></div>
              </div>
            </div>

            <div className="feat reveal">
              <div className="feat-tx">
                <div className="fnum">03</div>
                <h3>Any size, any distance</h3>
                <p>A solo coffee, a six-person day out, a two-week trip abroad. One engine builds the itinerary — from the tiny to the epic.</p>
              </div>
              <div className="feat-viz">
                <div className="screen"><div className="screen-bar"><i className="led" /><i className="led" /><i className="led" /><em>Route</em></div><div className="screen-body">
                <div className="vizframe vf-green">
                  <div className="vh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3" /><circle cx="18" cy="5" r="3" /><path d="M9 19h6a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6" /></svg>A day out · 3 stops</div>
                  <div className="itin">
                    <div className="row"><span className="num">1</span><img src="/img/cover-coffee.png" alt="" /><div className="t"><b>Coffee &amp; pastries</b><small>10am · Climpson &amp; Sons</small></div></div>
                    <div className="row"><span className="num">2</span><img src="/img/cover-hike.png" alt="" /><div className="t"><b>Canal walk to the marsh</b><small>11:30am · 5km</small></div></div>
                    <div className="row"><span className="num">3</span><img src="/img/cover-pub.png" alt="" /><div className="t"><b>Late lunch &amp; a pint</b><small>1pm · The Anchor</small></div></div>
                  </div>
                </div>
                </div></div>
              </div>
            </div>

            <div className="feat flip reveal">
              <div className="feat-tx">
                <div className="fnum">04</div>
                <h3>Ideas beyond your bubble</h3>
                <p>Real spots near you — or anywhere on earth — you’d never have found yourself. So you stop doing the same three things.</p>
              </div>
              <div className="feat-viz">
                <div className="screen"><div className="screen-bar"><i className="led" /><i className="led" /><i className="led" /><em>Explore</em></div><div className="screen-body">
                <div className="vizframe vf-yellow">
                  <div className="vh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20" /></svg>Near you · for your interests</div>
                  <div className="disc">
                    <div className="d"><img src="/img/cover-climb.png" alt="" /><div><b>Bouldering meetup</b><small>2.3km · Thu 7pm · 4 going</small></div></div>
                    <div className="d"><img src="/img/cover-market.png" alt="" /><div><b>Sunday market wander</b><small>1.1km · this weekend</small></div></div>
                    <div className="d"><img src="/img/cover-gig.png" alt="" /><div><b>Open-air gig in the park</b><small>4km · Sat · 12 going</small></div></div>
                  </div>
                </div>
                </div></div>
              </div>
            </div>

            <div className="feat reveal">
              <div className="feat-tx">
                <div className="fnum">05</div>
                <h3>A life you can look back on</h3>
                <p>Every plan you finish becomes a private record — a log of the things you actually did, not a feed of things you watched.</p>
              </div>
              <div className="feat-viz">
                <div className="screen"><div className="screen-bar"><i className="led" /><i className="led" /><i className="led" /><em>Log</em></div><div className="screen-body">
                <div className="vizframe vf-red">
                  <div className="vh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6" /><path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" /></svg>Your adventure log</div>
                  <div className="loggrid">
                    <div className="minicard"><img src="/img/cover-hike.png" alt="" /><b>Heath hike</b></div>
                    <div className="minicard"><img src="/img/cover-climb.png" alt="" /><b>Bouldering</b></div>
                    <div className="minicard"><img src="/img/cover-roast.png" alt="" /><b>Sunday roast</b></div>
                    <div className="minicard"><img src="/img/cover-beach.png" alt="" /><b>Coast day</b></div>
                  </div>
                </div>
                </div></div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* PAYOFF */}
      <section className="band" style={{ paddingTop: 0 }}>
        <div className="wrap" style={{ textAlign: "center" }}>
          <div className="kicker reveal">The payoff</div>
          <h2 className="big reveal">A year of this beats a year of scrolling.</h2>
          <p className="lede reveal narrow" style={{ marginLeft: "auto", marginRight: "auto" }}>Every plan you finish becomes an Adventure card. Stack them up and you’ve a real record of a life lived outside — not a history of things you watched other people do.</p>
          <div className="cards">
            <div className="acard reveal"><img src="/img/cover-hike.png" alt="" /><b>Sunset hike, Hampstead Heath</b><small>Jun · 5 of you</small></div>
            <div className="acard reveal"><img src="/img/cover-climb.png" alt="" /><b>Bouldering at The Castle</b><small>May · 2 of you</small></div>
            <div className="acard reveal"><img src="/img/cover-roast.png" alt="" /><b>Sunday roast, Richmond</b><small>May · 6 of you</small></div>
            <div className="acard reveal"><img src="/img/cover-camp.png" alt="" /><b>Camping weekend away</b><small>Apr · 4 of you</small></div>
          </div>
        </div>
      </section>

      {/* WHAT IT ISN'T */}
      <section className="nots reveal">
        <div className="wrap">
          <h2>What it isn’t.</h2>
          <div className="nogrid">
            <span className="no"><b>No</b>infinite feed</span>
            <span className="no"><b>No</b>followers or likes</span>
            <span className="no"><b>No</b>200-message threads</span>
            <span className="no"><b>No</b>ads</span>
            <span className="no"><b>No</b>stranger-stalking</span>
            <span className="no"><b>No</b>download to join</span>
            <span className="no"><b>No</b>pressure to perform</span>
          </div>
          <p className="kept">Just plans, your crew, and the things you actually did.</p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="band final">
        <div className="wrap narrow">
          <div className="ctacard reveal">
            <h2>“We should hang out more.”</h2>
            <p>Stop saying it. Just go.</p>
            <Link className="btn btn-gold" href="/tour" onPointerDown={blip}>Start an adventure</Link>
            <p className="fine">Free to join any plan. Plus unlocks AI planning for your whole crew.</p>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wm">AI<b>venture</b></div>
        <p>The anti-social-media app · Stop scrolling, start adventuring.</p>
      </footer>
    </main>
  );
}

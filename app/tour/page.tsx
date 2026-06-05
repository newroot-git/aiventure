/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

type Panel = {
  kind: "cover" | "shot" | "outro";
  step?: string;
  kicker?: string;
  title: string;
  body?: string;
  img?: string;
  alt?: string;
};

const PANELS: Panel[] = [
  {
    kind: "cover",
    kicker: "A 60-second tour",
    title: "Here's how it works.",
    body: "Get out of the group chat. Swipe through, then jump in.",
  },
  {
    kind: "shot",
    kicker: "The idea",
    title: "Less scrolling. More living.",
    body: "No feed, no followers. AIventure gets you and your crew out the door — then remembers it for you.",
    img: "/tour/01-landing.png",
    alt: "AIventure landing screen",
  },
  {
    kind: "shot",
    step: "Step 1",
    kicker: "Pick the scale",
    title: "A coffee, or a trip.",
    body: "A surprise, one activity, a full day back-to-back, or days away. One engine, any size.",
    img: "/tour/03-new-scope.png",
    alt: "Choose the scale of your plan",
  },
  {
    kind: "shot",
    step: "Step 2",
    kicker: "Describe it",
    title: "Just say it plainly.",
    body: "Type it like you'd text a mate — “a hike then a pint Saturday.” Drop a place with real autocomplete, anywhere on earth.",
    img: "/tour/04-new-form.png",
    alt: "Describe your plan in plain words",
  },
  {
    kind: "shot",
    step: "Step 3",
    kicker: "AI does the legwork",
    title: "It grounds every idea.",
    body: "The agent comes back with real, bookable places — never made-up venues. The time, the spot and the logistics, sorted.",
    img: "/tour/05-ai-building.png",
    alt: "AI building your grounded plan",
  },
  {
    kind: "shot",
    step: "Step 4",
    kicker: "A real plan appears",
    title: "Real spots. Crew votes.",
    body: "Each step gets real options with Maps links to prove they're real. The crew votes; the top pick wins.",
    img: "/tour/06-plan-top.png",
    alt: "A grounded plan with real venue options",
  },
  {
    kind: "shot",
    step: "Step 5",
    kicker: "Lock it in",
    title: "Pick a day. Done.",
    body: "Set the date, see the route mapped, add it to everyone's calendar in one tap. No 200-message thread, no chasing.",
    img: "/tour/07-plan-locked-top.png",
    alt: "Locked-in plan with date and map",
  },
  {
    kind: "shot",
    step: "Step 6",
    kicker: "Counting down",
    title: "Your next one, up top.",
    body: "The next adventure sits front and centre with a live countdown — not buried under a feed.",
    img: "/tour/09-home.png",
    alt: "Home screen with a countdown to the next adventure",
  },
  {
    kind: "shot",
    kicker: "It just shows up",
    title: "Every plan, on its day.",
    body: "Locked plans land straight on the calendar and in your real calendar app. The admin handles itself.",
    img: "/tour/11-calendar.png",
    alt: "Calendar showing the plan on its day",
  },
  {
    kind: "shot",
    step: "Step 7",
    kicker: "The payoff",
    title: "A life, logged.",
    body: "Finish it and it becomes an Adventure card you keep. A record of things you did — not a feed of things you watched.",
    img: "/tour/08-adventure-card.png",
    alt: "A completed Adventure card",
  },
  {
    kind: "outro",
    kicker: "That's the tour",
    title: "Just go.",
    body: "Stop saying “we should hang out more.” Build your first plan in under a minute.",
  },
];

const CSS = `
.tour{
  --cream:#EAE1CF; --surface:#F5EFE1; --ink:#1E1B16; --muted:#7B6E5C;
  --red:#CE3B2A; --gold:#EBA92C; --line:#D8C9AE;
  position:fixed; inset:0; z-index:50; color:var(--ink);
  font-family:var(--font-heading), system-ui, sans-serif;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(235,169,44,.16), transparent 55%),
    linear-gradient(180deg,#ece2cd,#e7ddc7);
  overflow:hidden;
}
.tour *{box-sizing:border-box}
.tour::before{content:""; position:absolute; inset:0; pointer-events:none; opacity:.22;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.05'/%3E%3C/svg%3E");}
.tour h2,.tour .wm{font-family:var(--font-display), ui-monospace, monospace; line-height:1.04; letter-spacing:.3px; margin:0}

.tour .deck{
  display:flex; height:100%; width:100%;
  overflow-x:auto; overflow-y:hidden;
  scroll-snap-type:x mandatory; scroll-behavior:smooth;
  scrollbar-width:none;
}
.tour .deck::-webkit-scrollbar{display:none}

.tour .panel{
  flex:0 0 100%; width:100%; height:100%;
  scroll-snap-align:center; scroll-snap-stop:always;
  display:flex; flex-direction:column; align-items:center;
  text-align:center;
  padding:64px 22px 104px;
  gap:16px;
}
@media (min-width:900px){
  .tour .panel{flex-direction:row; text-align:left; gap:64px; padding:40px 72px 96px; justify-content:center;}
}

.tour .cap{display:flex; flex-direction:column; gap:12px; max-width:440px; align-items:center;}
@media (min-width:900px){ .tour .cap{align-items:flex-start; max-width:360px;} }

.tour .kicker{
  display:inline-flex; align-items:center; gap:7px;
  font-family:var(--font-display), monospace; font-weight:600; font-size:12px;
  letter-spacing:.04em; text-transform:uppercase; color:var(--ink);
  background:var(--gold); border:2px solid var(--ink); border-radius:999px;
  padding:5px 12px; box-shadow:3px 3px 0 var(--ink);
}
.tour .kicker .step{color:var(--red)}
.tour h2{font-size:clamp(28px,7vw,46px)}
@media (min-width:900px){ .tour h2{font-size:clamp(34px,4vw,50px)} }
.tour .cap p{font-size:15px; line-height:1.55; color:var(--muted); max-width:36ch; margin:0}

/* device frame */
.tour .phone{
  flex:0 0 auto; position:relative;
  background:var(--ink); border:2px solid var(--ink); border-radius:34px; padding:8px;
  box-shadow:8px 8px 0 rgba(30,27,22,.18);
  height:min(52dvh, 480px); aspect-ratio:402 / 874;
}
@media (min-width:900px){ .tour .phone{height:min(76dvh, 720px);} }
.tour .phone::before{content:""; position:absolute; top:12px; left:50%; transform:translateX(-50%);
  width:32%; height:6px; background:#000; border-radius:999px; opacity:.5; z-index:2;}
.tour .phone img{width:100%; height:100%; object-fit:cover; object-position:top center; border-radius:27px; display:block; background:var(--surface);}

/* cover/outro */
.tour .wm{font-size:clamp(40px,11vw,84px); color:var(--ink)}
.tour .wm b{color:var(--red)}
.tour .lede{font-family:var(--font-display), monospace; font-weight:600; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink)}
.tour .sub{font-size:17px; color:var(--muted); max-width:30ch; line-height:1.5; margin:0}
.tour .swipehint{font-family:var(--font-display), monospace; font-size:14px; color:var(--muted); letter-spacing:.06em; animation:tnudge 1.6s ease-in-out infinite}
@keyframes tnudge{0%,100%{transform:translateX(0)}50%{transform:translateX(8px)}}

.tour .cta{
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  font-family:var(--font-display), monospace; font-weight:600; font-size:18px; text-decoration:none;
  color:#fff; background:var(--red); border:2px solid var(--ink); border-radius:14px;
  padding:14px 26px; box-shadow:4px 4px 0 var(--ink); cursor:pointer;
  transition:transform .06s, box-shadow .06s;
}
.tour .cta:active{transform:translate(4px,4px); box-shadow:0 0 0 var(--ink)}

/* chrome */
.tour .skip{position:absolute; top:16px; right:16px; z-index:60;
  font-family:var(--font-display), monospace; font-size:14px; color:var(--ink); text-decoration:none;
  background:var(--surface); border:2px solid var(--ink); border-radius:999px; padding:5px 14px; box-shadow:3px 3px 0 var(--ink);}
.tour .skip:active{transform:translate(3px,3px); box-shadow:0 0 0 var(--ink)}

.tour .dots{position:absolute; left:50%; bottom:20px; transform:translateX(-50%); z-index:60;
  display:flex; gap:7px; background:rgba(245,239,225,.82); border:2px solid var(--ink); border-radius:999px;
  padding:8px 12px; box-shadow:3px 3px 0 var(--ink); backdrop-filter:blur(4px);}
.tour .dot{width:8px; height:8px; border-radius:999px; background:var(--line); border:1.5px solid var(--ink); padding:0; cursor:pointer; transition:width .15s, background .15s;}
.tour .dot.on{background:var(--red); width:20px;}

.tour .nav{position:absolute; top:50%; transform:translateY(-50%); z-index:60; display:none;
  width:46px; height:46px; border-radius:999px; cursor:pointer;
  background:var(--surface); border:2px solid var(--ink); color:var(--ink);
  font-family:var(--font-display), monospace; font-size:20px; align-items:center; justify-content:center;
  box-shadow:3px 3px 0 var(--ink);}
.tour .nav:active{transform:translateY(-50%) translate(3px,3px); box-shadow:0 0 0 var(--ink)}
.tour .nav[disabled]{opacity:.3; pointer-events:none}
.tour .nav.prev{left:18px} .tour .nav.next{right:18px}
@media (min-width:900px){ .tour .nav{display:flex} }
`;

export default function Tour() {
  const deckRef = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const n = PANELS.length;

  const go = useCallback((idx: number) => {
    const deck = deckRef.current;
    if (!deck) return;
    const clamped = Math.max(0, Math.min(n - 1, idx));
    deck.scrollTo({ left: clamped * deck.clientWidth, behavior: "smooth" });
  }, [n]);

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    let raf = 0;
    const sync = () => {
      const idx = Math.round(deck.scrollLeft / deck.clientWidth);
      setI((prev) => (prev === idx ? prev : idx));
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); };
    deck.addEventListener("scroll", onScroll, { passive: true });
    return () => { deck.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go]);

  return (
    <div className="tour">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <Link className="skip" href="/signin">Skip</Link>

      <div className="deck" ref={deckRef}>
        {PANELS.map((p, idx) => (
          <section className="panel" key={idx}>
            {p.kind === "cover" ? (
              <div className="cap" style={{ alignItems: "center", textAlign: "center", margin: "auto" }}>
                <div className="lede">{p.kicker}</div>
                <h2 className="wm">Here's how<br />it works.</h2>
                <p className="sub">{p.body}</p>
                <div className="swipehint">swipe / scroll &rarr;</div>
              </div>
            ) : p.kind === "outro" ? (
              <div className="cap" style={{ alignItems: "center", textAlign: "center", margin: "auto" }}>
                <div className="lede">{p.kicker}</div>
                <h2 className="wm">{p.title}</h2>
                <p className="sub">{p.body}</p>
                <Link className="cta" href="/signin">Get started</Link>
              </div>
            ) : (
              <>
                <div className="cap">
                  <span className="kicker">
                    {p.step && <span className="step">{p.step}&nbsp;&middot;&nbsp;</span>}
                    {p.kicker}
                  </span>
                  <h2>{p.title}</h2>
                  <p>{p.body}</p>
                </div>
                <div className="phone">
                  <img src={p.img} alt={p.alt} />
                </div>
              </>
            )}
          </section>
        ))}
      </div>

      <button className="nav prev" aria-label="Previous" disabled={i === 0} onClick={() => go(i - 1)}>&#8249;</button>
      <button className="nav next" aria-label="Next" disabled={i === n - 1} onClick={() => go(i + 1)}>&#8250;</button>

      <div className="dots">
        {PANELS.map((_, idx) => (
          <button
            key={idx}
            className={"dot" + (idx === i ? " on" : "")}
            aria-label={"Go to slide " + (idx + 1)}
            onClick={() => go(idx)}
          />
        ))}
      </div>
    </div>
  );
}

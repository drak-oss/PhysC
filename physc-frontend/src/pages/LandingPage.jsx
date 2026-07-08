import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhysCLogo } from '../components/PhysCLogo';
import PhysicsCanvas from '../landing/PhysicsCanvas';
import GradientText from '../landing/GradientText';
import SectionLabel from '../landing/SectionLabel';
import FeatureCard from '../landing/FeatureCard';
import StepCard from '../landing/StepCard';
import TechCard from '../landing/TechCard';
import XPBDDiagram from '../landing/XPBDDiagram';
import { FEATURES, HOW_IT_WORKS, TECH_STACK, sectionHeadingStyle, sectionSubStyle } from '../landing/data.jsx';

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  const heroRef     = useRef(null);
  const featuresRef = useRef(null);
  const howRef      = useRef(null);
  const techRef     = useRef(null);
  const aboutRef    = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = prev || 'hidden'; };
  }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const NAV_LINKS = [
    { label: 'Features',     ref: featuresRef },
    { label: 'How It Works', ref: howRef },
    { label: 'Technology',   ref: techRef },
    { label: 'About',        ref: aboutRef },
  ];

  return (
    <div style={{ background: 'var(--bg-void)', color: 'var(--text-primary)', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px',
        background: scrolled ? 'rgba(10,10,15,0.92)' : 'rgba(10,10,15,0.5)',
        backdropFilter: 'blur(20px)',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <button onClick={() => scrollTo(heroRef)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: 0 }}>
          <PhysCLogo />
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>PhysC</span>
        </button>

        <div style={{ display: 'flex', gap: 6 }}>
          {NAV_LINKS.map(({ label, ref }) => (
            <button key={label} onClick={() => scrollTo(ref)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, padding: '6px 14px', borderRadius: 6, transition: 'all 0.15s ease' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'none'; }}
            >{label}</button>
          ))}
        </div>

        <button onClick={() => navigate('/builder')}
          style={{ background: 'linear-gradient(135deg, #7c6fef, #9d8ef5)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 12px rgba(124,111,239,0.4)', transition: 'all 0.2s ease' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,111,239,0.55)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(124,111,239,0.4)'; }}
        >
          Start Creating
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>
      </nav>

      <section ref={heroRef} style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px 40px 60px' }}>
        <PhysicsCanvas />
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 500, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,111,239,0.13) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,111,239,0.12)', border: '1px solid rgba(124,111,239,0.3)', borderRadius: 100, padding: '5px 16px', marginBottom: 32, fontSize: 11, fontWeight: 600, color: '#a78bfa', letterSpacing: '0.8px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c6fef', boxShadow: '0 0 6px #7c6fef' }} />
          BROWSER-NATIVE 2D PHYSICS ENGINE
        </div>

        <h1 style={{ margin: '0 0 20px', fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-2px', maxWidth: 820 }}>
          <span style={{ background: 'linear-gradient(135deg, #e8e8f4 0%, #a78bfa 50%, #60a5fa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Build Machines<br />Simulate Physics
          </span>
        </h1>

        <p style={{ margin: '0 0 48px', maxWidth: 560, fontSize: 17, lineHeight: 1.65, color: 'var(--text-secondary)', fontWeight: 400 }}>
          A real-time constraint solver powered by{' '}
          <span style={{ color: '#a78bfa', fontWeight: 600 }}>XPBD</span> and{' '}
          <span style={{ color: '#60a5fa', fontWeight: 600 }}>WebAssembly</span>.
          Design rigid-body mechanisms in the browser — from pendulums to pulley systems — with no downloads required.
        </p>

        <button onClick={() => navigate('/builder')}
          style={{ background: 'linear-gradient(135deg, #7c6fef 0%, #9d8ef5 100%)', border: 'none', borderRadius: 12, cursor: 'pointer', color: '#fff', fontSize: 17, fontWeight: 700, padding: '16px 40px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 24px rgba(124,111,239,0.45), 0 0 0 1px rgba(167,139,250,0.2)', transition: 'all 0.25s ease', letterSpacing: '-0.3px' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'; e.currentTarget.style.boxShadow = '0 8px 36px rgba(124,111,239,0.6), 0 0 0 1px rgba(167,139,250,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 24px rgba(124,111,239,0.45), 0 0 0 1px rgba(167,139,250,0.2)'; }}
        >
          Start Creating
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>
      </section>

      <section ref={featuresRef} style={{ padding: '100px 40px', maxWidth: 1160, margin: '0 auto' }}>
        <SectionLabel label="Features" />
        <h2 style={sectionHeadingStyle}>Everything You Need To <GradientText>Simulate Anything</GradientText></h2>
        <p style={sectionSubStyle}>Six constraint types. A real C++ solver. A visual builder. And a 60 FPS canvas that stays smooth even with dozens of interacting bodies.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, marginTop: 56 }}>
          {FEATURES.map((f) => <FeatureCard key={f.title} {...f} />)}
        </div>
      </section>

      <section ref={howRef} style={{ padding: '100px 40px', background: 'rgba(20,20,32,0.6)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <SectionLabel label="How It Works" />
          <h2 style={sectionHeadingStyle}>From A Blank Canvas To <GradientText>Simulating Machines</GradientText></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 24, marginTop: 56 }}>
            {HOW_IT_WORKS.map((step, i) => <StepCard key={step.step} {...step} isLast={i === HOW_IT_WORKS.length - 1} />)}
          </div>
        </div>
      </section>

      <section ref={techRef} style={{ padding: '100px 40px', maxWidth: 1160, margin: '0 auto' }}>
        <SectionLabel label="Technology" />
        <h2 style={sectionHeadingStyle}>Built On A <GradientText>Real Physics Engine</GradientText></h2>
        <p style={sectionSubStyle}>A proper C++ constraint solver compiled to WebAssembly, surrounded by a React IDE built for inspecting and iterating on simulations.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginTop: 56 }}>
          {TECH_STACK.map((t) => <TechCard key={t.label} {...t} />)}
        </div>

        <div style={{ marginTop: 48, padding: '40px 48px', background: 'rgba(124,111,239,0.05)', border: '1px solid rgba(124,111,239,0.18)', borderRadius: 16, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 48 }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,111,239,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 700, color: '#a78bfa' }}>Why XPBD?</h3>
            <p style={{ margin: '0 0 14px', color: 'var(--text-secondary)', lineHeight: 1.75, fontSize: 14 }}>
              Traditional impulse-based solvers work in velocity space — they push bodies apart by changing how fast they move. XPBD (Extended Position Based Dynamics, Müller et al. 2020) works directly in position space, correcting where bodies <em>are</em> rather than how fast they're going.
            </p>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.75, fontSize: 14 }}>
              The practical benefit: stiff ropes, rigid welds, and soft springs all live in the same solver with no special cases. Stiffness is controlled by a single <span style={{ color: '#a78bfa', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>compliance</span> number — zero for rigid, larger for springy. Energy stays bounded at any timestep, so the simulation never explodes.
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <XPBDDiagram />
          </div>
        </div>
      </section>

      <section ref={aboutRef} style={{ padding: '100px 40px 120px', background: 'linear-gradient(180deg, rgba(20,20,32,0.0) 0%, rgba(20,20,32,0.7) 100%)', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <SectionLabel label="About" />
          <h2 style={sectionHeadingStyle}>A Playground For <GradientText>Understanding Physics</GradientText></h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 36 }}>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 15, margin: 0 }}>
              Whether you're studying rigid-body dynamics, building a demo, or just curious how a block-and-tackle pulley system actually works, PhysC lets you construct it, simulate it, and inspect every body and constraint in real time — all in the browser, no downloads required.
            </p>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 15, margin: '24px 0 40px', maxWidth: 720 }}>
            The project is continuously growing. Current constraint types cover the most common mechanical primitives. Future work includes soft bodies, breakable joints, and a scripting API for programmatic machine construction.
          </p>
          <button onClick={() => navigate('/builder')}
            style={{ background: 'linear-gradient(135deg, #7c6fef 0%, #9d8ef5 100%)', border: 'none', borderRadius: 12, cursor: 'pointer', color: '#fff', fontSize: 16, fontWeight: 700, padding: '15px 38px', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 24px rgba(124,111,239,0.45)', transition: 'all 0.25s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 36px rgba(124,111,239,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 24px rgba(124,111,239,0.45)'; }}
          >
            Start Creating
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/>
            </svg>
          </button>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-panel)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PhysCLogo />
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>PhysC Engine</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {NAV_LINKS.map(({ label, ref }) => (
            <button key={label} onClick={() => scrollTo(ref)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, fontWeight: 500, padding: 0, transition: 'color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >{label}</button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>Built with C++ · WASM · React</span>
      </footer>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

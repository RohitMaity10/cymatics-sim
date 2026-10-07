# 🔊 Cymatics // Chladni Resonance & Acoustic Geometry Lab

An interactive mathematical physics simulation modeling 2D acoustic standing wave nodal patterns (Chladni plates) across 26,000 real-time sand particles with synchronous Web Audio tone synthesis, built in Vanilla JavaScript and HTML5 Canvas.

## 🌐 Live Demo
Form acoustic mandalas: [https://rohitmaity10.github.io/cymatics-sim/](https://rohitmaity10.github.io/cymatics-sim/)

## Technical Highlights
- **2D Harmonic Wave Solutions:** Solves the Chladni plate equation $w(x, y) = a \sin(n \pi x / L) \sin(m \pi y / L) - b \sin(m \pi x / L) \sin(n \pi y / L)$ across variable modal indices $(m, n)$.
- **Gradient-Driven Particle Dynamics:** 26,000 grains continuously compute spatial displacement gradients, migrating away from violent anti-nodes and settling along quiet nodal lines.
- **Web Audio Oscillator Coupling:** Live frequency sweep synchronized with pure sine tone generation matching the physical vibration rate.
- **Interactive Mechanical Damping:** Touch or click the vibrating surface to simulate finger boundary clamping, forcing sand into modified acoustic geometries.